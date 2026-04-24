const mongoose = require('mongoose');
require('dotenv').config();

const TARGET_DB = 'tenant_open_door_92e635ab';

const getUri = (dbName) =>
  process.env.MONGODB_URI.replace(
    /(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\??.*$)/,
    `$1${dbName}$3`
  );

const run = async () => {
  // Connect to the source (OneShop) database
  const sourceConn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
  const sourceDb = sourceConn.db;
  console.log(`✅ Connected to source: ${sourceDb.databaseName}`);

  // Connect to the Open Door tenant database
  const targetConn = await mongoose.createConnection(getUri(TARGET_DB)).asPromise();
  const targetDb = targetConn.db;
  console.log(`✅ Connected to target: ${TARGET_DB}\n`);

  // Get all collections from OneShop (excluding tenant management collections)
  const skipCollections = new Set(['tenants', 'users_admin']);
  const collections = await sourceDb.listCollections().toArray();
  const collectionNames = collections
    .map((c) => c.name)
    .filter((n) => !skipCollections.has(n));

  console.log(`Copying ${collectionNames.length} collections...\n`);

  for (const name of collectionNames) {
    const docs = await sourceDb.collection(name).find({}).toArray();

    if (docs.length === 0) {
      try { await targetDb.createCollection(name); } catch (_) {}
      console.log(`  ${name}: 0 docs (empty collection created)`);
      continue;
    }

    // Clear existing data in the target collection and insert fresh
    await targetDb.collection(name).deleteMany({});
    await targetDb.collection(name).insertMany(docs);
    console.log(`  ${name}: ${docs.length} docs copied`);
  }

  await sourceConn.close();
  await targetConn.close();
  console.log('\n✅ Open Door database seeded from OneShop successfully.');
};

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
