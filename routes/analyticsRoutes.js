const router = require('express').Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
    getSuperAdminAnalytics,
    getOrgAdminAnalytics,
    getRecruiterAnalytics
} = require('../services/analyticsService');
const { Parser } = require('json2csv');
const JobMatch = require('../models/JobMatch');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');

// Get analytics based on role
router.get('/', verifyToken, async (req, res) => {
    try {
        let analytics;

        if (req.user.role === 'super_admin') {
            analytics = await getSuperAdminAnalytics();
        } else if (req.user.role === 'customer_admin') {
            if (req.query.userId) {
                // Allow admin to view a specific recruiter's analytics
                analytics = await getRecruiterAnalytics(req.query.userId, req.user.organizationId);
            } else {
                analytics = await getOrgAdminAnalytics(req.user.organizationId);
            }
        } else if (req.user.role === 'recruiter') {
            analytics = await getRecruiterAnalytics(req.user._id, req.user.organizationId);
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(analytics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Recruiter-specific analytics endpoints
router.get('/recruiter/dashboard', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const analytics = await getRecruiterAnalytics(req.user._id, req.user.organizationId);
        res.json(analytics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/recruiter/jobs', verifyToken, checkRole(['recruiter']), async (req, res) => {
    try {
        const analytics = await getRecruiterAnalytics(req.user._id, req.user.organizationId);
        res.json(analytics.jobs || {});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Export matches to CSV
router.get('/export/matches', verifyToken, checkRole(['recruiter', 'customer_admin']), async (req, res) => {
    try {
        const matches = await JobMatch.find({ organizationId: req.user.organizationId })
            .populate('candidateId', 'candidateInfo')
            .populate('jobId', 'title')
            .lean();

        const data = matches.map(match => ({
            'Job Title': match.jobId?.title || 'N/A',
            'Candidate Name': match.candidateId?.candidateInfo?.name || 'N/A',
            'Candidate Email': match.candidateId?.candidateInfo?.email || 'N/A',
            'Match Score': match.matchScore,
            'Status': match.recruiterReview?.status || 'pending',
            'Created At': new Date(match.createdAt).toLocaleDateString()
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment('matches.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Export resumes to CSV
router.get('/export/resumes', verifyToken, checkRole(['recruiter', 'customer_admin']), async (req, res) => {
    try {
        const resumes = await Resume.find({ organizationId: req.user.organizationId })
            .lean();

        const data = resumes.map(resume => ({
            'Candidate Name': resume.candidateInfo?.name || 'N/A',
            'Email': resume.candidateInfo?.email || 'N/A',
            'Phone': resume.candidateInfo?.phone || 'N/A',
            'Skills': resume.parsedData?.skills?.join(', ') || 'N/A',
            'Status': resume.status,
            'Uploaded At': new Date(resume.createdAt).toLocaleDateString()
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment('resumes.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Export interviews to CSV
router.get('/export/interviews', verifyToken, checkRole(['recruiter', 'customer_admin']), async (req, res) => {
    try {
        const interviews = await Interview.find({ organizationId: req.user.organizationId })
            .populate('candidateId', 'candidateInfo')
            .populate('jobId', 'title')
            .lean();

        const data = interviews.map(interview => ({
            'Job Title': interview.jobId?.title || 'N/A',
            'Candidate Name': interview.candidateId?.candidateInfo?.name || 'N/A',
            'Candidate Email': interview.candidateId?.candidateInfo?.email || 'N/A',
            'Status': interview.status,
            'Overall Score': interview.overallScore || 'N/A',
            'Recommendation': interview.aiAssessment?.recommendation || 'N/A',
            'Completed At': interview.completedAt ? new Date(interview.completedAt).toLocaleDateString() : 'N/A'
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment('interviews.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
