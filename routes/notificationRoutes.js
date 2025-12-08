const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} = require('../services/notificationService');

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const { limit, unreadOnly } = req.query;
        const notifications = await getUserNotifications(req.user._id, {
            limit: limit ? parseInt(limit) : 20,
            unreadOnly: unreadOnly === 'true'
        });
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await getUnreadCount(req.user._id);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const result = await markAsRead(req.params.id);
        if (result.success) {
            res.json({ message: 'Notification marked as read' });
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        const result = await markAllAsRead(req.user._id);
        if (result.success) {
            res.json({ message: 'All notifications marked as read' });
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await deleteNotification(req.params.id);
        if (result.success) {
            res.json({ message: 'Notification deleted' });
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
