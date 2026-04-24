import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import Tenant from './models/Tenant';
import { provisionTenantDatabase, getTenantDbUri } from './utils/tenantProvisioner';

interface TenantUserSeed {
  name: string;
  email: string;
  password: string;
  role: 'Manager' | 'Cashier';
}

const seedUsersInTenantDb = async (
  dbName: string,
  storeId: string,
  users: TenantUserSeed[]
): Promise<void> => {
  if (users.length === 0) return;
  const uri = getTenantDbUri(dbName);
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 12);
      await conn.db!.collection('users').updateOne(
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
      console.log(`    ✅ ${u.role}: ${u.email}`);
    }
  } finally {
    await conn.close();
  }
};

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

    const tenantsData: Array<
      Parameters<typeof Tenant.create>[0] & {
        databaseName?: string;
        users?: TenantUserSeed[];
      }
    > = [
      {
        businessName: 'OpenDoor',
        businessAddress: 'No 401, Main Street, Colombo 11',
        phoneNumber: '+94770000001',
        email: 'admin@opendoor.lk',
        logo: 'https://placehold.co/200x200/155dfc/ffffff?text=OD',
        backgroundImage: null,
        primaryColor: '#155dfc',
        subscription: { plan: 'premium', status: 'active' },
        status: 'active',
        ownerId: superAdmin._id,
        // Points to the pre-existing database — provisioner will NOT be called
        databaseName: 'oneshop_open_door',
        users: [], // managed separately via updateOpenDoorSettings.ts
      },
      {
        businessName: 'Fashion Hub',
        businessAddress: '123 Main Street, Colombo',
        phoneNumber: '+94771234567',
        email: 'admin@fashionhub.com',
        logo: 'https://placehold.co/200x200/8B5CF6/ffffff?text=FH',
        backgroundImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80',
        primaryColor: '#8B5CF6',
        subscription: { plan: 'premium', status: 'active' },
        status: 'active',
        ownerId: superAdmin._id,
        users: [
          { name: 'Fashion Hub Manager', email: 'manager@fashionhub.com', password: 'Manager@FH2025', role: 'Manager' },
          { name: 'Fashion Hub Cashier', email: 'cashier@fashionhub.com', password: 'Cashier@FH2025', role: 'Cashier' },
        ],
      },
      {
        businessName: 'Tech Store',
        businessAddress: '456 Tech Avenue, Kandy',
        phoneNumber: '+94772345678',
        email: 'admin@techstore.com',
        logo: 'https://placehold.co/200x200/3B82F6/ffffff?text=TS',
        backgroundImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
        primaryColor: '#3B82F6',
        subscription: { plan: 'basic', status: 'active' },
        status: 'active',
        ownerId: superAdmin._id,
        users: [
          { name: 'Tech Store Manager', email: 'manager@techstore.com', password: 'Manager@TS2025', role: 'Manager' },
          { name: 'Tech Store Cashier', email: 'cashier@techstore.com', password: 'Cashier@TS2025', role: 'Cashier' },
        ],
      },
      {
        businessName: 'Book Mart',
        businessAddress: '789 Book Lane, Galle',
        phoneNumber: '+94773456789',
        email: 'admin@bookmart.com',
        logo: 'https://placehold.co/200x200/10B981/ffffff?text=BM',
        backgroundImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80',
        primaryColor: '#10B981',
        subscription: { plan: 'free', status: 'trial' },
        status: 'active',
        ownerId: superAdmin._id,
        users: [
          { name: 'Book Mart Manager', email: 'manager@bookmart.com', password: 'Manager@BM2025', role: 'Manager' },
          { name: 'Book Mart Cashier', email: 'cashier@bookmart.com', password: 'Cashier@BM2025', role: 'Cashier' },
        ],
      },
    ];

    for (const data of tenantsData) {
      const { databaseName: presetDbName, users, ...tenantFields } = data;
      const tenant = await Tenant.create(tenantFields);

      let dbName: string;
      if (presetDbName) {
        tenant.databaseName = presetDbName;
        await tenant.save();
        dbName = presetDbName;
        console.log(`✅ Tenant linked to existing database: ${presetDbName}`);
      } else {
        dbName = await provisionTenantDatabase(tenant);
        tenant.databaseName = dbName;
        await tenant.save();
      }

      if (users && users.length > 0) {
        console.log(`  👥 Seeding users for ${(tenantFields as { businessName: string }).businessName}...`);
        await seedUsersInTenantDb(dbName, tenant._id.toString(), users);
      }
    }

    console.log('\n✅ Sample tenants created and databases provisioned');
    console.log('\n📝 Login Credentials:');
    console.log('─────────────────────────────────────────────────────');
    console.log('Super Admin:    superadmin@oneshop.lk     SuperAdmin@123');
    console.log('─────────────────────────────────────────────────────');
    console.log('Fashion Hub     manager@fashionhub.com    Manager@FH2025  (Manager)');
    console.log('Fashion Hub     cashier@fashionhub.com    Cashier@FH2025  (Cashier)');
    console.log('Tech Store      manager@techstore.com     Manager@TS2025  (Manager)');
    console.log('Tech Store      cashier@techstore.com     Cashier@TS2025  (Cashier)');
    console.log('Book Mart       manager@bookmart.com      Manager@BM2025  (Manager)');
    console.log('Book Mart       cashier@bookmart.com      Cashier@BM2025  (Cashier)');
    console.log('─────────────────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedDatabase();
