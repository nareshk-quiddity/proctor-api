const router = require('express').Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const bcrypt = require('bcryptjs');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get organization settings
router.get('/settings', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        res.json(organization);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update organization settings
router.put('/settings', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const { settings, branding } = req.body;

        const updateData = {};
        if (settings) updateData.settings = settings;
        if (branding) updateData['settings.branding'] = branding;

        const organization = await Organization.findByIdAndUpdate(
            req.user.organizationId,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(organization);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all recruiters in organization
router.get('/recruiters', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const recruiters = await User.find({
            organizationId: req.user.organizationId,
            role: 'recruiter'
        }).select('-password').sort({ createdAt: -1 });

        res.json(recruiters);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Invite/Create recruiter
router.post('/recruiters', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const { email, username, password, profile } = req.body;

        // Check organization limits
        const organization = await Organization.findById(req.user.organizationId);
        if (organization.subscription.currentRecruiters >= organization.subscription.maxRecruiters) {
            return res.status(400).json({
                message: 'Recruiter limit reached. Please upgrade your plan.'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create recruiter
        const recruiter = new User({
            email,
            username,
            password: hashedPassword,
            role: 'recruiter',
            organizationId: req.user.organizationId,
            profile,
            status: 'active'
        });

        const savedRecruiter = await recruiter.save();

        // Update organization recruiter count
        await Organization.findByIdAndUpdate(req.user.organizationId, {
            $inc: { 'subscription.currentRecruiters': 1 }
        });

        res.status(201).json({
            _id: savedRecruiter._id,
            email: savedRecruiter.email,
            username: savedRecruiter.username,
            role: savedRecruiter.role,
            profile: savedRecruiter.profile
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update recruiter
router.put('/recruiters/:id', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const { profile, status } = req.body;

        const recruiter = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            role: 'recruiter'
        });

        if (!recruiter) {
            return res.status(404).json({ message: 'Recruiter not found' });
        }

        if (profile) recruiter.profile = { ...recruiter.profile, ...profile };
        if (status) recruiter.status = status;

        await recruiter.save();

        res.json({
            _id: recruiter._id,
            email: recruiter.email,
            username: recruiter.username,
            profile: recruiter.profile,
            status: recruiter.status
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete/Remove recruiter
router.delete('/recruiters/:id', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const recruiter = await User.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId,
            role: 'recruiter'
        });

        if (!recruiter) {
            return res.status(404).json({ message: 'Recruiter not found' });
        }

        await User.findByIdAndDelete(req.params.id);

        // Update organization recruiter count
        await Organization.findByIdAndUpdate(req.user.organizationId, {
            $inc: { 'subscription.currentRecruiters': -1 }
        });

        res.json({ message: 'Recruiter removed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get organization analytics
router.get('/analytics', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        const Job = require('../models/Job');
        const Resume = require('../models/Resume');
        const Interview = require('../models/Interview');

        const totalJobs = await Job.countDocuments({ organizationId: req.user.organizationId });
        const activeJobs = await Job.countDocuments({
            organizationId: req.user.organizationId,
            status: 'active'
        });
        const totalResumes = await Resume.countDocuments({ organizationId: req.user.organizationId });
        const totalInterviews = await Interview.countDocuments({ organizationId: req.user.organizationId });
        const completedInterviews = await Interview.countDocuments({
            organizationId: req.user.organizationId,
            status: 'completed'
        });

        res.json({
            jobs: {
                total: totalJobs,
                active: activeJobs
            },
            resumes: {
                total: totalResumes
            },
            interviews: {
                total: totalInterviews,
                completed: completedInterviews
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
