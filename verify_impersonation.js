const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

const API_URL = `http://localhost:${process.env.PORT || 5002}/api`;

async function verifyImpersonation() {
    try {
        console.log('1. Connecting to DB to setup test data...');
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        // Setup Organization
        let org = await Organization.findOne({ name: 'Test Org Impersonation' });
        if (!org) {
            org = await Organization.create({
                name: 'Test Org Impersonation',
                email: 'org@test.com',
                status: 'active',
                subscription: { plan: 'enterprise' }
            });
        }

        // Setup Customer Admin
        const adminEmail = 'admin@impersonate.test';
        let admin = await User.findOne({ email: adminEmail });
        if (!admin) { // Create if not exists
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            admin = await User.create({
                username: 'TestAdmin',
                email: adminEmail,
                password: hashedPassword,
                role: 'customer_admin',
                organizationId: org._id,
                status: 'active'
            });
        }

        // Setup Recruiter
        const recruiterEmail = 'recruiter@impersonate.test';
        let recruiter = await User.findOne({ email: recruiterEmail });
        if (!recruiter) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            recruiter = await User.create({
                username: 'TestRecruiter',
                email: recruiterEmail,
                password: hashedPassword,
                role: 'recruiter',
                organizationId: org._id,
                status: 'active'
            });
        }

        console.log('2. Logging in as Customer Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password: 'password123'
        });
        const adminToken = loginRes.data.token;
        console.log('   Login successful, token received.');

        console.log(`3. Attempting to impersonate Recruiter (ID: ${recruiter._id})...`);
        const impersonateRes = await axios.post(
            `${API_URL}/admin/impersonate/${recruiter._id}`,
            {},
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        console.log('4. Verifying Impersonation Response...');
        if (impersonateRes.status === 200 && impersonateRes.data.token) {
            console.log('   SUCCESS: Received impersonation token.');
            console.log('   Impersonated User Role:', impersonateRes.data.user.role);
            if (impersonateRes.data.user.role === 'recruiter') {
                console.log('   ✅ Verification PASSED: Token is for a recruiter.');
            } else {
                console.log('   ❌ Verification FAILED: Role mismatch.');
            }
        } else {
            console.log('   ❌ Verification FAILED: Invalid response.');
        }

    } catch (error) {
        console.error('❌ Verification FAILED with error:', error.response ? error.response.data : error.message);
    } finally {
        await mongoose.disconnect();
        // process.exit(0); // Let the script exit naturally or handle server shutdown separately
    }
}

// We need to wait a bit for server to start if we were running it, but here we assume server is running.
// Wait... I verify_impersonation.js will be run AFTER I start the server.
verifyImpersonation();
