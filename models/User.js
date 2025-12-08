const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'customer_admin', 'recruiter', 'candidate'],
        default: 'recruiter'
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: function () {
            return !['super_admin', 'candidate'].includes(this.role);
        }
    },
    profile: {
        firstName: {
            type: String,
            trim: true
        },
        lastName: {
            type: String,
            trim: true
        },
        phone: String,
        avatar: String,
        timezone: {
            type: String,
            default: 'UTC'
        },
        language: {
            type: String,
            default: 'en'
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'active'
    },
    lastLogin: Date,
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        }
    },
    // Password reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,
    mustChangePassword: {
        type: Boolean,
        default: false
    },
    // Candidate-specific fields
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview'
    },
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    }
}, { timestamps: true });

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    if (this.profile.firstName && this.profile.lastName) {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.username;
});

module.exports = mongoose.model('User', userSchema);
