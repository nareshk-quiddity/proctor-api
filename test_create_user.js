const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testCreateUser() {
    console.log('\n🚀 Testing Create User Functionality...\n');

    try {
        // 1. Login as Super Admin
        console.log('--- Login as Super Admin ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'superadmin@demo.com',
            password: 'demo123'
        });
        const token = loginRes.data.token;
        console.log('✅ Super Admin Logged In');

        // 1.5 Get Organization
        console.log('--- Get Organization ---');
        const orgRes = await axios.get(`${API_URL}/super-admin/organizations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const orgId = orgRes.data[0]._id;
        console.log(`✅ Organization Found: ${orgId}`);

        // 2. Create New Customer Admin
        console.log('\n--- Create New Customer Admin ---');
        const newUserData = {
            username: 'new_admin_' + Date.now(),
            email: `new_admin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'customer_admin',
            organizationId: orgId
        };

        const createRes = await axios.post(`${API_URL}/admin/users`, newUserData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (createRes.status === 200) {
            console.log(`✅ User Created Successfully: ${newUserData.email}`);
            console.log(`   Role: ${createRes.data.user.role}`);
        }

        // 3. Verify User Exists
        console.log('\n--- Verify User in List ---');
        const listRes = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const found = listRes.data.find(u => u.email === newUserData.email);
        if (found) {
            console.log('✅ Verified: User found in database list');
        } else {
            console.log('❌ Error: User not found in list');
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error.response?.data?.message || error.message);
    }
}

testCreateUser();
