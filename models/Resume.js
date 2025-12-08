const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    candidateInfo: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true
        },
        phone: String,
        linkedIn: String,
        portfolio: String,
        location: {
            city: String,
            state: String,
            country: String
        }
    },
    resumeFile: {
        originalName: String,
        fileUrl: String,
        fileType: {
            type: String,
            enum: ['pdf', 'doc', 'docx', 'txt']
        },
        fileSize: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    parsedData: {
        rawText: String,
        skills: [String],
        experience: [{
            company: String,
            title: String,
            startDate: String,
            endDate: String,
            duration: String,
            description: String,
            location: String
        }],
        education: [{
            institution: String,
            degree: String,
            field: String,
            startYear: String,
            endYear: String,
            gpa: String
        }],
        certifications: [{
            name: String,
            issuer: String,
            date: String,
            expiryDate: String
        }],
        languages: [String],
        summary: String
    },
    aiAnalysis: {
        extractedSkills: [String],
        experienceYears: Number,
        keyStrengths: [String],
        industryExperience: [String],
        educationLevel: String,
        careerLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'executive']
        },
        processedAt: Date,
        processingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        confidence: Number
    },
    status: {
        type: String,
        enum: ['new', 'screening', 'matched', 'interviewing', 'shortlisted', 'rejected', 'hired', 'archived'],
        default: 'new'
    },
    tags: [String],
    notes: [{
        text: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    source: {
        type: String,
        enum: ['upload', 'paste', 'email', 'api', 'referral'],
        default: 'upload'
    }
}, { timestamps: true });

// Indexes
resumeSchema.index({ organizationId: 1, status: 1 });
resumeSchema.index({ uploadedBy: 1 });
resumeSchema.index({ 'candidateInfo.email': 1 });
resumeSchema.index({ 'aiAnalysis.extractedSkills': 1 });
resumeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);
