const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, organizationId } = req.body;

        // Check if user exists
        const emailExist = await User.findOne({ email });
        if (emailExist) return res.status(400).json({ message: 'Email already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'user',
            organizationId
        });

        const savedUser = await user.save();

        // Create and assign token
        const token = jwt.sign({
            _id: savedUser._id,
            role: savedUser.role,
            organizationId: savedUser.organizationId
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.header('auth-token', token).json({
            token,
            user: {
                _id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role
            }
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Email is not found' });

        // Check password
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Invalid password' });

        // Create and assign token
        const token = jwt.sign({
            _id: user._id,
            role: user.role,
            organizationId: user.organizationId
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.header('auth-token', token).json({
            token,
            role: user.role,
            userId: user._id,
            organizationId: user.organizationId
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Logout (Client side handles token removal, but we can have a dummy endpoint)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Forgot Password - Send reset email
const { generateResetToken, hashResetToken } = require('../utils/passwordUtils');
const { sendPasswordResetEmail } = require('../services/emailService');

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if email exists for security
            return res.json({ message: 'If the email exists, a reset link will be sent' });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        const hashedToken = hashResetToken(resetToken);

        // Save hashed token and expiry (1 hour)
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // Send reset email
        await sendPasswordResetEmail(
            user.email,
            user.profile?.firstName || user.username,
            resetToken
        );

        res.json({ message: 'If the email exists, a reset link will be sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

// Reset Password - Set new password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        // Hash the received token to compare
        const hashedToken = hashResetToken(token);

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

module.exports = router;

