const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

/**
 * Analyze interview response using AI
 * @param {string} question - The interview question
 * @param {string} answer - Candidate's answer
 * @param {string} questionType - Type of question
 * @param {Array} expectedPoints - Expected answer points (optional)
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeResponse(question, answer, questionType, expectedPoints = []) {
    try {
        const prompt = `Analyze this interview response and provide detailed feedback.

Question: ${question}
Question Type: ${questionType}
${expectedPoints.length > 0 ? `Expected Points: ${expectedPoints.join(', ')}` : ''}

Candidate's Answer: ${answer}

Provide a JSON response with:
1. score: 0-100 rating
2. strengths: Array of positive aspects
3. weaknesses: Array of areas for improvement
4. keyPoints: Main points covered by the candidate
5. sentiment: overall sentiment (positive/neutral/negative)
6. confidence: 0-1 confidence in the analysis
7. feedback: Constructive feedback for the candidate

Return only valid JSON.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert interview assessor. Provide fair, constructive analysis of candidate responses."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 800
        });

        const analysis = JSON.parse(response.choices[0].message.content);
        return analysis;
    } catch (error) {
        console.error('Error analyzing response:', error);
        // Fallback basic analysis
        return {
            score: 70,
            strengths: ['Provided a response'],
            weaknesses: ['Could not perform detailed analysis'],
            keyPoints: [],
            sentiment: 'neutral',
            confidence: 0.3,
            feedback: 'Response recorded'
        };
    }
}

/**
 * Generate overall interview assessment
 * @param {Array} questions - All interview questions with answers
 * @returns {Promise<Object>} - Overall assessment
 */
async function generateOverallAssessment(questions) {
    try {
        const answeredQuestions = questions.filter(q => q.answer);

        if (answeredQuestions.length === 0) {
            return {
                technicalScore: 0,
                communicationScore: 0,
                problemSolvingScore: 0,
                cultureFitScore: 0,
                strengths: [],
                concerns: ['No questions answered'],
                keyInsights: [],
                recommendation: 'no',
                confidence: 0
            };
        }

        const qaText = answeredQuestions.map((q, i) =>
            `Q${i + 1}: ${q.questionText}\nA${i + 1}: ${q.answer}\nScore: ${q.aiScore || 'N/A'}`
        ).join('\n\n');

        const prompt = `Based on this complete interview, provide an overall assessment.

${qaText}

Provide a JSON response with:
1. technicalScore: 0-100
2. communicationScore: 0-100
3. problemSolvingScore: 0-100
4. cultureFitScore: 0-100
5. strengths: Top 3-5 strengths demonstrated
6. concerns: Any concerns or red flags
7. keyInsights: Important observations
8. recommendation: one of [strong_yes, yes, maybe, no, strong_no]
9. confidence: 0-1

Return only valid JSON.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert HR interviewer providing final candidate assessments."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
        });

        const assessment = JSON.parse(response.choices[0].message.content);
        return assessment;
    } catch (error) {
        console.error('Error generating assessment:', error);
        // Fallback
        const avgScore = questions.reduce((sum, q) => sum + (q.aiScore || 0), 0) / questions.length;
        return {
            technicalScore: Math.round(avgScore),
            communicationScore: Math.round(avgScore),
            problemSolvingScore: Math.round(avgScore),
            cultureFitScore: Math.round(avgScore),
            strengths: ['Completed the interview'],
            concerns: [],
            keyInsights: [],
            recommendation: avgScore >= 70 ? 'yes' : 'maybe',
            confidence: 0.5
        };
    }
}

module.exports = {
    analyzeResponse,
    generateOverallAssessment
};
