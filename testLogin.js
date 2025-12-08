const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login with credentials:');
        console.log('Email: demo@123');
        console.log('Password: demo@123');
        console.log('');

        const response = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'demo@123',
            password: 'demo@123'
        });

        console.log('✅ Login successful!');
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        console.log('');
        console.log('Token:', response.data.token);
        console.log('Role:', response.data.role);
        console.log('User ID:', response.data.userId);

    } catch (error) {
        console.error('❌ Login failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error message:', error.response.data.message || error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin();
