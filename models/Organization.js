const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },
    subscription: {
        plan: {
            type: String,
            enum: ['freemium', 'professional', 'enterprise', 'custom'],
            default: 'freemium'
        },
        status: {
            type: String,
            enum: ['active', 'trial', 'suspended', 'cancelled'],
            default: 'trial'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date,
        maxRecruiters: {
            type: Number,
            default: 5
        },
        maxJobPostings: {
            type: Number,
            default: 5
        },
        currentRecruiters: {
            type: Number,
            default: 0
        },
        currentJobPostings: {
            type: Number,
            default: 0
        }
    },
    settings: {
        matchingThreshold: {
            type: Number,
            default: 70,
            min: 0,
            max: 100
        },
        emailDomain: String,
        branding: {
            logo: String,
            primaryColor: {
                type: String,
                default: '#667eea'
            },
            secondaryColor: {
                type: String,
                default: '#764ba2'
            }
        },
        notifications: {
            emailEnabled: {
                type: Boolean,
                default: true
            },
            smsEnabled: {
                type: Boolean,
                default: false
            }
        }
    },
    billing: {
        contactEmail: String,
        contactName: String,
        billingAddress: {
            street: String,
            city: String,
            state: String,
            country: String,
            zipCode: String
        },
        taxId: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    }
}, { timestamps: true });

// Indexes
organizationSchema.index({ domain: 1 });
organizationSchema.index({ 'subscription.status': 1 });
organizationSchema.index({ status: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
