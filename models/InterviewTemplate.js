const mongoose = require('mongoose');

const interviewTemplateSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    category: {
        type: String,
        enum: ['technical', 'behavioral', 'general', 'situational', 'custom'],
        required: true
    },
    jobRole: String,
    industry: String,
    questions: [{
        text: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['multiple_choice', 'open_ended', 'technical', 'situational', 'behavioral'],
            required: true
        },
        options: [String],
        expectedAnswerPoints: [String],
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
        },
        timeLimit: {
            type: Number,
            default: 300
        },
        weight: {
            type: Number,
            default: 1,
            min: 0.1,
            max: 5
        }
    }],
    totalDuration: Number,
    passingScore: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Indexes
interviewTemplateSchema.index({ organizationId: 1, isActive: 1 });
interviewTemplateSchema.index({ category: 1, isGlobal: 1 });
interviewTemplateSchema.index({ isGlobal: 1, isActive: 1 });

module.exports = mongoose.model('InterviewTemplate', interviewTemplateSchema);
