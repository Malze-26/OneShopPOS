/**
 * Seed script – creates an initial Manager account.
 * Run once: npx ts-node src/seed.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User';

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@oneshop.lk' });
  if (existing) {
    console.log('Seed user already exists – skipping');
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: 'Chamara Silva',
    email: 'admin@oneshop.lk',
    password: 'Admin@1234',
    role: 'Manager',
    storeId: 'STORE-2025-001',
    isActive: true,
  });

  console.log('✓ Seed user created: admin@oneshop.lk / Admin@1234');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
