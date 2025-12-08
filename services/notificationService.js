const Notification = require('../models/Notification');

/**
 * Create notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>}
 */
async function createNotification(data) {
    try {
        const notification = new Notification({
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data || {},
            link: data.link
        });

        await notification.save();
        return { success: true, notification };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user notifications
 * @param {string} userId
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getUserNotifications(userId, options = {}) {
    try {
        const { limit = 20, unreadOnly = false } = options;

        const query = { userId };
        if (unreadOnly) {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 * @param {string} notificationId
 * @returns {Promise<Object>}
 */
async function markAsRead(notificationId) {
    try {
        await Notification.findByIdAndUpdate(notificationId, {
            read: true,
            readAt: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark all user notifications as read
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function markAllAsRead(userId) {
    try {
        await Notification.updateMany(
            { userId, read: false },
            { read: true, readAt: new Date() }
        );
        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete notification
 * @param {string} notificationId
 * @returns {Promise<Object>}
 */
async function deleteNotification(notificationId) {
    try {
        await Notification.findByIdAndDelete(notificationId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread count
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
    try {
        const count = await Notification.countDocuments({ userId, read: false });
        return count;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * Notify on strong match
 */
async function notifyStrongMatch(recruiterId, matchData) {
    return createNotification({
        userId: recruiterId,
        type: 'match',
        title: 'Strong Match Found!',
        message: `${matchData.candidateName} is a ${matchData.matchScore}% match for ${matchData.jobTitle}`,
        data: {
            matchId: matchData.matchId,
            jobId: matchData.jobId,
            candidateId: matchData.candidateId
        },
        link: `/jobs/${matchData.jobId}/matches`
    });
}

/**
 * Notify on interview completion
 */
async function notifyInterviewCompletion(recruiterId, interviewData) {
    return createNotification({
        userId: recruiterId,
        type: 'interview',
        title: 'Interview Completed',
        message: `${interviewData.candidateName} completed the interview for ${interviewData.jobTitle}`,
        data: {
            interviewId: interviewData.interviewId,
            jobId: interviewData.jobId
        },
        link: `/interviews/${interviewData.interviewId}/results`
    });
}

/**
 * Notify on new resume
 */
async function notifyNewResume(recruiterId, resumeData) {
    return createNotification({
        userId: recruiterId,
        type: 'resume',
        title: 'New Resume Uploaded',
        message: `New resume received from ${resumeData.candidateName}`,
        data: {
            resumeId: resumeData.resumeId
        },
        link: `/resumes/${resumeData.resumeId}`
    });
}

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    notifyStrongMatch,
    notifyInterviewCompletion,
    notifyNewResume
};
