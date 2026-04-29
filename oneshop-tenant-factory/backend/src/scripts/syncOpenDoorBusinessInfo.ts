import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import { getTenantDbUri } from '../utils/tenantProvisioner';

const DB_NAME = 'oneshop_open_door';

const run = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to tenant factory DB');

  const tenant = await Tenant.findOne({ databaseName: DB_NAME });
  if (!tenant) {
    console.error('❌ Open Door tenant record not found in tenant factory DB');
    process.exit(1);
  }

  const uri = getTenantDbUri(DB_NAME);
  const conn = await mongoose.createConnection(uri).asPromise();
  console.log(`✅ Connected to ${DB_NAME}`);

  const settings = await conn.db!.collection('storesettings').findOne({});
  if (!settings) {
    console.error('❌ No storesettings document found in Open Door database');
    await conn.close();
    process.exit(1);
  }

  console.log('📋 Store settings found:', {
    storeName: settings.storeName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    primaryColor: settings.primaryColor,
    logoUrl: settings.logoUrl,
  });

  await Tenant.findByIdAndUpdate(tenant._id, {
    businessName: settings.storeName ?? tenant.businessName,
    businessAddress: settings.address ?? tenant.businessAddress,
    phoneNumber: settings.phone ?? tenant.phoneNumber,
    email: settings.email ?? tenant.email,
    logo: settings.logoUrl ?? tenant.logo,
    primaryColor: settings.primaryColor ?? tenant.primaryColor,
    updatedAt: new Date(),
  });

  console.log('✅ Open Door tenant record synced from store settings');

  await conn.close();
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
