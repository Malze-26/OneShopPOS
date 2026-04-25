import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Tenant from '../models/Tenant';

const run = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to tenant factory DB');

  const existing = await Tenant.findOne({ databaseName: 'oneshop_open_door' });
  if (existing) {
    console.log('⚠️  Open Door tenant already exists — nothing inserted.');
    console.log(`   ID: ${existing._id}  |  DB: ${existing.databaseName}`);
    process.exit(0);
  }

  const tenant = await Tenant.create({
    businessName: 'OpenDoor',
    businessAddress: 'No 401, Main Street, Colombo 11',
    phoneNumber: '+94770000001',
    email: 'admin@opendoor.lk',
    logo: 'https://placehold.co/200x200/155dfc/ffffff?text=OD',
    backgroundImage: null,
    primaryColor: '#155dfc',
    subscription: { plan: 'premium', status: 'active' },
    status: 'active',
    databaseName: 'oneshop_open_door',
  });

  console.log('✅ Open Door tenant inserted.');
  console.log(`   ID: ${tenant._id}  |  DB: ${tenant.databaseName}`);
  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
