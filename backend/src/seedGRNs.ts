/**
 * Seed script – inserts sample GRN records and matching StockHistory entries.
 * Run once: npx ts-node -r tsconfig-paths/register src/seedGRNs.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from './models/Product';
import { GRN } from './models/GRN';
import { StockHistory } from './models/StockHistory';

const STORE_ID_FALLBACK = 'STORE-2025-001';

async function seedGRNs() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Resolve real storeId from DB
  let STORE_ID = STORE_ID_FALLBACK;
  const storeDoc = await mongoose.connection.db!.collection('storesettings').findOne({});
  if (storeDoc) {
    STORE_ID = storeDoc._id.toString();
    console.log(`Using store: ${storeDoc.storeName} (${STORE_ID})`);
  }

  const existing = await GRN.findOne({ grnNumber: 'GRN-2026-0001' });
  if (existing) {
    console.log('GRN records already exist – skipping');
    await mongoose.disconnect();
    return;
  }

  // Fetch products by SKU
  const skusNeeded = [
    'BEV-001', 'BEV-002', 'BEV-003',
    'DAI-001', 'DAI-004', 'CHF-007',
    'BEV-004', 'MLT-004', 'MLT-005', 'TEA-003',
    'VEG-001', 'VEG-002', 'VEG-003',
    'PRM-001', 'PRM-003', 'PRM-007',
    'FRZ-001', 'FRZ-002', 'FRZ-004', 'FRZ-006',
  ];

  const prodMap: Record<string, { _id: mongoose.Types.ObjectId; name: string; sku: string }> = {};
  for (const sku of skusNeeded) {
    const p = await Product.findOne({ sku }).lean();
    if (p) {
      prodMap[sku] = { _id: p._id as mongoose.Types.ObjectId, name: p.name, sku: p.sku };
    } else {
      console.warn(`  ⚠ Product not found: ${sku}`);
    }
  }

  interface GRNSeedItem { sku: string; qty: number; cost: number }
  interface GRNSeedRecord {
    grnNumber: string;
    supplier: string;
    referenceNumber: string;
    notes: string;
    items: GRNSeedItem[];
    receivedBy: string;
    createdAt: Date;
  }

  const records: GRNSeedRecord[] = [
    {
      grnNumber: 'GRN-2026-0001',
      supplier: 'Ceylon Beverages Ltd',
      referenceNumber: 'PO-2026-0023',
      notes: 'Weekly Monday delivery. All items in good condition.',
      items: [
        { sku: 'BEV-001', qty: 48, cost: 130 },
        { sku: 'BEV-002', qty: 36, cost: 125 },
        { sku: 'BEV-003', qty: 30, cost: 125 },
      ],
      receivedBy: 'mng01@opendoor.lk',
      createdAt: new Date('2026-01-15T09:30:00Z'),
    },
    {
      grnNumber: 'GRN-2026-0002',
      supplier: 'Anchor Foods Lanka',
      referenceNumber: 'PO-2026-0024',
      notes: 'Cold chain maintained. Checked on arrival.',
      items: [
        { sku: 'DAI-001', qty: 20, cost: 380 },
        { sku: 'DAI-004', qty: 30, cost: 260 },
        { sku: 'CHF-007', qty: 10, cost: 705 },
      ],
      receivedBy: 'mng01@opendoor.lk',
      createdAt: new Date('2026-01-22T10:15:00Z'),
    },
    {
      grnNumber: 'GRN-2026-0003',
      supplier: 'Nestlé Lanka PLC',
      referenceNumber: 'PO-2026-0035',
      notes: 'Monthly Nestlé restock. Invoice to be settled end of month.',
      items: [
        { sku: 'BEV-004', qty: 24, cost: 500 },
        { sku: 'MLT-004', qty: 10, cost: 1000 },
        { sku: 'MLT-005', qty: 15, cost: 580 },
        { sku: 'TEA-003', qty: 20, cost: 360 },
      ],
      receivedBy: 'mng01@opendoor.lk',
      createdAt: new Date('2026-02-05T08:45:00Z'),
    },
    {
      grnNumber: 'GRN-2026-0004',
      supplier: 'Fresh Harvest Suppliers',
      referenceNumber: 'PO-2026-0042',
      notes: 'Tuesday morning delivery. Potatoes slightly damp — stored in dry area.',
      items: [
        { sku: 'VEG-001', qty: 30, cost: 120 },
        { sku: 'VEG-002', qty: 40, cost: 100 },
        { sku: 'VEG-003', qty: 50, cost: 140 },
      ],
      receivedBy: 'nimal@opendoor.lk',
      createdAt: new Date('2026-02-18T07:20:00Z'),
    },
    {
      grnNumber: 'GRN-2026-0005',
      supplier: 'Keells Food Products',
      referenceNumber: 'PO-2026-0058',
      notes: 'Weekly chilled delivery. Temperature log verified.',
      items: [
        { sku: 'PRM-001', qty: 24, cost: 255 },
        { sku: 'PRM-003', qty: 20, cost: 280 },
        { sku: 'PRM-007', qty: 18, cost: 255 },
      ],
      receivedBy: 'mng01@opendoor.lk',
      createdAt: new Date('2026-03-10T11:00:00Z'),
    },
    {
      grnNumber: 'GRN-2026-0006',
      supplier: 'Island Frozen Foods',
      referenceNumber: 'PO-2026-0071',
      notes: 'Temperature-controlled delivery. Items moved to freezer immediately.',
      items: [
        { sku: 'FRZ-001', qty: 20, cost: 355 },
        { sku: 'FRZ-002', qty: 15, cost: 480 },
        { sku: 'FRZ-004', qty: 18, cost: 430 },
        { sku: 'FRZ-006', qty: 12, cost: 505 },
      ],
      receivedBy: 'mng01@opendoor.lk',
      createdAt: new Date('2026-04-02T09:00:00Z'),
    },
  ];

  const grnDocs = [];
  const historyDocs = [];
  const now = new Date();

  for (const rec of records) {
    const resolvedItems = rec.items
      .filter((it) => prodMap[it.sku])
      .map((it) => ({
        product:          prodMap[it.sku]._id,
        productName:      prodMap[it.sku].name,
        sku:              it.sku,
        quantityReceived: it.qty,
        costPrice:        it.cost,
        subtotal:         it.qty * it.cost,
      }));

    if (resolvedItems.length === 0) continue;

    const totalItems = resolvedItems.reduce((s, i) => s + i.quantityReceived, 0);
    const totalCost  = resolvedItems.reduce((s, i) => s + i.subtotal, 0);

    grnDocs.push({
      _id:             new mongoose.Types.ObjectId(),
      grnNumber:       rec.grnNumber,
      supplier:        rec.supplier,
      referenceNumber: rec.referenceNumber,
      notes:           rec.notes,
      items:           resolvedItems,
      totalItems,
      totalCost,
      receivedBy:      rec.receivedBy,
      storeId:         STORE_ID,
      createdAt:       rec.createdAt,
      updatedAt:       now,
    });

    for (const item of resolvedItems) {
      historyDocs.push({
        _id:       new mongoose.Types.ObjectId(),
        product:   item.product,
        type:      'add',
        quantity:  item.quantityReceived,
        reason:    `GRN: ${rec.grnNumber} — ${rec.supplier}`,
        by:        rec.receivedBy,
        storeId:   STORE_ID,
        createdAt: rec.createdAt,
        updatedAt: now,
      });
    }
  }

  await GRN.collection.insertMany(grnDocs);
  console.log(`✓ ${grnDocs.length} GRN records inserted`);

  await StockHistory.collection.insertMany(historyDocs);
  console.log(`✓ ${historyDocs.length} stock history entries inserted`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

seedGRNs().catch((err) => {
  console.error(err);
  process.exit(1);
});
