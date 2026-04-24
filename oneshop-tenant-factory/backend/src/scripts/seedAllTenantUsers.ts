/**
 * Seeds Manager and Cashier users into the existing databases for Fashion Hub,
 * Tech Store, and Book Mart. Safe to re-run — uses upsert so it will not
 * create duplicates.
 *
 * Run: npm run seed:tenant-users
 */

import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getTenantDbUri } from '../utils/tenantProvisioner';

interface UserSeed {
  name: string;
  email: string;
  password: string;
  role: 'Manager' | 'Cashier';
}

interface TenantConfig {
  label: string;
  dbName: string;
  users: UserSeed[];
}

const TENANTS: TenantConfig[] = [
  {
    label: 'Fashion Hub',
    dbName: 'oneshop_fashion_hub',
    users: [
      { name: 'Fashion Hub Manager', email: 'manager@fashionhub.com', password: 'Manager@FH2025', role: 'Manager' },
      { name: 'Fashion Hub Cashier', email: 'cashier@fashionhub.com', password: 'Cashier@FH2025', role: 'Cashier' },
    ],
  },
  {
    label: 'Tech Store',
    dbName: 'oneshop_tech_store',
    users: [
      { name: 'Tech Store Manager', email: 'manager@techstore.com', password: 'Manager@TS2025', role: 'Manager' },
      { name: 'Tech Store Cashier', email: 'cashier@techstore.com', password: 'Cashier@TS2025', role: 'Cashier' },
    ],
  },
  {
    label: 'Book Mart',
    dbName: 'oneshop_book_mart',
    users: [
      { name: 'Book Mart Manager', email: 'manager@bookmart.com', password: 'Manager@BM2025', role: 'Manager' },
      { name: 'Book Mart Cashier', email: 'cashier@bookmart.com', password: 'Cashier@BM2025', role: 'Cashier' },
    ],
  },
];

const seedTenant = async (config: TenantConfig): Promise<void> => {
  const uri = getTenantDbUri(config.dbName);
  const conn = await mongoose.createConnection(uri).asPromise();

  try {
    // Get storeId from the existing storesettings document
    const settings = await conn.db!.collection('storesettings').findOne({});
    const storeId: string = settings?.storeId ?? '';

    if (!storeId) {
      console.warn(`  ⚠️  No storesettings found in ${config.dbName} — storeId will be empty`);
    }

    for (const u of config.users) {
      const hashed = await bcrypt.hash(u.password, 12);
      const result = await conn.db!.collection('users').updateOne(
        { email: u.email.toLowerCase() },
        {
          $setOnInsert: {
            name: u.name,
            email: u.email.toLowerCase(),
            password: hashed,
            role: u.role,
            storeId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      const action = result.upsertedCount > 0 ? 'created' : 'already exists';
      console.log(`  ${result.upsertedCount > 0 ? '✅' : '⚠️ '} ${u.role.padEnd(8)} ${u.email.padEnd(32)} (${action})`);
    }
  } finally {
    await conn.close();
  }
};

const run = async (): Promise<void> => {
  for (const tenant of TENANTS) {
    console.log(`\n📦 ${tenant.label} (${tenant.dbName})`);
    await seedTenant(tenant);
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('✅ Done. Credentials summary:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Fashion Hub    manager@fashionhub.com    Manager@FH2025  (Manager)');
  console.log('Fashion Hub    cashier@fashionhub.com    Cashier@FH2025  (Cashier)');
  console.log('Tech Store     manager@techstore.com     Manager@TS2025  (Manager)');
  console.log('Tech Store     cashier@techstore.com     Cashier@TS2025  (Cashier)');
  console.log('Book Mart      manager@bookmart.com      Manager@BM2025  (Manager)');
  console.log('Book Mart      cashier@bookmart.com      Cashier@BM2025  (Cashier)');
  console.log('─────────────────────────────────────────────────────');

  process.exit(0);
};

run().catch((err: Error) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
