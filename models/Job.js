const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        skills: [String],
        experience: {
            min: Number,
            max: Number,
            unit: {
                type: String,
                enum: ['months', 'years'],
                default: 'years'
            }
        },
        education: String,
        certifications: [String],
        languages: [String]
    },
    location: {
        type: {
            type: String,
            enum: ['remote', 'onsite', 'hybrid'],
            default: 'onsite'
        },
        city: String,
        state: String,
        country: String,
        timezone: String
    },
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
        required: true
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        period: {
            type: String,
            enum: ['hourly', 'monthly', 'yearly'],
            default: 'yearly'
        }
    },
    department: String,
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'closed', 'archived'],
        default: 'draft'
    },
    aiProcessed: {
        extractedSkills: [String],
        keyRequirements: [String],
        suggestedQuestions: [String],
        processedAt: Date,
        processingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        }
    },
    stats: {
        totalApplications: {
            type: Number,
            default: 0
        },
        matchedCandidates: {
            type: Number,
            default: 0
        },
        interviewsScheduled: {
            type: Number,
            default: 0
        },
        interviewsCompleted: {
            type: Number,
            default: 0
        },
        hires: {
            type: Number,
            default: 0
        }
    },
    expiresAt: Date,
    publishedAt: Date
}, { timestamps: true });

// Indexes
jobSchema.index({ organizationId: 1, status: 1 });
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ status: 1, publishedAt: -1 });
jobSchema.index({ 'requirements.skills': 1 });

module.exports = mongoose.model('Job', jobSchema);
