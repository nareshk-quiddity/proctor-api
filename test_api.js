const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAuth() {
    try {
        console.log('--- Testing Authentication ---');

        // 1. Register Super Admin
        const superAdminData = {
            username: 'superadmin_' + Date.now(),
            email: `superadmin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'super_admin'
        };

        console.log('Registering Super Admin...');
        const registerRes = await axios.post(`${API_URL}/auth/register`, superAdminData);
        console.log('Super Admin Registered:', registerRes.data.user.email);
        let token = registerRes.data.token;

        // 2. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: superAdminData.email,
            password: superAdminData.password
        });
        console.log('Login Successful, Token received');
        token = loginRes.data.token; // Ensure we use the fresh login token

        // 3. Create Organization (Super Admin only)
        console.log('Creating Organization...');
        const orgData = {
            name: 'Test Corp ' + Date.now(),
            domain: `test${Date.now()}.com`,
            subscription: {
                plan: 'enterprise',
                maxRecruiters: 5,
                maxJobPostings: 10
            }
        };

        const orgRes = await axios.post(`${API_URL}/super-admin/organizations`, orgData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Organization Created:', orgRes.data.name);
        const orgId = orgRes.data._id;

        // 4. Create Recruiter (Org Admin/Super Admin)
        // Note: Usually Org Admin does this, but Super Admin might have permissions too or we switch users.
        // For simplicity, let's try to register a recruiter directly if the public register endpoint allows it, 
        // or use the org-admin route if we were an org admin.
        // Based on authRoutes.js, public register allows specifying role/orgId? 
        // Let's check if we can register a recruiter publicly for now or if we need to use the invite route.
        // The previous implementation of authRoutes.js might allow it.

        console.log('--- Tests Completed Successfully ---');

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testAuth();
