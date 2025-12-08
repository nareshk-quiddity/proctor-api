const axios = require('axios');

async function testDeleteFunctionality() {
    try {
        // First, login to get token
        console.log('1. Logging in as Super Admin...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'demo@123',
            password: 'demo@123'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful');
        console.log('Token:', token.substring(0, 20) + '...');
        console.log('Role:', loginRes.data.role);
        console.log('');

        // Get all users
        console.log('2. Fetching all users...');
        const usersRes = await axios.get('http://localhost:5000/api/admin/users', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Found ${usersRes.data.length} users`);
        console.log('Users:');
        usersRes.data.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.email}) - Role: ${user.role} - ID: ${user._id}`);
        });
        console.log('');

        // Try to delete a user (find a non-super-admin user)
        const userToDelete = usersRes.data.find(u => u.role !== 'super_admin' && u._id !== loginRes.data.userId);

        if (userToDelete) {
            console.log(`3. Attempting to delete user: ${userToDelete.username} (${userToDelete.role})...`);
            try {
                const deleteRes = await axios.delete(`http://localhost:5000/api/admin/users/${userToDelete._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Delete successful!');
                console.log('Response:', deleteRes.data);
            } catch (deleteError) {
                console.error('❌ Delete failed!');
                console.error('Status:', deleteError.response?.status);
                console.error('Error:', deleteError.response?.data);
            }
        } else {
            console.log('⚠️  No suitable user found to delete (need a non-super-admin user)');
        }

    } catch (error) {
        console.error('❌ Test failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testDeleteFunctionality();
