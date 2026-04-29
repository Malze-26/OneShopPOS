import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import { syncPlanToTenantDb } from '../utils/tenantProvisioner';

const run = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to super_user DB');

  const tenants = await Tenant.find({ databaseName: { $ne: null } });
  console.log(`Found ${tenants.length} tenant(s) to backfill\n`);

  for (const tenant of tenants) {
    const plan = tenant.subscription?.plan ?? 'basic';
    try {
      await syncPlanToTenantDb(tenant.databaseName!, plan);
      console.log(`✅ ${tenant.businessName} → subscriptionPlan: "${plan}"`);
    } catch (err) {
      console.error(`❌ ${tenant.businessName}: ${(err as Error).message}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
