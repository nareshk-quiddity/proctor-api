const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    matchDetails: {
        skillMatch: {
            score: Number,
            matchedSkills: [String],
            missingSkills: [String]
        },
        experienceMatch: {
            score: Number,
            yearsRequired: Number,
            yearsCandidate: Number
        },
        educationMatch: {
            score: Number,
            details: String
        },
        locationMatch: {
            score: Number,
            details: String
        },
        overallFit: Number
    },
    skillGaps: [String],
    strengths: [String],
    aiRecommendation: {
        decision: {
            type: String,
            enum: ['strong_match', 'good_match', 'potential_match', 'weak_match', 'no_match']
        },
        reasoning: String,
        confidence: Number
    },
    recruiterReview: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'maybe'],
            default: 'pending'
        },
        notes: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date
    },
    interviewScheduled: {
        type: Boolean,
        default: false
    },
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview'
    }
}, { timestamps: true });

// Indexes
jobMatchSchema.index({ jobId: 1, matchScore: -1 });
jobMatchSchema.index({ candidateId: 1 });
jobMatchSchema.index({ organizationId: 1 });
jobMatchSchema.index({ 'recruiterReview.status': 1 });
jobMatchSchema.index({ matchScore: -1 });

// Compound index for efficient queries
jobMatchSchema.index({ jobId: 1, 'recruiterReview.status': 1, matchScore: -1 });

module.exports = mongoose.model('JobMatch', jobMatchSchema);
