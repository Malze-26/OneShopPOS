import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { getTenantDbUri } from '../utils/tenantProvisioner';

const DB_NAME = 'oneshop_open_door';

const run = async (): Promise<void> => {
  const uri = getTenantDbUri(DB_NAME);
  const conn = await mongoose.createConnection(uri).asPromise();
  console.log(`✅ Connected to ${DB_NAME}`);

  const result = await conn.db!.collection('storesettings').updateOne(
    {},
    {
      $set: {
        storeName: 'OpenDoor',
        address: 'No 401, Main Street, Colombo 11',
        email: 'admin@opendoor.lk',
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    console.warn('⚠️  No storesettings document found — inserting one.');
    await conn.db!.collection('storesettings').insertOne({
      storeName: 'OpenDoor',
      currency: 'LKR',
      currencyLocale: 'en-LK',
      address: 'No 401, Main Street, Colombo 11',
      phone: '+94770000001',
      email: 'admin@opendoor.lk',
      logoUrl: '',
      primaryColor: '#155dfc',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ storesettings document inserted.');
  } else {
    console.log(`✅ storesettings updated (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
  }

  await conn.close();
  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
