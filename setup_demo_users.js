const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

const PASSWORD = 'demo123';

async function setupDemoUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');

        // 1. Create Super Admin
        console.log('\n--- Creating Super Admin ---');
        let superAdmin = await User.findOne({ email: 'superadmin@demo.com' });
        if (!superAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(PASSWORD, salt);
            superAdmin = await User.create({
                username: 'Super Admin',
                email: 'superadmin@demo.com',
                password: hashedPassword,
                role: 'super_admin',
                status: 'active'
            });
            console.log('✅ Super Admin created: superadmin@demo.com');
        } else {
            console.log('ℹ️ Super Admin already exists');
        }

        // 2. Create Organization
        console.log('\n--- Creating Organization ---');
        let org = await Organization.findOne({ domain: 'demo.com' });
        if (!org) {
            org = await Organization.create({
                name: 'Demo Corporation',
                domain: 'demo.com',
                subscription: {
                    plan: 'enterprise',
                    status: 'active',
                    maxRecruiters: 5,
                    maxJobPostings: 20
                }
            });
            console.log('✅ Organization created: Demo Corporation');
        } else {
            console.log('ℹ️ Organization already exists');
        }

        // 3. Create Customer Admin (linked to Org)
        console.log('\n--- Creating Customer Admin ---');
        let customerAdmin = await User.findOne({ email: 'customeradmin@demo.com' });
        if (!customerAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(PASSWORD, salt);
            customerAdmin = await User.create({
                username: 'Customer Admin',
                email: 'customeradmin@demo.com',
                password: hashedPassword,
                role: 'customer_admin',
                organizationId: org._id,
                status: 'active'
            });
            console.log('✅ Customer Admin created: customeradmin@demo.com');
        } else {
            console.log('ℹ️ Customer Admin already exists');
        }

        // 4. Create Recruiter (linked to Org)
        console.log('\n--- Creating Recruiter ---');
        let recruiter = await User.findOne({ email: 'recruiter@demo.com' });
        if (!recruiter) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(PASSWORD, salt);
            recruiter = await User.create({
                username: 'Recruiter Bob',
                email: 'recruiter@demo.com',
                password: hashedPassword,
                role: 'recruiter',
                organizationId: org._id,
                status: 'active'
            });
            console.log('✅ Recruiter created: recruiter@demo.com');
        } else {
            console.log('ℹ️ Recruiter already exists');
        }

        // 5. Create Candidate
        console.log('\n--- Creating Candidate ---');
        let candidate = await User.findOne({ email: 'candidate@demo.com' });
        if (!candidate) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(PASSWORD, salt);
            candidate = await User.create({
                username: 'Candidate Alice',
                email: 'candidate@demo.com',
                password: hashedPassword,
                role: 'candidate',
                status: 'active'
            });
            console.log('✅ Candidate created: candidate@demo.com');
        } else {
            console.log('ℹ️ Candidate already exists');
        }

        console.log('\n🎉 All demo users setup successfully!');
        console.log('Password for all accounts:', PASSWORD);
        process.exit(0);

    } catch (error) {
        console.error('Error setting up users:', error);
        process.exit(1);
    }
}

setupDemoUsers();
