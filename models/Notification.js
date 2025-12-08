const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    type: {
        type: String,
        enum: [
            'interview_invitation',
            'interview_completed',
            'match_found',
            'job_application',
            'status_update',
            'system_alert',
            'reminder'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: mongoose.Schema.Types.Mixed,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    actionUrl: String,
    expiresAt: Date
}, { timestamps: true });

// Indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
