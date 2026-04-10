/**
 * One-time migration script
 * Backfills customerId on existing transactions by matching customer name
 *
 * Run from your backend folder:
 *   npx ts-node src/scripts/migrate-customer-ids.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ── Inline schemas (avoid circular import issues in scripts) ──────────────────
const customerSchema = new mongoose.Schema({
  name:     String,
  storeId:  String,
});

const transactionSchema = new mongoose.Schema({
  customer:   String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  storeId:    String,
});

const Customer   = mongoose.model('Customer',   customerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

async function migrate() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('❌ No MONGODB_URI found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // Get all transactions that don't have a customerId yet
  const transactions = await Transaction.find({ customerId: { $exists: false } });
  console.log(`📋 Found ${transactions.length} transactions without customerId\n`);

  if (transactions.length === 0) {
    console.log('✅ Nothing to migrate. All transactions already linked.');
    await mongoose.disconnect();
    return;
  }

  // Load all customers into a name → _id map for fast lookup
  const customers = await Customer.find({});
  const nameMap = new Map<string, mongoose.Types.ObjectId>();
  customers.forEach((c) => {
    if (c.name) nameMap.set(c.name.toLowerCase().trim(), c._id as mongoose.Types.ObjectId);
  });
  console.log(`👥 Loaded ${customers.length} customers into lookup map\n`);

  let matched   = 0;
  let unmatched = 0;

  for (const txn of transactions) {
    const customerName = (txn.customer as string)?.toLowerCase().trim();

    if (!customerName || customerName === 'guest customer') {
      unmatched++;
      continue;
    }

    const customerId = nameMap.get(customerName);

    if (customerId) {
      await Transaction.updateOne(
        { _id: txn._id },
        { $set: { customerId } }
      );
      matched++;
      console.log(`  ✓ Linked "${txn.customer}" → ${customerId}`);
    } else {
      unmatched++;
      console.log(`  ✗ No customer found for "${txn.customer}"`);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migration complete
   Linked:    ${matched} transactions
   Skipped:   ${unmatched} (guest or no match)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});