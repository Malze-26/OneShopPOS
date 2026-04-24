const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Tenant = require('./models/Tenant');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing data
    await User.deleteMany({});
    await Tenant.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);

    // Create super admin
    const superAdmin = await User.create({
      name: 'Platform Administrator',
      email: 'superadmin@oneshop.lk',
      password: hashedPassword,
      role: 'superadmin',
      isVerified: true,
      isActive: true,
    });
    console.log('✅ Super Admin created');

    // Create sample tenants
    const tenant1 = await Tenant.create({
      businessName: 'Fashion Hub',
      businessAddress: '123 Main Street, Colombo',
      phoneNumber: '+94771234567',
      email: 'admin@fashionhub.com',
      primaryColor: '#8B5CF6',
      subscription: {
        plan: 'premium',
        status: 'active',
      },
      status: 'active',
      ownerId: superAdmin._id,
    });

    const tenant2 = await Tenant.create({
      businessName: 'Tech Store',
      businessAddress: '456 Tech Avenue, Kandy',
      phoneNumber: '+94772345678',
      email: 'admin@techstore.com',
      primaryColor: '#3B82F6',
      subscription: {
        plan: 'basic',
        status: 'active',
      },
      status: 'active',
      ownerId: superAdmin._id,
    });

    const tenant3 = await Tenant.create({
      businessName: 'Book Mart',
      businessAddress: '789 Book Lane, Galle',
      phoneNumber: '+94773456789',
      email: 'admin@bookmart.com',
      primaryColor: '#10B981',
      subscription: {
        plan: 'free',
        status: 'trial',
      },
      status: 'active',
      ownerId: superAdmin._id,
    });

    console.log('✅ Sample tenants created');
    console.log('\n📝 Login Credentials:');
    console.log('Email: superadmin@oneshop.lk');
    console.log('Password: SuperAdmin@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedDatabase();