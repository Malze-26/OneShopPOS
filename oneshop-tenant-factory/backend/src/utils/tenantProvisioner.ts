import mongoose from 'mongoose';
import { ITenant } from '../models/Tenant';
import { HydratedDocument } from 'mongoose';

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
  const shortId = tenant._id.toString().slice(-8);
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
      primaryColor: tenant.primaryColor ?? '#155dfc',
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
