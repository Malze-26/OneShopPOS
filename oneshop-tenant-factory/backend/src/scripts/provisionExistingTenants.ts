import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import { provisionTenantDatabase, dropTenantDatabase } from '../utils/tenantProvisioner';

const run = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to MongoDB');

  const tenants = await Tenant.find({});
  console.log(`Found ${tenants.length} tenant(s) to provision.\n`);

  for (const tenant of tenants) {
    process.stdout.write(`Provisioning "${tenant.businessName}" ... `);
    try {
      if (tenant.databaseName) {
        await dropTenantDatabase(tenant.databaseName);
      }
      const dbName = await provisionTenantDatabase(tenant);
      tenant.databaseName = dbName;
      await tenant.save();
      console.log(`✅ ${dbName}`);
    } catch (err) {
      console.log(`❌ Failed: ${(err as Error).message}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
