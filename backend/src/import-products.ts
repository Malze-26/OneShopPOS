import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { Product } from './models/Product';
import { User } from './models/User';

const JSON_PATH = path.resolve(
  'c:/Users/ASUS/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/1B1C4707B743111EAC8408D4CBA9D6F9601E0586/transfers/2026-17/OneShop.products.json'
);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB');

  const manager = await User.findOne({ email: 'mng01@opendoor.lk' });
  if (!manager) throw new Error('Manager not found — run seed first');

  const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

  let inserted = 0;
  let skipped = 0;

  for (const p of raw) {
    const exists = await Product.findOne({ sku: p.sku });
    if (exists) {
      skipped++;
      continue;
    }

    await Product.create({
      name:              p.name,
      sku:               p.sku,
      description:       p.description ?? '',
      sellingPrice:      p.sellingPrice,
      costPrice:         p.costPrice,
      stock:             p.stock,
      lowStockThreshold: p.lowStockThreshold ?? 10,
      category:          p.category,
      images:            p.images ?? [],
      storeId:           p.storeId ?? 'STORE-2025-001',
      isWeightBased:     p.isWeightBased ?? false,
      unit:              p.unit ?? 'item',
      createdBy:         manager._id,
    });
    inserted++;
  }

  console.log(`\nDone — inserted: ${inserted}, skipped (already exist): ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
