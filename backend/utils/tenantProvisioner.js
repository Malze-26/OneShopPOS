const mongoose = require('mongoose');

// All collections that exist in the POS (oneshop) database
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
];

// Swap the database name in the MongoDB URI
const getTenantDbUri = (dbName) => {
  const uri = process.env.MONGODB_URI;
  // Matches: mongodb(+srv)://[credentials@]host/DBNAME[?options]
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\??.*$)/,
    `$1${dbName}$3`
  );
};

/**
 * Provisions a fresh database for a new tenant.
 * Creates all POS collections and seeds StoreSettings with the tenant's info.
 * Returns the database name on success.
 */
const provisionTenantDatabase = async (tenant) => {
  const dbName = `tenant_${tenant._id}`;
  const uri = getTenantDbUri(dbName);

  let conn;
  try {
    conn = await mongoose.createConnection(uri).asPromise();

    // Create every POS collection (empty)
    for (const collName of POS_COLLECTIONS) {
      try {
        await conn.db.createCollection(collName);
      } catch (err) {
        // NamespaceExists means it already exists — safe to ignore
        if (err.codeName !== 'NamespaceExists') throw err;
      }
    }

    // Seed StoreSettings so the tenant's POS app starts with their business info
    await conn.db.collection('storesettings').insertOne({
      storeId: tenant._id.toString(),
      storeName: tenant.businessName,
      currency: 'LKR',
      currencyLocale: 'en-LK',
      address: tenant.businessAddress || '',
      phone: tenant.phoneNumber || '',
      email: tenant.email || '',
      logoUrl: tenant.logo || '',
      primaryColor: tenant.primaryColor || '#155dfc',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Database provisioned: ${dbName}`);
    return dbName;
  } finally {
    if (conn) await conn.close();
  }
};

/**
 * Drops the tenant's database entirely.
 * Only acts on databases prefixed with "tenant_" as a safety guard.
 */
const dropTenantDatabase = async (dbName) => {
  if (!dbName || !dbName.startsWith('tenant_')) return;

  const uri = getTenantDbUri(dbName);
  let conn;
  try {
    conn = await mongoose.createConnection(uri).asPromise();
    await conn.db.dropDatabase();
    console.log(`🗑️  Database dropped: ${dbName}`);
  } finally {
    if (conn) await conn.close();
  }
};

module.exports = { provisionTenantDatabase, dropTenantDatabase };
