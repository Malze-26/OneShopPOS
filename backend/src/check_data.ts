import 'dotenv/config';
import mongoose from 'mongoose';

async function checkData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(mongoUri);
  console.log('Connected');

  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  for (const coll of ['products', 'orders', 'transactions', 'customers']) {
    const count = await db.collection(coll).countDocuments();
    console.log(`${coll} count: ${count}`);
  }

  await mongoose.disconnect();
}

checkData().catch(console.error);
