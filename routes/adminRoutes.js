const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const jwt = require('jsonwebtoken');
// Create new user (Admin only)
router.post('/users', verifyToken, checkRole(['super_admin', 'customer_admin']), async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        const emailExist = await User.findOne({ email });
        if (emailExist) return res.status(400).json({ message: 'Email already exists' });

        const usernameExist = await User.findOne({ username });
        if (usernameExist) return res.status(400).json({ message: 'Username already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Determine organizationId
        let orgId = req.body.organizationId;
        if (req.user.role === 'customer_admin') {
            orgId = req.user.organizationId;
        }

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'user',
            organizationId: orgId
        });

        const savedUser = await user.save();

        // Return user without password
        const userResponse = {
            _id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            role: savedUser.role,
            createdAt: savedUser.createdAt
        };

        res.json({ message: 'User created successfully', user: userResponse });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all users (Admin only)
router.get('/users', verifyToken, checkRole(['super_admin', 'customer_admin']), async (req, res) => {
    try {
        let query = {};

        // Customer Admin can only see users in their organization
        if (req.user.role === 'customer_admin') {
            query.organizationId = req.user.organizationId;
        }

        const users = await User.find(query).select('-password').populate('organizationId', 'name domain');
        res.json(users);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete user (Admin only)
router.delete('/users/:id', verifyToken, checkRole(['super_admin', 'customer_admin']), async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        // Prevent users from deleting themselves
        if (req.user._id.toString() === req.params.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Customer Admin can only delete users in their organization
        if (req.user.role === 'customer_admin') {
            // Check if user belongs to same organization
            if (!userToDelete.organizationId || userToDelete.organizationId.toString() !== req.user.organizationId.toString()) {
                return res.status(403).json({ message: 'You can only delete users in your organization' });
            }

            // Customer Admin cannot delete Super Admin or other Customer Admins
            if (userToDelete.role === 'super_admin' || userToDelete.role === 'customer_admin') {
                return res.status(403).json({ message: 'You do not have permission to delete admin accounts' });
            }
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update user (Admin only)
router.put('/users/:id', verifyToken, checkRole(['super_admin', 'customer_admin']), async (req, res) => {
    try {
        const { username, email, role, status } = req.body;
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Customer Admin restrictions
        if (req.user.role === 'customer_admin') {
            // Can only update users in their organization
            if (!userToUpdate.organizationId || userToUpdate.organizationId.toString() !== req.user.organizationId.toString()) {
                return res.status(403).json({ message: 'You can only update users in your organization' });
            }
            // Cannot update super_admin or customer_admin
            if (userToUpdate.role === 'super_admin' || userToUpdate.role === 'customer_admin') {
                return res.status(403).json({ message: 'You do not have permission to update admin accounts' });
            }
            // Cannot change role to admin roles
            if (role === 'super_admin' || role === 'customer_admin') {
                return res.status(403).json({ message: 'You cannot assign admin roles' });
            }
        }

        // Check for duplicate email/username
        if (email && email !== userToUpdate.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: req.params.id } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }
        if (username && username !== userToUpdate.username) {
            const usernameExists = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already in use' });
            }
        }

        // Update fields
        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (role) updates.role = role;
        if (status) updates.status = status;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get organization analytics (Customer Admin only)
router.get('/analytics', verifyToken, checkRole(['customer_admin']), async (req, res) => {
    try {
        let orgId = req.user.organizationId;

        // If orgId is missing from token (e.g. old token), fetch user
        if (!orgId) {
            const user = await User.findById(req.user._id);
            orgId = user.organizationId;
        }

        if (!orgId) {
            return res.status(400).json({ message: 'User is not assigned to any organization' });
        }
        const totalUsers = await User.countDocuments({ organizationId: orgId });
        const activeUsers = await User.countDocuments({ organizationId: orgId, status: 'active' });

        const usersByRole = await User.aggregate([
            { $match: { organizationId: require('mongoose').Types.ObjectId(orgId) } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const recruiters = await User.countDocuments({ organizationId: orgId, role: 'recruiter' });
        const activeRecruiters = await User.countDocuments({ organizationId: orgId, role: 'recruiter', status: 'active' });

        const candidates = await User.countDocuments({ organizationId: orgId, role: 'candidate' });
        const activeCandidates = await User.countDocuments({ organizationId: orgId, role: 'candidate', status: 'active' });

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                byRole: usersByRole,
                recruiters: {
                    total: recruiters,
                    active: activeRecruiters,
                    inactive: recruiters - activeRecruiters
                },
                candidates: {
                    total: candidates,
                    active: activeCandidates,
                    inactive: candidates - activeCandidates
                }
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Impersonate User (Admin only)
router.post('/impersonate/:userId', verifyToken, checkRole(['super_admin', 'customer_admin']), async (req, res) => {
    try {
        const userToImpersonate = await User.findById(req.params.userId);
        if (!userToImpersonate) return res.status(404).json({ message: 'User not found' });

        // Customer Admin restrictions
        if (req.user.role === 'customer_admin') {
            // Check if user belongs to same organization
            if (!userToImpersonate.organizationId || userToImpersonate.organizationId.toString() !== req.user.organizationId.toString()) {
                return res.status(403).json({ message: 'You can only impersonate users in your organization' });
            }
            // Cannot impersonate admins
            if (['super_admin', 'customer_admin'].includes(userToImpersonate.role)) {
                return res.status(403).json({ message: 'Cannot impersonate administrative accounts' });
            }
        }

        // Create token for the impersonated user
        const token = jwt.sign({
            _id: userToImpersonate._id,
            role: userToImpersonate.role,
            organizationId: userToImpersonate.organizationId
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                _id: userToImpersonate._id,
                username: userToImpersonate.username,
                email: userToImpersonate.email,
                role: userToImpersonate.role,
                organizationId: userToImpersonate.organizationId
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
