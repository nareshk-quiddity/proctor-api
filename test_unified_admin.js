const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testUnifiedAdminAccess() {
    console.log('\n🚀 Testing Unified Admin Access (Super Admin & Customer Admin)...\n');

    try {
        // 1. Login as Super Admin
        console.log('--- Testing Super Admin Access ---');
        const superRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'superadmin@demo.com',
            password: 'demo123'
        });
        const superToken = superRes.data.token;
        console.log('✅ Super Admin Logged In');

        // Test GET /api/admin/users
        const superUsers = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${superToken}` }
        });
        console.log(`✅ Super Admin accessed /admin/users (Count: ${superUsers.data.length})`);


        // 2. Login as Customer Admin
        console.log('\n--- Testing Customer Admin Access ---');
        const custRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'customeradmin@demo.com',
            password: 'demo123'
        });
        const custToken = custRes.data.token;
        console.log('✅ Customer Admin Logged In');

        // Test GET /api/admin/users
        const custUsers = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${custToken}` }
        });
        console.log(`✅ Customer Admin accessed /admin/users (Count: ${custUsers.data.length})`);

        console.log('\n✨ Unified Admin Access Verified Successfully!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.response?.data?.message || error.message);
    }
}

testUnifiedAdminAccess();
