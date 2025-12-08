const router = require('express').Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get all organizations
router.get('/organizations', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const organizations = await Organization.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Organization.countDocuments();

        res.json({
            organizations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new organization
router.post('/organizations', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const { name, domain, subscription, settings, billing } = req.body;

        // Check if domain already exists
        if (domain) {
            const existing = await Organization.findOne({ domain });
            if (existing) {
                return res.status(400).json({ message: 'Domain already exists' });
            }
        }

        const organization = new Organization({
            name,
            domain,
            subscription,
            settings,
            billing
        });

        const savedOrg = await organization.save();
        res.status(201).json(savedOrg);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get organization details
router.get('/organizations/:id', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Get organization stats
        const userCount = await User.countDocuments({ organizationId: req.params.id });
        const recruiterCount = await User.countDocuments({
            organizationId: req.params.id,
            role: 'recruiter'
        });

        res.json({
            ...organization.toObject(),
            stats: {
                totalUsers: userCount,
                recruiters: recruiterCount
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update organization
router.put('/organizations/:id', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const updates = req.body;
        const organization = await Organization.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(organization);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete organization
router.delete('/organizations/:id', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Check if organization has users
        const userCount = await User.countDocuments({ organizationId: req.params.id });
        if (userCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete organization with existing users. Please remove all users first.'
            });
        }

        await Organization.findByIdAndDelete(req.params.id);
        res.json({ message: 'Organization deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all users (across all organizations)
router.get('/users', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .populate('organizationId', 'name domain')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get platform analytics
router.get('/analytics', verifyToken, checkRole(['super_admin']), async (req, res) => {
    try {
        const totalOrgs = await Organization.countDocuments();
        const activeOrgs = await Organization.countDocuments({ status: 'active' });
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });

        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const orgsByPlan = await Organization.aggregate([
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]);

        res.json({
            organizations: {
                total: totalOrgs,
                active: activeOrgs
            },
            users: {
                total: totalUsers,
                active: activeUsers,
                byRole: usersByRole
            },
            subscriptions: {
                byPlan: orgsByPlan
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
