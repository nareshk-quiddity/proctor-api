const router = require('express').Router();
const Interview = require('../models/Interview');
const InterviewTemplate = require('../models/InterviewTemplate');
const Resume = require('../models/Resume');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/videos';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, `interview-${req.params.token}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Upload video recording
router.post('/interview/:token/upload-video', upload.single('video'), async (req, res) => {
    try {
        const interview = await Interview.findOne({ accessToken: req.params.token });
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (req.file) {
            interview.videoRecording = {
                fileUrl: `/uploads/videos/${req.file.filename}`,
                fileName: req.file.filename,
                fileSize: req.file.size,
                uploadedAt: new Date()
            };
            await interview.save();
            res.json({ message: 'Video uploaded successfully', fileUrl: interview.videoRecording.fileUrl });
        } else {
            res.status(400).json({ message: 'No video file uploaded' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Access interview by token (no auth required)
router.get('/interview/:token', async (req, res) => {
    try {
        const interview = await Interview.findOne({ accessToken: req.params.token })
            .populate('jobId', 'title description location employmentType')
            .populate('templateId');

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (interview.status === 'expired' || new Date() > interview.expiresAt) {
            return res.status(410).json({ message: 'Interview link has expired' });
        }

        // Return interview details without sensitive data
        res.json({
            _id: interview._id,
            jobId: interview.jobId,
            status: interview.status,
            expiresAt: interview.expiresAt,
            questions: interview.questions.map(q => ({
                questionId: q.questionId,
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit candidate details
router.post('/interview/:token/details', async (req, res) => {
    try {
        const { candidateName, candidateEmail } = req.body;
        const interview = await Interview.findOne({ accessToken: req.params.token });

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        interview.candidateName = candidateName;
        interview.candidateEmail = candidateEmail;
        await interview.save();

        res.json({ message: 'Details saved successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start interview
router.post('/interview/:token/start', async (req, res) => {
    try {
        const interview = await Interview.findOne({ accessToken: req.params.token });

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (interview.status !== 'invited') {
            return res.status(400).json({ message: 'Interview already started or completed' });
        }

        if (new Date() > interview.expiresAt) {
            interview.status = 'expired';
            await interview.save();
            return res.status(410).json({ message: 'Interview link has expired' });
        }

        interview.status = 'in_progress';
        interview.startedAt = new Date();
        await interview.save();

        res.json({ message: 'Interview started', interview });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit answer
const { analyzeResponse, generateOverallAssessment } = require('../services/interviewService');

router.post('/interview/:token/answer', async (req, res) => {
    try {
        const { questionId, answer, timeSpent } = req.body;

        const interview = await Interview.findOne({ accessToken: req.params.token });

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (interview.status !== 'in_progress') {
            return res.status(400).json({ message: 'Interview is not in progress' });
        }

        // Find and update the question
        const questionIndex = interview.questions.findIndex(
            q => q.questionId.toString() === questionId
        );

        if (questionIndex === -1) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const question = interview.questions[questionIndex];

        // Use AI to analyze the response
        const analysis = await analyzeResponse(
            question.questionText,
            answer,
            question.questionType,
            question.expectedAnswerPoints || []
        );

        interview.questions[questionIndex].answer = answer;
        interview.questions[questionIndex].timeSpent = timeSpent;
        interview.questions[questionIndex].answeredAt = new Date();
        interview.questions[questionIndex].aiScore = analysis.score;
        interview.questions[questionIndex].aiAnalysis = {
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            keyPoints: analysis.keyPoints,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence
        };

        await interview.save();

        res.json({
            message: 'Answer submitted successfully',
            feedback: analysis.feedback,
            score: analysis.score
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Complete interview
router.post('/interview/:token/complete', async (req, res) => {
    try {
        const interview = await Interview.findOne({ accessToken: req.params.token });

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        if (interview.status !== 'in_progress') {
            return res.status(400).json({ message: 'Interview is not in progress' });
        }

        interview.status = 'completed';
        interview.completedAt = new Date();

        // Calculate overall score
        const answeredQuestions = interview.questions.filter(q => q.answer);
        if (answeredQuestions.length > 0) {
            const totalScore = answeredQuestions.reduce((sum, q) => sum + (q.aiScore || 0), 0);
            interview.overallScore = Math.round(totalScore / answeredQuestions.length);
        }

        // Generate AI assessment
        const assessment = await generateOverallAssessment(interview.questions);
        interview.aiAssessment = assessment;

        await interview.save();

        // Update resume status
        await Resume.findByIdAndUpdate(interview.candidateId, {
            status: 'interviewing'
        });

        res.json({
            message: 'Interview completed successfully',
            overallScore: interview.overallScore,
            recommendation: assessment.recommendation
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Check application status
router.get('/status/:token', async (req, res) => {
    try {
        const interview = await Interview.findOne({ accessToken: req.params.token })
            .populate('jobId', 'title')
            .select('status completedAt overallScore');

        if (!interview) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json(interview);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
