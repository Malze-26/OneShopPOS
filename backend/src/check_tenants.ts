import 'dotenv/config';
import mongoose from 'mongoose';

async function checkTenants() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(mongoUri);
  console.log('Connected to cluster');

  const factoryDbName = process.env.TENANT_FACTORY_DB || 'oneshop-tenant-factory';
  const factoryDb = mongoose.connection.useDb(factoryDbName);
  console.log(`Using factory DB: ${factoryDbName}`);

  const tenants = await factoryDb.collection('tenants').find({}).toArray();
  console.log('Tenants in factory:');
  tenants.forEach(t => {
    console.log(`- ${t.businessName} (${t.databaseName}) status: ${t.status}`);
  });

  await mongoose.disconnect();
}

checkTenants().catch(console.error);
