const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'customer_admin', 'recruiter', 'candidate'], default: 'candidate' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');

        // Check if super admin already exists
        const existingAdmin = await User.findOne({ email: 'demo@123' });
        if (existingAdmin) {
            console.log('Super Admin with email demo@123 already exists!');
            console.log('User details:', {
                username: existingAdmin.username,
                email: existingAdmin.email,
                role: existingAdmin.role
            });
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('demo@123', salt);

        // Create super admin user
        const superAdmin = new User({
            username: 'superadmin',
            email: 'demo@123',
            password: hashedPassword,
            role: 'super_admin',
            status: 'active'
        });

        await superAdmin.save();
        console.log('✅ Super Admin created successfully!');
        console.log('Login credentials:');
        console.log('  Email: demo@123');
        console.log('  Password: demo@123');
        console.log('  Role: super_admin');

        process.exit(0);
    } catch (error) {
        console.error('Error creating super admin:', error.message);
        process.exit(1);
    }
}

createSuperAdmin();
