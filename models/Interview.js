const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    jobMatchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobMatch'
        // Optional - not required when creating directly from resume upload
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true
    },
    candidateName: {
        type: String,
        required: false
    },
    candidateEmail: {
        type: String,
        required: false
    },
    videoRecording: {
        fileUrl: String,
        fileName: String,
        fileSize: Number,
        duration: Number,
        uploadedAt: Date
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
        // Optional - may not have job when creating from resume upload
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewTemplate'
    },
    status: {
        type: String,
        enum: ['invited', 'in_progress', 'completed', 'expired', 'cancelled'],
        default: 'invited'
    },
    accessToken: {
        type: String,
        unique: true,
        required: true
    },
    invitationSentAt: Date,
    startedAt: Date,
    completedAt: Date,
    expiresAt: {
        type: Date,
        required: true
    },
    questions: [{
        questionId: mongoose.Schema.Types.ObjectId,
        questionText: {
            type: String,
            required: true
        },
        questionType: {
            type: String,
            enum: ['multiple_choice', 'open_ended', 'technical', 'situational', 'behavioral'],
            required: true
        },
        options: [String],
        answer: String,
        aiScore: {
            type: Number,
            min: 0,
            max: 100
        },
        aiAnalysis: {
            strengths: [String],
            weaknesses: [String],
            keyPoints: [String],
            sentiment: String,
            confidence: Number
        },
        timeSpent: Number,
        answeredAt: Date
    }],
    overallScore: {
        type: Number,
        min: 0,
        max: 100
    },
    aiAssessment: {
        technicalScore: Number,
        communicationScore: Number,
        problemSolvingScore: Number,
        cultureFitScore: Number,
        strengths: [String],
        concerns: [String],
        keyInsights: [String],
        recommendation: {
            type: String,
            enum: ['strong_yes', 'yes', 'maybe', 'no', 'strong_no']
        },
        confidence: Number
    },
    proctoring: {
        identityVerified: Boolean,
        suspiciousActivity: [{
            type: String,
            timestamp: Date,
            description: String
        }],
        tabSwitches: Number,
        fullscreenExits: Number
    },
    feedback: {
        candidateRating: Number,
        candidateComments: String,
        submittedAt: Date
    }
}, { timestamps: true });

// Indexes
interviewSchema.index({ accessToken: 1 });
interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ jobId: 1, status: 1 });
interviewSchema.index({ organizationId: 1, status: 1 });
interviewSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
