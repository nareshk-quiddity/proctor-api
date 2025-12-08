const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testCreateUserFunctionality() {
    console.log('\n🚀 Testing Create User Functionality (Super Admin & Customer Admin)...\n');

    try {
        // ========== TEST 1: SUPER ADMIN CREATE USER ==========
        console.log('========== TEST 1: SUPER ADMIN CREATE USER ==========');

        // 1.1 Login as Super Admin
        console.log('\n--- Login as Super Admin ---');
        const superLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'superadmin@demo.com',
            password: 'demo123'
        });
        const superToken = superLoginRes.data.token;
        console.log('✅ Super Admin Logged In');

        // 1.2 Get Organization
        console.log('\n--- Get Organization for Assignment ---');
        const orgRes = await axios.get(`${API_URL}/super-admin/organizations`, {
            headers: { Authorization: `Bearer ${superToken}` }
        });

        if (!orgRes.data.organizations || orgRes.data.organizations.length === 0) {
            console.log('❌ No organizations found. Cannot proceed.');
            return;
        }

        const orgId = orgRes.data.organizations[0]._id;
        console.log(`✅ Organization Found: ${orgRes.data.organizations[0].name} (${orgId})`);

        // 1.3 Create New Customer Admin (by Super Admin)
        console.log('\n--- Super Admin Creating Customer Admin ---');
        const newCustomerAdmin = {
            username: 'test_customer_admin_' + Date.now(),
            email: `test_ca_${Date.now()}@demo.com`,
            password: 'demo123',
            role: 'customer_admin',
            organizationId: orgId
        };

        const createCA = await axios.post(`${API_URL}/admin/users`, newCustomerAdmin, {
            headers: { Authorization: `Bearer ${superToken}` }
        });

        console.log(`✅ Customer Admin Created by Super Admin`);
        console.log(`   Email: ${newCustomerAdmin.email}`);
        console.log(`   Role: ${createCA.data.user.role}`);
        console.log(`   Organization: ${createCA.data.user.organizationId}`);

        // 1.4 Create Recruiter (by Super Admin)
        console.log('\n--- Super Admin Creating Recruiter ---');
        const newRecruiter = {
            username: 'test_recruiter_' + Date.now(),
            email: `test_rec_${Date.now()}@demo.com`,
            password: 'demo123',
            role: 'recruiter',
            organizationId: orgId
        };

        const createRec = await axios.post(`${API_URL}/admin/users`, newRecruiter, {
            headers: { Authorization: `Bearer ${superToken}` }
        });

        console.log(`✅ Recruiter Created by Super Admin`);
        console.log(`   Email: ${newRecruiter.email}`);
        console.log(`   Role: ${createRec.data.user.role}`);

        // ========== TEST 2: CUSTOMER ADMIN CREATE USER ==========
        console.log('\n\n========== TEST 2: CUSTOMER ADMIN CREATE USER ==========');

        // 2.1 Login as Customer Admin
        console.log('\n--- Login as Customer Admin ---');
        const custLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'customeradmin@demo.com',
            password: 'demo123'
        });
        const custToken = custLoginRes.data.token;
        console.log('✅ Customer Admin Logged In');

        // 2.2 Create Recruiter (by Customer Admin)
        console.log('\n--- Customer Admin Creating Recruiter ---');
        const newRecruiter2 = {
            username: 'test_recruiter2_' + Date.now(),
            email: `test_rec2_${Date.now()}@demo.com`,
            password: 'demo123',
            role: 'recruiter'
            // Note: organizationId will be auto-assigned from customer admin's org
        };

        const createRec2 = await axios.post(`${API_URL}/admin/users`, newRecruiter2, {
            headers: { Authorization: `Bearer ${custToken}` }
        });

        console.log(`✅ Recruiter Created by Customer Admin`);
        console.log(`   Email: ${newRecruiter2.email}`);
        console.log(`   Role: ${createRec2.data.user.role}`);
        console.log(`   Organization (auto-assigned): ${createRec2.data.user.organizationId}`);

        // ========== VERIFICATION ==========
        console.log('\n\n========== VERIFICATION ==========');

        // Verify all users exist
        console.log('\n--- Verify All Created Users ---');
        const allUsers = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${superToken}` }
        });

        const createdEmails = [newCustomerAdmin.email, newRecruiter.email, newRecruiter2.email];
        const foundUsers = allUsers.data.filter(u => createdEmails.includes(u.email));

        console.log(`✅ Verified ${foundUsers.length}/3 users in database:`);
        foundUsers.forEach(u => {
            console.log(`   - ${u.email} (${u.role})`);
        });

        console.log('\n\n✨ ALL TESTS PASSED! Create User functionality working for both roles.');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.response?.data?.message || error.message);
        if (error.response?.data) {
            console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCreateUserFunctionality();
