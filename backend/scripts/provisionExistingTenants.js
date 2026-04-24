const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const { provisionTenantDatabase, dropTenantDatabase } = require('../utils/tenantProvisioner');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Re-provision ALL tenants so old ones get the new slug+id naming
  const tenants = await Tenant.find({});
  console.log(`Found ${tenants.length} tenant(s) to provision.\n`);

  for (const tenant of tenants) {
    process.stdout.write(`Provisioning "${tenant.businessName}" ... `);
    try {
      // Drop old database if it exists (renaming)
      if (tenant.databaseName) {
        await dropTenantDatabase(tenant.databaseName);
      }
      const dbName = await provisionTenantDatabase(tenant);
      tenant.databaseName = dbName;
      await tenant.save();
      console.log(`✅ ${dbName}`);
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
