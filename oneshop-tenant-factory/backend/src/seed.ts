import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import Tenant from './models/Tenant';

const seedDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB Connected');

    await User.deleteMany({});
    await Tenant.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);

    const superAdmin = await User.create({
      name: 'Platform Administrator',
      email: 'superadmin@oneshop.lk',
      password: hashedPassword,
      role: 'superadmin',
      isVerified: true,
      isActive: true,
    });
    console.log('✅ Super Admin created');

    await Tenant.create({
      businessName: 'Fashion Hub',
      businessAddress: '123 Main Street, Colombo',
      phoneNumber: '+94771234567',
      email: 'admin@fashionhub.com',
      primaryColor: '#8B5CF6',
      subscription: { plan: 'premium', status: 'active' },
      status: 'active',
      ownerId: superAdmin._id,
    });

    await Tenant.create({
      businessName: 'Tech Store',
      businessAddress: '456 Tech Avenue, Kandy',
      phoneNumber: '+94772345678',
      email: 'admin@techstore.com',
      primaryColor: '#3B82F6',
      subscription: { plan: 'basic', status: 'active' },
      status: 'active',
      ownerId: superAdmin._id,
    });

    await Tenant.create({
      businessName: 'Book Mart',
      businessAddress: '789 Book Lane, Galle',
      phoneNumber: '+94773456789',
      email: 'admin@bookmart.com',
      primaryColor: '#10B981',
      subscription: { plan: 'free', status: 'trial' },
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
