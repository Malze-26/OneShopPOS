import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BASE_URI: string = process.env.MONGODB_URI!;

const getUri = (dbName: string): string =>
  BASE_URI.replace(/(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\??.*$)/, `$1${dbName}$3`);

const run = async (): Promise<void> => {
  const sourceUri = getUri('oneshop-tenant-factory');
  const targetUri = getUri('super_user');

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log('✅ Connected to oneshop-tenant-factory (source)');

  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log('✅ Connected to super_user (target)');

  // Migrate tenants
  const tenants = await sourceConn.db!.collection('tenants').find({}).toArray();
  if (tenants.length > 0) {
    await targetConn.db!.collection('tenants').deleteMany({});
    await targetConn.db!.collection('tenants').insertMany(tenants);
    console.log(`✅ Migrated ${tenants.length} tenant(s) to super_user`);
  } else {
    console.log('⚠️  No tenants found in source — skipping tenant migration');
  }

  // Migrate existing superadmin users (if any)
  const existingUsers = await sourceConn.db!.collection('users').find({ role: 'superadmin' }).toArray();
  if (existingUsers.length > 0) {
    for (const user of existingUsers) {
      await targetConn.db!.collection('users').updateOne(
        { email: user.email },
        { $setOnInsert: user },
        { upsert: true }
      );
    }
    console.log(`✅ Migrated ${existingUsers.length} superadmin user(s) to super_user`);
  } else {
    // No existing superadmin — create a fresh one
    console.log('⚠️  No superadmin found in source — creating default superadmin in super_user');
    const hashed = await bcrypt.hash('SuperAdmin@123', 10);
    await targetConn.db!.collection('users').updateOne(
      { email: 'superadmin@oneshop.lk' },
      {
        $setOnInsert: {
          name: 'Platform Administrator',
          email: 'superadmin@oneshop.lk',
          password: hashed,
          role: 'superadmin',
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log('✅ Default superadmin created in super_user');
  }

  await sourceConn.close();
  await targetConn.close();

  console.log('\n🎉 Migration complete. Update your .env MONGODB_URI to use super_user.');
  console.log(`   New URI: ${targetUri}`);
  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
