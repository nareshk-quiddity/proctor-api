const axios = require('axios');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Organization = require('./models/Organization');
const mongoose = require('mongoose');
require('dotenv').config();

async function testCustomerAdminDelete() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected\n');

        // Step 1: Create a test organization
        console.log('1. Creating test organization...');
        let testOrg = await Organization.findOne({ name: 'Test Organization' });
        if (!testOrg) {
            testOrg = new Organization({
                name: 'Test Organization',
                domain: 'test.com',
                subscription: {
                    plan: 'freemium',
                    maxRecruiters: 10,
                    maxJobPostings: 20
                }
            });
            await testOrg.save();
        }
        console.log(`✅ Organization: ${testOrg.name} (${testOrg._id})\n`);

        // Step 2: Create a Customer Admin
        console.log('2. Creating Customer Admin...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('test123', salt);

        let customerAdmin = await User.findOne({ email: 'testcustomeradmin@test.com' });
        if (!customerAdmin) {
            customerAdmin = new User({
                username: 'testcustomeradmin',
                email: 'testcustomeradmin@test.com',
                password: hashedPassword,
                role: 'customer_admin',
                organizationId: testOrg._id
            });
            await customerAdmin.save();
        }
        console.log(`✅ Customer Admin: ${customerAdmin.username} (${customerAdmin._id})\n`);

        // Step 3: Create a test recruiter in the same organization
        console.log('3. Creating test recruiter...');
        let testRecruiter = await User.findOne({ email: 'testrecruiter@test.com' });
        if (!testRecruiter) {
            testRecruiter = new User({
                username: 'testrecruiter',
                email: 'testrecruiter@test.com',
                password: hashedPassword,
                role: 'recruiter',
                organizationId: testOrg._id
            });
            await testRecruiter.save();
        }
        console.log(`✅ Test Recruiter: ${testRecruiter.username} (${testRecruiter._id})\n`);

        // Step 4: Login as Customer Admin
        console.log('4. Logging in as Customer Admin...');
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'testcustomeradmin@test.com',
            password: 'test123'
        });
        const token = loginRes.data.token;
        console.log(`✅ Login successful! Token: ${token.substring(0, 20)}...\n`);

        // Step 5: Try to delete the recruiter
        console.log('5. Attempting to delete recruiter as Customer Admin...');
        try {
            const deleteRes = await axios.delete(`http://localhost:5001/api/admin/users/${testRecruiter._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Delete successful!');
            console.log('Response:', deleteRes.data);
            console.log('\n✨ Customer Admin delete functionality is WORKING!\n');
        } catch (deleteError) {
            console.error('❌ Delete failed!');
            console.error('Status:', deleteError.response?.status);
            console.error('Error:', deleteError.response?.data);
            console.log('\n⚠️  Customer Admin delete functionality is NOT working!\n');
        }

        // Cleanup
        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed!');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testCustomerAdminDelete();
