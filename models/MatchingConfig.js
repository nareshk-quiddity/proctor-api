const mongoose = require('mongoose');

const matchingConfigSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    thresholds: {
        minimumMatchScore: {
            type: Number,
            default: 60,
            min: 0,
            max: 100
        },
        strongMatchScore: {
            type: Number,
            default: 80,
            min: 0,
            max: 100
        },
        autoRejectScore: {
            type: Number,
            default: 30,
            min: 0,
            max: 100
        }
    },
    weights: {
        skillMatch: {
            type: Number,
            default: 0.4,
            min: 0,
            max: 1
        },
        experienceMatch: {
            type: Number,
            default: 0.3,
            min: 0,
            max: 1
        },
        educationMatch: {
            type: Number,
            default: 0.15,
            min: 0,
            max: 1
        },
        cultureFit: {
            type: Number,
            default: 0.15,
            min: 0,
            max: 1
        }
    },
    autoMatchingEnabled: {
        type: Boolean,
        default: true
    },
    aiEnabled: {
        type: Boolean,
        default: true
    },
    notifyOnStrongMatch: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Validate that weights sum to 1.0
matchingConfigSchema.pre('save', function (next) {
    const totalWeight = this.weights.skillMatch +
        this.weights.experienceMatch +
        this.weights.educationMatch +
        this.weights.cultureFit;

    if (Math.abs(totalWeight - 1.0) > 0.01) {
        next(new Error('Weights must sum to 1.0'));
    } else {
        next();
    }
});

module.exports = mongoose.model('MatchingConfig', matchingConfigSchema);
