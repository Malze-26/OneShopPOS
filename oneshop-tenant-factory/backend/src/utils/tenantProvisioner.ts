import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ITenant } from '../models/Tenant';
import { HydratedDocument } from 'mongoose';

export interface ManagerCredentials {
  name: string;
  email: string;
  password: string;
}
export const PLAN_MAX_PRODUCTS: Record<string, number | null> = {
  basic: 100,
  premium: null, // null = unlimited
};

export const getMaxProductsForPlan = (plan?: string): number | null => {
  if (plan && plan in PLAN_MAX_PRODUCTS) {
    return PLAN_MAX_PRODUCTS[plan];
  }
  return 100; // default fallback
};

export const setManagerInTenantDb = async (
  dbName: string,
  storeId: string,
  manager: ManagerCredentials
): Promise<void> => {
  const uri = getTenantDbUri(dbName);
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const hashed = await bcrypt.hash(manager.password, 10);
    await conn.db!.collection('users').updateOne(
      { role: 'Manager' },
      {
        $set: {
          name: manager.name,
          email: manager.email.toLowerCase(),
          password: hashed,
          role: 'Manager',
          storeId,
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } finally {
    await conn.close();
  }
};

export const getManagerFromTenantDb = async (
  dbName: string
): Promise<{ name: string; email: string } | null> => {
  const uri = getTenantDbUri(dbName);
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const user = await conn.db!.collection('users').findOne(
      { role: 'Manager' },
      { projection: { name: 1, email: 1 } }
    );
    if (!user) return null;
    return { name: user.name, email: user.email };
  } finally {
    await conn.close();
  }
};

export const syncPlanToTenantDb = async (
  dbName: string,
  plan: string
): Promise<void> => {
  const uri = getTenantDbUri(dbName);
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    await conn.db!.collection('storesettings').updateOne(
      {},
      { $set: { subscriptionPlan: plan, maxProducts: getMaxProductsForPlan(plan), updatedAt: new Date() } }
    );
  } finally {
    await conn.close();
  }
};

const POS_COLLECTIONS = [
  'categories',
  'customers',
  'grns',
  'orders',
  'products',
  'promos',
  'stockhistories',
  'storesettings',
  'suppliers',
  'transactions',
  'users',
  'wishlists',
  'contactmessages',
  'reviews',
  'shippingdetails',
  'returnrefunds',
  'shippinginfos',
  'deliveryzones',
  'faqs',
  'carts',
];

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);

export const getTenantDbUri = (dbName: string): string => {
  const uri = process.env.MONGODB_URI!;
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\??.*$)/,
    `$1${dbName}$3`
  );
};

export const provisionTenantDatabase = async (
  tenant: HydratedDocument<ITenant>
): Promise<string> => {
  const slug = slugify(tenant.businessName);
  const dbName = `oneshop_${slug}`;
  const uri = getTenantDbUri(dbName);

  let conn: mongoose.Connection | undefined;
  try {
    conn = await mongoose.createConnection(uri).asPromise();

    const existing = await conn.db!.collection('storesettings').findOne({ storeId: tenant._id.toString() });
    if (existing) {
      console.warn(`⚠️  Database already exists, skipping: ${dbName}`);
      return dbName;
    }

    for (const collName of POS_COLLECTIONS) {
      try {
        await conn.db!.createCollection(collName);
      } catch (err) {
        if ((err as { codeName?: string }).codeName !== 'NamespaceExists') throw err;
      }
    }

    await conn.db!.collection('storesettings').insertOne({
      storeId: tenant._id.toString(),
      storeName: tenant.businessName,
      currency: 'LKR',
      currencyLocale: 'en-LK',
      address: tenant.businessAddress ?? '',
      phone: tenant.phoneNumber ?? '',
      email: tenant.email ?? '',
      logoUrl: tenant.logo ?? '',
      backgroundImageUrl: tenant.backgroundImage ?? '',
      primaryColor: tenant.primaryColor ?? '#155dfc',
      subscriptionPlan: tenant.subscription?.plan ?? 'basic',
      maxProducts: getMaxProductsForPlan(tenant.subscription?.plan),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Database provisioned: ${dbName}`);
    return dbName;
  } finally {
    if (conn) await conn.close();
  }
};

export const dropTenantDatabase = async (dbName: string): Promise<void> => {
  if (!dbName || !dbName.startsWith('oneshop_')) return;

  const uri = getTenantDbUri(dbName);
  let conn: mongoose.Connection | undefined;
  try {
    conn = await mongoose.createConnection(uri).asPromise();
    await conn.db!.dropDatabase();
    console.log(`🗑️  Database dropped: ${dbName}`);
  } finally {
    if (conn) await conn.close();
  }
};
