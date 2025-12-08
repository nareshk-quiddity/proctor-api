const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

/**
 * Analyze resume using AI
 * @param {string} resumeText - Raw resume text
 * @returns {Promise<Object>} - AI analysis results
 */
async function analyzeResume(resumeText) {
    try {
        const prompt = `Analyze the following resume and extract key information in JSON format:
        
Resume:
${resumeText}

Please provide:
1. extractedSkills: Array of technical and soft skills
2. experienceYears: Total years of experience (number)
3. keyStrengths: Top 3-5 strengths
4. industryExperience: Industries worked in
5. educationLevel: Highest education level
6. careerLevel: one of [entry, mid, senior, executive]

Return only valid JSON.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert HR analyst. Extract structured information from resumes."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
        });

        const analysis = JSON.parse(response.choices[0].message.content);
        return {
            ...analysis,
            processedAt: new Date(),
            processingStatus: 'completed',
            confidence: 0.85
        };
    } catch (error) {
        console.error('Error analyzing resume with AI:', error);
        return {
            processingStatus: 'failed',
            error: error.message
        };
    }
}

/**
 * Calculate job-resume match score using AI
 * @param {Object} job - Job details
 * @param {Object} resume - Resume details
 * @returns {Promise<Object>} - Match analysis with score
 */
async function calculateMatchScore(job, resume) {
    try {
        const prompt = `Compare this job posting with the candidate's resume and provide a detailed match analysis.

JOB POSTING:
Title: ${job.title}
Required Skills: ${job.requirements.skills.join(', ')}
Experience Required: ${job.requirements.experience.min}-${job.requirements.experience.max} ${job.requirements.experience.unit}
Education: ${job.requirements.education}
Description: ${job.description}

CANDIDATE RESUME:
Skills: ${resume.parsedData?.skills?.join(', ') || 'N/A'}
Experience: ${resume.aiAnalysis?.experienceYears || 'N/A'} years
Education: ${resume.aiAnalysis?.educationLevel || 'N/A'}
Career Level: ${resume.aiAnalysis?.careerLevel || 'N/A'}

Provide a JSON response with:
1. overallScore: 0-100 match percentage
2. skillMatch: {score: 0-100, matched: [], missing: []}
3. experienceMatch: {score: 0-100, analysis: string}
4. educationMatch: {score: 0-100, analysis: string}
5. cultureFit: {score: 0-100, analysis: string}
6. recommendation: one of [strong_match, good_match, potential_match, weak_match, no_match]
7. reasoning: detailed explanation
8. confidence: 0-1

Return only valid JSON.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert recruitment AI. Analyze job-candidate matches objectively."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 1500
        });

        const matchAnalysis = JSON.parse(response.choices[0].message.content);
        return matchAnalysis;
    } catch (error) {
        console.error('Error calculating match score:', error);
        // Fallback to basic matching
        return calculateBasicMatch(job, resume);
    }
}

/**
 * Fallback basic matching algorithm (when AI is unavailable)
 */
function calculateBasicMatch(job, resume) {
    const jobSkills = job.requirements.skills.map(s => s.toLowerCase());
    const resumeSkills = (resume.parsedData?.skills || []).map(s => s.toLowerCase());

    const matchedSkills = jobSkills.filter(skill =>
        resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );

    const skillScore = jobSkills.length > 0
        ? (matchedSkills.length / jobSkills.length) * 100
        : 50;

    const experienceScore = calculateExperienceScore(
        job.requirements.experience,
        resume.aiAnalysis?.experienceYears || 0
    );

    const overallScore = (skillScore * 0.6) + (experienceScore * 0.4);

    return {
        overallScore: Math.round(overallScore),
        skillMatch: {
            score: Math.round(skillScore),
            matched: matchedSkills,
            missing: jobSkills.filter(s => !matchedSkills.includes(s))
        },
        experienceMatch: {
            score: Math.round(experienceScore),
            analysis: 'Basic experience comparison'
        },
        educationMatch: {
            score: 70,
            analysis: 'Education match not analyzed'
        },
        cultureFit: {
            score: 60,
            analysis: 'Culture fit not analyzed'
        },
        recommendation: overallScore >= 80 ? 'strong_match' :
            overallScore >= 60 ? 'good_match' :
                overallScore >= 40 ? 'potential_match' : 'weak_match',
        reasoning: 'Basic algorithmic matching',
        confidence: 0.5
    };
}

function calculateExperienceScore(required, actual) {
    if (!required || !actual) return 50;

    const minYears = required.min || 0;
    const maxYears = required.max || 100;

    if (actual < minYears) {
        return Math.max(0, (actual / minYears) * 100 * 0.7);
    } else if (actual > maxYears) {
        const excess = actual - maxYears;
        return Math.max(70, 100 - (excess * 5));
    } else {
        return 100;
    }
}

module.exports = {
    analyzeResume,
    calculateMatchScore,
    calculateBasicMatch
};
