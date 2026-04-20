/**
 * Seed script – creates initial Manager, cashier employees, categories, and sample products.
 * Run once: npm run seed
 *
 * Images are automatically downloaded from Unsplash on first run and stored in uploads/products/.
 * Subsequent runs skip already-existing files and update image refs on products that missed them.
 */
import 'dotenv/config';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Category } from './models/Category';
import { Product } from './models/Product';
import { Customer } from './models/Customer';
import { Order } from './models/Order';
import { StoreSettings } from './models/StoreSettings';

const STORE_ID = 'STORE-2025-001';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'products');

// ── Image downloader ──────────────────────────────────────────────────────────

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      return resolve(); // already on disk
    }

    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(dest); } catch { /* ignore */ }
        return downloadImage(res.headers.location!, dest).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch { /* ignore */ }
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (err) => { try { fs.unlinkSync(dest); } catch { /* ignore */ } reject(err); });
    });

    request.on('error', (err) => { try { fs.unlinkSync(dest); } catch { /* ignore */ } reject(err); });
    request.setTimeout(20000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Seed image manifest ───────────────────────────────────────────────────────
// Images from Unsplash (free to use under Unsplash License)

const SEED_IMAGES: Record<string, string> = {
  'seed-BEV-001.jpg': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80',
  'seed-BEV-002.jpg': 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=600&q=80',
  'seed-BEV-003.jpg': 'https://images.unsplash.com/photo-1602984588656-09a9dfd7d9b7?w=600&q=80',
  'seed-BEV-004.jpg': 'https://images.unsplash.com/photo-1641149644265-1d303833b51c?w=600&q=80',
  'seed-SNK-001.jpg': 'https://images.unsplash.com/photo-1741520149938-4f08654780ef?w=600&q=80',
  'seed-SNK-002.jpg': 'https://images.unsplash.com/photo-1565958076205-896314b3cf38?w=600&q=80',
  'seed-SNK-003.jpg': 'https://images.unsplash.com/photo-1700339062616-11c7fc9a673d?w=600&q=80',
  'seed-SNK-004.jpg': 'https://images.unsplash.com/photo-1639430539438-acaa7a95b679?w=600&q=80',
  'seed-DAI-001.jpg': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80',
  'seed-DAI-002.jpg': 'https://images.unsplash.com/photo-1534706936160-d5ee67737249?w=600&q=80',
  'seed-CLN-001.jpg': 'https://images.unsplash.com/photo-1616622236995-cb00e537365e?w=600&q=80',
  'seed-CRE-001.jpg': 'https://images.unsplash.com/photo-1606226286071-946bf3aa4f27?w=600&q=80',
  'seed-CRE-002.jpg': 'https://images.unsplash.com/photo-1711779187508-a8fac1c18be9?w=600&q=80',
  'seed-GRN-001.jpg': 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&q=80',
  'seed-PAN-001.jpg': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
};

async function downloadSeedImages(): Promise<void> {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  console.log('\nDownloading seed images…');
  for (const [filename, url] of Object.entries(SEED_IMAGES)) {
    const dest = path.join(UPLOADS_DIR, filename);
    const already = fs.existsSync(dest);
    try {
      await downloadImage(url, dest);
      console.log(already ? `  (skip) ${filename}` : `✓ ${filename}`);
    } catch (err) {
      console.warn(`  ⚠ Could not download ${filename}: ${(err as Error).message}`);
    }
  }
}

// ── Main seed ─────────────────────────────────────────────────────────────────

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // ── 0. Download seed images ─────────────────────────────────────────────────
  await downloadSeedImages();

  // ── 1. Seed Manager ────────────────────────────────────────────────────────
  let admin = await User.findOne({ email: 'admin@oneshop.lk' });
  if (!admin) {
    admin = await User.create({
      name: 'Chamara Silva',
      email: 'admin@oneshop.lk',
      password: 'Admin@1234',
      role: 'Manager',
      storeId: STORE_ID,
      isActive: true,
    });
    console.log('\n✓ Manager created: admin@oneshop.lk / Admin@1234');
  } else {
    console.log('\n  Manager already exists – skipping');
  }

  // ── 2. Seed Cashiers ───────────────────────────────────────────────────────
  const cashiers = [
    { name: 'Nimal Silva',          email: 'nimal@store.com',   phone: '+94 77 234 5678', isActive: true  },
    { name: 'Saman Fernando',       email: 'saman@store.com',   phone: '+94 77 345 6789', isActive: true  },
    { name: 'Dilani Rajapaksa',     email: 'dilani@store.com',  phone: '+94 77 456 7890', isActive: false },
    { name: 'Priya Wickramasinghe', email: 'priya@store.com',   phone: '+94 77 567 8901', isActive: true  },
    { name: 'Ravi Jayawardena',     email: 'ravi@store.com',    phone: '+94 77 678 9012', isActive: false },
  ];

  for (const c of cashiers) {
    const exists = await User.findOne({ email: c.email });
    if (!exists) {
      await User.create({ ...c, password: 'Cashier@1234', role: 'Cashier', storeId: STORE_ID });
      console.log(`✓ Cashier created: ${c.email}`);
    } else {
      console.log(`  Cashier ${c.email} already exists – skipping`);
    }
  }

  // ── 3. Seed Categories ─────────────────────────────────────────────────────
  // Structured around Keells Super taxonomy, scaled down for a small business.
  // Subcategories that are too granular at small scale are merged into their parent.
  const categories = [
    // ── Fresh & Perishables ──────────────────────────────────────────────────
    { name: 'Vegetables',           icon: '🥦', color: '#16a34a' }, // fresh produce
    { name: 'Fruits',               icon: '🍎', color: '#f97316' }, // fresh produce
    { name: 'Meat & Poultry',       icon: '🥩', color: '#dc2626' }, // red meats + poultry
    { name: 'Processed Meats',      icon: '🥓', color: '#b45309' }, // sausages, ham, salami, etc.
    { name: 'Seafood',              icon: '🐟', color: '#0ea5e9' }, // fresh & frozen seafood
    { name: 'Dairy & Eggs',         icon: '🥛', color: '#12b76a' }, // milk, cheese, yoghurt, eggs
    { name: 'Chilled Food',         icon: '🧀', color: '#06b6d4' }, // cream, spreads, chilled desserts
    { name: 'Frozen Food',          icon: '🧊', color: '#0284c7' }, // frozen meals, ice cream, frozen veg
    // ── Beverages ────────────────────────────────────────────────────────────
    { name: 'Soft Drinks & Water',  icon: '🥤', color: '#3b82f6' }, // carbonated drinks, water
    { name: 'Tea & Coffee',         icon: '☕', color: '#92400e' }, // loose leaf, bags, instant coffee
    { name: 'Juices & Cordials',    icon: '🧃', color: '#65a30d' }, // fruit juices, cordials
    { name: 'Malt & Milk Drinks',   icon: '🍫', color: '#78350f' }, // Milo, Horlicks, powdered milk
    // ── Grocery & Pantry ─────────────────────────────────────────────────────
    { name: 'Rice & Grains',        icon: '🌾', color: '#f59e0b' }, // rice, pulses, oats, cereals
    { name: 'Flour & Baking',       icon: '🧁', color: '#d97706' }, // flour, sugar, baking mixes, yeast
    { name: 'Pasta & Noodles',      icon: '🍝', color: '#fb923c' }, // pasta, instant noodles
    { name: 'Canned & Preserved',   icon: '🥫', color: '#6366f1' }, // canned fish, soups, preserved food
    { name: 'Sauces & Condiments',  icon: '🫙', color: '#7c3aed' }, // sauces, oils, vinegar, coconut cream
    { name: 'Snacks & Biscuits',    icon: '🍿', color: '#f79009' }, // chips, crackers, biscuits, nuts
    { name: 'Confectionery',        icon: '🍬', color: '#ec4899' }, // chocolates, sweets, jams, honey
    { name: 'Bakery',               icon: '🍞', color: '#ca8a04' }, // bread, buns, pastries
    // ── Household & Personal ─────────────────────────────────────────────────
    { name: 'Personal Care',        icon: '🧴', color: '#ee46bc' }, // soap, shampoo, deodorant, skincare
    { name: 'Oral Care',            icon: '🪥', color: '#22d3ee' }, // toothpaste, toothbrush, mouthwash
    { name: 'Cleaning & Laundry',   icon: '🧹', color: '#155dfc' }, // detergent, disinfectants, mops
    { name: 'Baby Products',        icon: '👶', color: '#f472b6' }, // baby food, diapers, wipes
    { name: 'Pet Care',             icon: '🐾', color: '#84cc16' }, // pet food, accessories
    { name: 'Kitchen & Dining',     icon: '🍽️', color: '#475569' }, // utensils, containers, tissue
  ];

  for (const cat of categories) {
    const exists = await Category.findOne({ name: cat.name, storeId: STORE_ID });
    if (!exists) {
      await Category.create({ ...cat, storeId: STORE_ID });
      console.log(`✓ Category created: ${cat.name}`);
    } else {
      console.log(`  Category "${cat.name}" already exists – skipping`);
    }
  }

  // ── 4. Seed Products ───────────────────────────────────────────────────────
  const products = [
    // ── Soft Drinks & Water ──────────────────────────────────────────────────
    { name: 'Coca-Cola 500ml',                  sku: 'BEV-001', category: 'Soft Drinks & Water',  sellingPrice: 180,  costPrice: 130,  stock: 120, lowStockThreshold: 20, description: 'Classic Coca-Cola carbonated soft drink',    images: ['/uploads/products/seed-BEV-001.jpg'] },
    { name: 'Pepsi 500ml',                      sku: 'BEV-002', category: 'Soft Drinks & Water',  sellingPrice: 175,  costPrice: 125,  stock: 95,  lowStockThreshold: 20, description: 'Pepsi cola carbonated soft drink',            images: ['/uploads/products/seed-BEV-002.jpg'] },
    { name: 'Sprite 500ml',                     sku: 'BEV-003', category: 'Soft Drinks & Water',  sellingPrice: 175,  costPrice: 125,  stock: 8,   lowStockThreshold: 20, description: 'Sprite lemon-lime carbonated soft drink',     images: ['/uploads/products/seed-BEV-003.jpg'] },
    { name: 'Aqua Bottled Water 1.5L',          sku: 'SDW-001', category: 'Soft Drinks & Water',  sellingPrice: 120,  costPrice: 80,   stock: 120, lowStockThreshold: 30, description: 'Pure drinking water' },
    { name: 'EH Cream Soda 400ml',              sku: 'SDW-002', category: 'Soft Drinks & Water',  sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 20, description: 'Elephant House cream soda' },
    // ── Malt & Milk Drinks ───────────────────────────────────────────────────
    { name: 'Nestlé Milo 400g',                 sku: 'BEV-004', category: 'Malt & Milk Drinks',   sellingPrice: 650,  costPrice: 500,  stock: 45,  lowStockThreshold: 10, description: 'Chocolate malt drink powder',                  images: ['/uploads/products/seed-BEV-004.jpg'] },
    { name: 'Horlicks Original 500g',           sku: 'MLT-001', category: 'Malt & Milk Drinks',   sellingPrice: 850,  costPrice: 630,  stock: 20,  lowStockThreshold: 8,  description: 'Classic malt drink powder' },
    { name: 'Nestomalt 400g',                   sku: 'MLT-002', category: 'Malt & Milk Drinks',   sellingPrice: 480,  costPrice: 355,  stock: 30,  lowStockThreshold: 8,  description: 'Nutritious malt drink' },
    { name: 'Ovaltine 400g',                    sku: 'MLT-003', category: 'Malt & Milk Drinks',   sellingPrice: 720,  costPrice: 540,  stock: 20,  lowStockThreshold: 6,  description: 'Malt and milk drink powder' },
    { name: 'Nestlé Milo 1kg',                  sku: 'MLT-004', category: 'Malt & Milk Drinks',   sellingPrice: 1350, costPrice: 1000, stock: 15,  lowStockThreshold: 5,  description: 'Chocolate malt drink powder large pack' },
    { name: 'Nestlé Nespray Milk 400g',         sku: 'MLT-005', category: 'Malt & Milk Drinks',   sellingPrice: 780,  costPrice: 580,  stock: 25,  lowStockThreshold: 6,  description: 'Full cream powdered milk' },
    { name: 'Anchor Milk Powder 400g',          sku: 'MLT-006', category: 'Malt & Milk Drinks',   sellingPrice: 820,  costPrice: 610,  stock: 20,  lowStockThreshold: 6,  description: 'New Zealand full cream milk powder' },
    { name: 'Highland Milk Powder 400g',        sku: 'MLT-007', category: 'Malt & Milk Drinks',   sellingPrice: 680,  costPrice: 505,  stock: 25,  lowStockThreshold: 6,  description: 'Fortified milk powder' },
    // ── Tea & Coffee ─────────────────────────────────────────────────────────
    { name: 'Dilmah Tea Bags 50s',              sku: 'TEA-001', category: 'Tea & Coffee',          sellingPrice: 390,  costPrice: 290,  stock: 40,  lowStockThreshold: 10, description: 'Premium Ceylon tea bags' },
    { name: 'Lipton Yellow Label Tea 100g',     sku: 'TEA-002', category: 'Tea & Coffee',          sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Classic black tea leaves' },
    { name: 'Nescafé Classic 50g',              sku: 'TEA-003', category: 'Tea & Coffee',          sellingPrice: 480,  costPrice: 360,  stock: 30,  lowStockThreshold: 8,  description: 'Instant coffee' },
    { name: 'Nescafé 3-in-1 Sachets 10s',      sku: 'TEA-004', category: 'Tea & Coffee',          sellingPrice: 320,  costPrice: 235,  stock: 50,  lowStockThreshold: 12, description: 'Instant coffee with milk and sugar' },
    { name: 'Dilmah Pure Green Tea 25s',        sku: 'TEA-005', category: 'Tea & Coffee',          sellingPrice: 420,  costPrice: 310,  stock: 30,  lowStockThreshold: 8,  description: 'Pure Ceylon green tea bags' },
    { name: 'Bru Instant Coffee 50g',           sku: 'TEA-006', category: 'Tea & Coffee',          sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Aromatic instant coffee' },
    { name: 'Heladiv Tea Bags 50s',             sku: 'TEA-007', category: 'Tea & Coffee',          sellingPrice: 360,  costPrice: 265,  stock: 30,  lowStockThreshold: 8,  description: 'Premium Ceylon black tea bags' },
    { name: 'Laojee Pure Ceylon Tea 200g',      sku: 'TEA-008', category: 'Tea & Coffee',          sellingPrice: 480,  costPrice: 355,  stock: 25,  lowStockThreshold: 6,  description: 'Traditional Ceylon loose leaf tea' },
    // ── Juices & Cordials ────────────────────────────────────────────────────
    { name: 'Kist Mango Juice 200ml',           sku: 'JUS-001', category: 'Juices & Cordials',     sellingPrice: 85,   costPrice: 60,   stock: 72,  lowStockThreshold: 20, description: 'Mango flavoured juice drink' },
    { name: 'Cowhead Orange Juice 1L',          sku: 'JUS-002', category: 'Juices & Cordials',     sellingPrice: 480,  costPrice: 360,  stock: 25,  lowStockThreshold: 8,  description: '100% orange juice' },
    { name: 'Ribena Blackcurrant 500ml',        sku: 'JUS-003', category: 'Juices & Cordials',     sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 8,  description: 'Blackcurrant cordial' },
    { name: 'Kist Guava Juice 200ml',           sku: 'JUS-004', category: 'Juices & Cordials',     sellingPrice: 85,   costPrice: 60,   stock: 60,  lowStockThreshold: 15, description: 'Guava flavoured juice drink' },
    { name: 'Minute Maid Pulpy Orange 350ml',   sku: 'JUS-005', category: 'Juices & Cordials',     sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Orange juice with pulp' },
    { name: 'Kist Passion Fruit Cordial 750ml', sku: 'JUS-006', category: 'Juices & Cordials',     sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Passion fruit cordial concentrate' },
    { name: 'Tropicana Apple Juice 200ml',      sku: 'JUS-007', category: 'Juices & Cordials',     sellingPrice: 150,  costPrice: 110,  stock: 50,  lowStockThreshold: 12, description: '100% apple juice' },
    { name: 'Real Fruit Power Mixed 200ml',     sku: 'JUS-008', category: 'Juices & Cordials',     sellingPrice: 120,  costPrice: 85,   stock: 55,  lowStockThreshold: 15, description: 'Mixed fruit juice drink' },
    // ── Dairy & Eggs ─────────────────────────────────────────────────────────
    { name: 'Anchor Butter 200g',               sku: 'DAI-001', category: 'Dairy & Eggs',          sellingPrice: 490,  costPrice: 380,  stock: 25,  lowStockThreshold: 10, description: 'Pure New Zealand butter',                      images: ['/uploads/products/seed-DAI-001.jpg'] },
    { name: 'Eggs Tray of 12',                  sku: 'DAI-003', category: 'Dairy & Eggs',          sellingPrice: 380,  costPrice: 280,  stock: 40,  lowStockThreshold: 10, description: 'Fresh farm eggs' },
    { name: 'Anchor Full Cream Milk 1L',        sku: 'DAI-004', category: 'Dairy & Eggs',          sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Fresh pasteurised full cream milk' },
    { name: 'Buffalo Curd 400g',                sku: 'DAI-005', category: 'Dairy & Eggs',          sellingPrice: 220,  costPrice: 160,  stock: 25,  lowStockThreshold: 8,  description: 'Natural buffalo curd' },
    { name: 'Anchor Unsalted Butter 200g',      sku: 'DAI-006', category: 'Dairy & Eggs',          sellingPrice: 510,  costPrice: 390,  stock: 20,  lowStockThreshold: 6,  description: 'Unsalted pure butter' },
    { name: 'Nestlé Fresh Milk 500ml',          sku: 'DAI-007', category: 'Dairy & Eggs',          sellingPrice: 195,  costPrice: 145,  stock: 30,  lowStockThreshold: 10, description: 'Fresh pasteurised milk' },
    { name: 'Eggs Half Dozen',                  sku: 'DAI-008', category: 'Dairy & Eggs',          sellingPrice: 200,  costPrice: 145,  stock: 50,  lowStockThreshold: 12, description: 'Fresh farm eggs pack of 6' },
    { name: 'Cow Milk 1L Pack',                 sku: 'DAI-009', category: 'Dairy & Eggs',          sellingPrice: 280,  costPrice: 205,  stock: 30,  lowStockThreshold: 8,  description: 'Fresh local cow milk' },
    { name: 'Margarine 250g',                   sku: 'DAI-010', category: 'Dairy & Eggs',          sellingPrice: 280,  costPrice: 205,  stock: 30,  lowStockThreshold: 8,  description: 'Vegetable fat spread' },
    // ── Chilled Food ─────────────────────────────────────────────────────────
    { name: 'Anchor Cheese Slices 200g',        sku: 'CHF-001', category: 'Chilled Food',          sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 6,  description: 'Processed cheese slices' },
    { name: 'Nestlé Yoghurt 100g',              sku: 'CHF-002', category: 'Chilled Food',          sellingPrice: 120,  costPrice: 85,   stock: 35,  lowStockThreshold: 10, description: 'Flavoured yoghurt' },
    { name: 'Anchor Cooking Cream 200ml',       sku: 'CHF-003', category: 'Chilled Food',          sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Cooking cream for curries and desserts' },
    { name: 'Laughing Cow Cream Cheese 133g',   sku: 'CHF-004', category: 'Chilled Food',          sellingPrice: 680,  costPrice: 505,  stock: 15,  lowStockThreshold: 5,  description: 'Creamy spreadable cheese triangles' },
    { name: 'Kotmale Greek Yoghurt 150g',       sku: 'CHF-005', category: 'Chilled Food',          sellingPrice: 180,  costPrice: 130,  stock: 25,  lowStockThreshold: 8,  description: 'Thick Greek-style yoghurt' },
    { name: 'Elle & Vire Whipping Cream 200ml', sku: 'CHF-006', category: 'Chilled Food',          sellingPrice: 480,  costPrice: 355,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh whipping cream' },
    { name: 'Anchor Mozzarella Block 250g',     sku: 'CHF-007', category: 'Chilled Food',          sellingPrice: 950,  costPrice: 705,  stock: 10,  lowStockThreshold: 4,  description: 'Fresh mozzarella cheese block' },
    { name: 'Chilled Butter Cake Slice',        sku: 'CHF-008', category: 'Chilled Food',          sellingPrice: 150,  costPrice: 105,  stock: 20,  lowStockThreshold: 6,  description: 'Freshly baked chilled butter cake' },
    { name: 'Kotmale Strawberry Yoghurt 100g',  sku: 'CHF-009', category: 'Chilled Food',          sellingPrice: 110,  costPrice: 78,   stock: 30,  lowStockThreshold: 8,  description: 'Strawberry flavoured yoghurt' },
    // ── Frozen Food ──────────────────────────────────────────────────────────
    { name: 'EH Vanilla Ice Cream 500ml',       sku: 'DAI-002', category: 'Frozen Food',           sellingPrice: 580,  costPrice: 430,  stock: 18,  lowStockThreshold: 6,  description: 'Creamy vanilla ice cream',                     images: ['/uploads/products/seed-DAI-002.jpg'] },
    { name: 'Frozen Fish Fingers 300g',         sku: 'FRZ-001', category: 'Frozen Food',           sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Ready-to-cook breaded fish fingers' },
    { name: 'McCain French Fries 750g',         sku: 'FRZ-002', category: 'Frozen Food',           sellingPrice: 650,  costPrice: 480,  stock: 15,  lowStockThreshold: 5,  description: 'Straight cut frozen fries' },
    { name: 'EH Chocolate Ice Cream 500ml',     sku: 'FRZ-003', category: 'Frozen Food',           sellingPrice: 580,  costPrice: 430,  stock: 15,  lowStockThreshold: 5,  description: 'Rich chocolate ice cream' },
    { name: 'Frozen Chicken Nuggets 300g',      sku: 'FRZ-004', category: 'Frozen Food',           sellingPrice: 580,  costPrice: 430,  stock: 18,  lowStockThreshold: 5,  description: 'Ready-to-fry chicken nuggets' },
    { name: 'Frozen Mixed Vegetables 500g',     sku: 'FRZ-005', category: 'Frozen Food',           sellingPrice: 320,  costPrice: 235,  stock: 20,  lowStockThreshold: 6,  description: 'Mixed peas, corn and carrots' },
    { name: 'Frozen Prawns 250g',               sku: 'FRZ-006', category: 'Frozen Food',           sellingPrice: 680,  costPrice: 505,  stock: 15,  lowStockThreshold: 5,  description: 'Cleaned and deveined frozen prawns' },
    { name: 'EH Strawberry Ice Cream 500ml',    sku: 'FRZ-007', category: 'Frozen Food',           sellingPrice: 580,  costPrice: 430,  stock: 12,  lowStockThreshold: 4,  description: 'Strawberry flavoured ice cream' },
    { name: 'Frozen Roti 5pc',                  sku: 'FRZ-008', category: 'Frozen Food',           sellingPrice: 220,  costPrice: 160,  stock: 25,  lowStockThreshold: 8,  description: 'Ready-to-cook frozen roti' },
    // ── Vegetables ───────────────────────────────────────────────────────────
    { name: 'Carrot 1kg',                       sku: 'VEG-001', category: 'Vegetables',            sellingPrice: 180,  costPrice: 120,  stock: 50,  lowStockThreshold: 15, description: 'Fresh local carrots' },
    { name: 'Tomato 1kg',                       sku: 'VEG-002', category: 'Vegetables',            sellingPrice: 150,  costPrice: 100,  stock: 60,  lowStockThreshold: 15, description: 'Fresh ripe tomatoes' },
    { name: 'Potato 1kg',                       sku: 'VEG-003', category: 'Vegetables',            sellingPrice: 200,  costPrice: 140,  stock: 80,  lowStockThreshold: 20, description: 'Fresh local potatoes' },
    { name: 'Leeks 500g',                       sku: 'VEG-004', category: 'Vegetables',            sellingPrice: 120,  costPrice: 80,   stock: 40,  lowStockThreshold: 12, description: 'Fresh leeks' },
    { name: 'Cabbage 1kg',                      sku: 'VEG-005', category: 'Vegetables',            sellingPrice: 100,  costPrice: 65,   stock: 50,  lowStockThreshold: 15, description: 'Fresh white cabbage' },
    { name: 'Capsicum 500g',                    sku: 'VEG-006', category: 'Vegetables',            sellingPrice: 180,  costPrice: 120,  stock: 35,  lowStockThreshold: 10, description: 'Fresh bell peppers' },
    { name: 'Brinjal 500g',                     sku: 'VEG-007', category: 'Vegetables',            sellingPrice: 120,  costPrice: 80,   stock: 40,  lowStockThreshold: 10, description: 'Fresh brinjal (eggplant)' },
    { name: 'Bitter Gourd 500g',                sku: 'VEG-008', category: 'Vegetables',            sellingPrice: 130,  costPrice: 85,   stock: 35,  lowStockThreshold: 10, description: 'Fresh bitter gourd (karawila)' },
    { name: 'Pumpkin 1kg',                      sku: 'VEG-009', category: 'Vegetables',            sellingPrice: 90,   costPrice: 58,   stock: 40,  lowStockThreshold: 10, description: 'Fresh pumpkin' },
    { name: 'Drumstick 500g',                   sku: 'VEG-010', category: 'Vegetables',            sellingPrice: 110,  costPrice: 72,   stock: 30,  lowStockThreshold: 8,  description: 'Fresh moringa drumsticks' },
    // ── Fruits ───────────────────────────────────────────────────────────────
    { name: 'Banana bunch ~1kg',                sku: 'FRT-001', category: 'Fruits',                sellingPrice: 150,  costPrice: 100,  stock: 40,  lowStockThreshold: 10, description: 'Fresh ripe bananas' },
    { name: 'Apple Imported 1kg',               sku: 'FRT-002', category: 'Fruits',                sellingPrice: 480,  costPrice: 350,  stock: 30,  lowStockThreshold: 10, description: 'Imported fresh apples' },
    { name: 'Papaya 1kg',                       sku: 'FRT-003', category: 'Fruits',                sellingPrice: 120,  costPrice: 80,   stock: 25,  lowStockThreshold: 8,  description: 'Fresh ripe papaya' },
    { name: 'Watermelon 1kg',                   sku: 'FRT-004', category: 'Fruits',                sellingPrice: 80,   costPrice: 52,   stock: 20,  lowStockThreshold: 5,  description: 'Fresh sweet watermelon' },
    { name: 'Mango 1kg',                        sku: 'FRT-005', category: 'Fruits',                sellingPrice: 280,  costPrice: 200,  stock: 25,  lowStockThreshold: 8,  description: 'Fresh ripe mangoes' },
    { name: 'Pineapple each',                   sku: 'FRT-006', category: 'Fruits',                sellingPrice: 180,  costPrice: 120,  stock: 20,  lowStockThreshold: 6,  description: 'Fresh whole pineapple' },
    { name: 'Grapes Imported 500g',             sku: 'FRT-007', category: 'Fruits',                sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Imported seedless grapes' },
    { name: 'Orange Imported 1kg',              sku: 'FRT-008', category: 'Fruits',                sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Imported navel oranges' },
    { name: 'Avocado each',                     sku: 'FRT-009', category: 'Fruits',                sellingPrice: 120,  costPrice: 80,   stock: 20,  lowStockThreshold: 6,  description: 'Fresh ripe avocado' },
    // ── Meat & Poultry ───────────────────────────────────────────────────────
    { name: 'Chicken Whole 1kg',                sku: 'MET-001', category: 'Meat & Poultry',        sellingPrice: 850,  costPrice: 630,  stock: 20,  lowStockThreshold: 5,  description: 'Fresh whole chicken' },
    { name: 'Chicken Breast 500g',              sku: 'MET-002', category: 'Meat & Poultry',        sellingPrice: 550,  costPrice: 400,  stock: 25,  lowStockThreshold: 8,  description: 'Boneless chicken breast' },
    { name: 'Beef 500g',                        sku: 'MET-003', category: 'Meat & Poultry',        sellingPrice: 700,  costPrice: 520,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh beef cuts' },
    { name: 'Chicken Drumsticks 500g',          sku: 'MET-004', category: 'Meat & Poultry',        sellingPrice: 420,  costPrice: 310,  stock: 20,  lowStockThreshold: 6,  description: 'Fresh chicken drumsticks' },
    { name: 'Chicken Wings 500g',               sku: 'MET-005', category: 'Meat & Poultry',        sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Fresh chicken wings' },
    { name: 'Pork 500g',                        sku: 'MET-006', category: 'Meat & Poultry',        sellingPrice: 650,  costPrice: 480,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh pork cuts' },
    { name: 'Mutton 500g',                      sku: 'MET-007', category: 'Meat & Poultry',        sellingPrice: 950,  costPrice: 705,  stock: 10,  lowStockThreshold: 4,  description: 'Fresh mutton cuts' },
    { name: 'Chicken Liver 250g',               sku: 'MET-008', category: 'Meat & Poultry',        sellingPrice: 220,  costPrice: 160,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh chicken liver' },
    // ── Processed Meats ──────────────────────────────────────────────────────
    { name: 'EH Chicken Sausages 200g',         sku: 'PRM-001', category: 'Processed Meats',       sellingPrice: 350,  costPrice: 255,  stock: 30,  lowStockThreshold: 8,  description: 'Elephant House chicken sausages' },
    { name: 'Prima Ham 100g',                   sku: 'PRM-002', category: 'Processed Meats',       sellingPrice: 280,  costPrice: 205,  stock: 25,  lowStockThreshold: 8,  description: 'Sliced cooked ham' },
    { name: 'EH Beef Sausages 200g',            sku: 'PRM-003', category: 'Processed Meats',       sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Elephant House beef sausages' },
    { name: 'Prima Bacon 100g',                 sku: 'PRM-004', category: 'Processed Meats',       sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Streaky bacon strips' },
    { name: 'EH Luncheon Meat 340g',            sku: 'PRM-005', category: 'Processed Meats',       sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Canned luncheon meat' },
    { name: 'Prima Chicken Salami 100g',        sku: 'PRM-006', category: 'Processed Meats',       sellingPrice: 320,  costPrice: 235,  stock: 20,  lowStockThreshold: 6,  description: 'Sliced chicken salami' },
    { name: 'EH Pork Sausages 200g',            sku: 'PRM-007', category: 'Processed Meats',       sellingPrice: 350,  costPrice: 255,  stock: 20,  lowStockThreshold: 6,  description: 'Pork cocktail sausages' },
    { name: 'Chicken Frankfurters 200g',        sku: 'PRM-008', category: 'Processed Meats',       sellingPrice: 340,  costPrice: 250,  stock: 25,  lowStockThreshold: 8,  description: 'Chicken frankfurter sausages' },
    { name: 'Corned Beef 340g',                 sku: 'PRM-009', category: 'Processed Meats',       sellingPrice: 520,  costPrice: 385,  stock: 15,  lowStockThreshold: 5,  description: 'Canned corned beef' },
    // ── Seafood ──────────────────────────────────────────────────────────────
    { name: 'Fresh Tuna 500g',                  sku: 'SEA-001', category: 'Seafood',               sellingPrice: 600,  costPrice: 440,  stock: 20,  lowStockThreshold: 5,  description: 'Fresh yellowfin tuna' },
    { name: 'Tiger Prawns 250g',                sku: 'SEA-002', category: 'Seafood',               sellingPrice: 750,  costPrice: 550,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh tiger prawns' },
    { name: 'Dried Fish Karawala 250g',         sku: 'SEA-003', category: 'Seafood',               sellingPrice: 400,  costPrice: 295,  stock: 30,  lowStockThreshold: 8,  description: 'Dried salted fish' },
    { name: 'Fresh Salmon 300g',                sku: 'SEA-004', category: 'Seafood',               sellingPrice: 1200, costPrice: 890,  stock: 10,  lowStockThreshold: 3,  description: 'Fresh Atlantic salmon fillet' },
    { name: 'Squid 500g',                       sku: 'SEA-005', category: 'Seafood',               sellingPrice: 550,  costPrice: 405,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh cleaned squid' },
    { name: 'Crab 500g',                        sku: 'SEA-006', category: 'Seafood',               sellingPrice: 800,  costPrice: 590,  stock: 10,  lowStockThreshold: 3,  description: 'Fresh local crab' },
    { name: 'Sprats 250g',                      sku: 'SEA-007', category: 'Seafood',               sellingPrice: 280,  costPrice: 205,  stock: 25,  lowStockThreshold: 8,  description: 'Fresh small sprats (Salaya)' },
    { name: 'Prawns Small 250g',                sku: 'SEA-008', category: 'Seafood',               sellingPrice: 480,  costPrice: 355,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh small prawns (Isso)' },
    // ── Rice & Grains ─────────────────────────────────────────────────────────
    { name: 'Araliya Basmati Rice 1kg',         sku: 'GRN-001', category: 'Rice & Grains',         sellingPrice: 380,  costPrice: 290,  stock: 80,  lowStockThreshold: 20, description: 'Premium long-grain basmati rice',              images: ['/uploads/products/seed-GRN-001.jpg'] },
    { name: 'Keeri Samba Rice 5kg',             sku: 'RCG-001', category: 'Rice & Grains',         sellingPrice: 1200, costPrice: 900,  stock: 30,  lowStockThreshold: 8,  description: 'Premium Sri Lankan short-grain rice' },
    { name: 'Red Raw Rice 5kg',                 sku: 'RCG-002', category: 'Rice & Grains',         sellingPrice: 950,  costPrice: 700,  stock: 35,  lowStockThreshold: 8,  description: 'Nutritious red raw rice' },
    { name: 'Quaker Oats 500g',                 sku: 'RCG-003', category: 'Rice & Grains',         sellingPrice: 280,  costPrice: 205,  stock: 40,  lowStockThreshold: 10, description: 'Rolled oats' },
    { name: 'Samba Rice 5kg',                   sku: 'RCG-004', category: 'Rice & Grains',         sellingPrice: 1050, costPrice: 780,  stock: 30,  lowStockThreshold: 8,  description: 'White samba rice' },
    { name: 'Pachchaperumal Rice 5kg',          sku: 'RCG-005', category: 'Rice & Grains',         sellingPrice: 1100, costPrice: 820,  stock: 25,  lowStockThreshold: 6,  description: 'Traditional Sri Lankan rice variety' },
    { name: 'Red Lentils 500g',                 sku: 'RCG-006', category: 'Rice & Grains',         sellingPrice: 280,  costPrice: 205,  stock: 40,  lowStockThreshold: 10, description: 'Dhal (red lentils)' },
    { name: 'Green Gram 500g',                  sku: 'RCG-007', category: 'Rice & Grains',         sellingPrice: 260,  costPrice: 190,  stock: 35,  lowStockThreshold: 10, description: 'Whole green gram (Moong)' },
    { name: 'Black-eyed Peas 500g',             sku: 'RCG-008', category: 'Rice & Grains',         sellingPrice: 240,  costPrice: 175,  stock: 30,  lowStockThreshold: 8,  description: 'Dried black-eyed peas' },
    // ── Flour & Baking ───────────────────────────────────────────────────────
    { name: 'Prima Flour 1kg',                  sku: 'FLB-001', category: 'Flour & Baking',        sellingPrice: 250,  costPrice: 185,  stock: 50,  lowStockThreshold: 15, description: 'All-purpose wheat flour' },
    { name: 'White Sugar 1kg',                  sku: 'FLB-002', category: 'Flour & Baking',        sellingPrice: 280,  costPrice: 210,  stock: 60,  lowStockThreshold: 15, description: 'Refined white sugar' },
    { name: 'Brown Sugar 500g',                 sku: 'FLB-003', category: 'Flour & Baking',        sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Unrefined brown sugar' },
    { name: 'Baking Powder 100g',               sku: 'FLB-004', category: 'Flour & Baking',        sellingPrice: 120,  costPrice: 85,   stock: 40,  lowStockThreshold: 10, description: 'Leavening agent for baking' },
    { name: 'Baking Soda 200g',                 sku: 'FLB-005', category: 'Flour & Baking',        sellingPrice: 95,   costPrice: 65,   stock: 40,  lowStockThreshold: 10, description: 'Sodium bicarbonate for baking' },
    { name: 'Dried Yeast 10g',                  sku: 'FLB-006', category: 'Flour & Baking',        sellingPrice: 80,   costPrice: 55,   stock: 50,  lowStockThreshold: 12, description: 'Instant dried yeast sachet' },
    { name: 'Coconut Milk Powder 50g',          sku: 'FLB-007', category: 'Flour & Baking',        sellingPrice: 95,   costPrice: 65,   stock: 45,  lowStockThreshold: 12, description: 'Instant coconut milk powder sachet' },
    { name: 'Vanilla Essence 25ml',             sku: 'FLB-008', category: 'Flour & Baking',        sellingPrice: 120,  costPrice: 85,   stock: 35,  lowStockThreshold: 10, description: 'Pure vanilla essence for baking' },
    // ── Pasta & Noodles ──────────────────────────────────────────────────────
    { name: 'Maggi Noodles 78g',                sku: 'NDL-001', category: 'Pasta & Noodles',       sellingPrice: 120,  costPrice: 85,   stock: 80,  lowStockThreshold: 20, description: 'Instant chicken noodles' },
    { name: 'Indomie Mi Goreng 80g',            sku: 'NDL-002', category: 'Pasta & Noodles',       sellingPrice: 140,  costPrice: 100,  stock: 60,  lowStockThreshold: 15, description: 'Indonesian fried noodles' },
    { name: 'Penne Pasta 500g',                 sku: 'NDL-003', category: 'Pasta & Noodles',       sellingPrice: 280,  costPrice: 200,  stock: 30,  lowStockThreshold: 8,  description: 'Italian penne pasta' },
    { name: 'Spaghetti 500g',                   sku: 'NDL-004', category: 'Pasta & Noodles',       sellingPrice: 280,  costPrice: 200,  stock: 30,  lowStockThreshold: 8,  description: 'Italian spaghetti pasta' },
    { name: 'Noodles Vermicelli 200g',          sku: 'NDL-005', category: 'Pasta & Noodles',       sellingPrice: 120,  costPrice: 85,   stock: 50,  lowStockThreshold: 12, description: 'Thin rice vermicelli noodles' },
    { name: 'Maggi Beef Noodles 78g',           sku: 'NDL-006', category: 'Pasta & Noodles',       sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 15, description: 'Instant beef flavoured noodles' },
    { name: 'Kottu Noodles 400g',               sku: 'NDL-007', category: 'Pasta & Noodles',       sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Sri Lankan kottu-style noodles' },
    { name: 'Fusilli Pasta 500g',               sku: 'NDL-008', category: 'Pasta & Noodles',       sellingPrice: 280,  costPrice: 200,  stock: 25,  lowStockThreshold: 8,  description: 'Spiral fusilli pasta' },
    // ── Canned & Preserved ───────────────────────────────────────────────────
    { name: 'Soya Meat 100g',                   sku: 'PAN-001', category: 'Canned & Preserved',    sellingPrice: 145,  costPrice: 100,  stock: 70,  lowStockThreshold: 20, description: 'Textured soy protein chunks',                  images: ['/uploads/products/seed-PAN-001.jpg'] },
    { name: 'Mackerel in Brine 425g',           sku: 'CAN-001', category: 'Canned & Preserved',    sellingPrice: 320,  costPrice: 230,  stock: 45,  lowStockThreshold: 10, description: 'Canned mackerel fish' },
    { name: 'Green Peas Canned 400g',           sku: 'CAN-002', category: 'Canned & Preserved',    sellingPrice: 280,  costPrice: 200,  stock: 35,  lowStockThreshold: 8,  description: 'Canned green peas' },
    { name: 'Tomato Paste 135g',                sku: 'CAN-003', category: 'Canned & Preserved',    sellingPrice: 150,  costPrice: 105,  stock: 50,  lowStockThreshold: 12, description: 'Concentrated tomato paste' },
    { name: 'Tuna in Brine 185g',               sku: 'CAN-004', category: 'Canned & Preserved',    sellingPrice: 280,  costPrice: 205,  stock: 40,  lowStockThreshold: 10, description: 'Canned tuna chunks in brine' },
    { name: 'Sardines in Tomato Sauce 425g',    sku: 'CAN-005', category: 'Canned & Preserved',    sellingPrice: 290,  costPrice: 210,  stock: 35,  lowStockThreshold: 8,  description: 'Canned sardines in tomato sauce' },
    { name: 'Chickpeas Canned 400g',            sku: 'CAN-006', category: 'Canned & Preserved',    sellingPrice: 260,  costPrice: 190,  stock: 30,  lowStockThreshold: 8,  description: 'Ready-to-use canned chickpeas' },
    { name: 'Maldive Fish Flakes 100g',         sku: 'CAN-007', category: 'Canned & Preserved',    sellingPrice: 280,  costPrice: 205,  stock: 40,  lowStockThreshold: 10, description: 'Dried Maldive fish flakes (Umbalakada)' },
    { name: 'Baked Beans 420g',                 sku: 'CAN-008', category: 'Canned & Preserved',    sellingPrice: 280,  costPrice: 205,  stock: 30,  lowStockThreshold: 8,  description: 'Baked beans in tomato sauce' },
    // ── Sauces & Condiments ──────────────────────────────────────────────────
    { name: 'Maggi Soy Sauce 625ml',            sku: 'SAU-001', category: 'Sauces & Condiments',   sellingPrice: 380,  costPrice: 280,  stock: 35,  lowStockThreshold: 10, description: 'Light soy sauce' },
    { name: 'Harischandra Chilli Sauce 400g',   sku: 'SAU-002', category: 'Sauces & Condiments',   sellingPrice: 280,  costPrice: 200,  stock: 40,  lowStockThreshold: 10, description: 'Hot chilli sauce' },
    { name: 'Araliya Coconut Cream 400ml',      sku: 'SAU-003', category: 'Sauces & Condiments',   sellingPrice: 180,  costPrice: 130,  stock: 50,  lowStockThreshold: 12, description: 'Rich coconut cream for cooking' },
    { name: 'Sunflower Cooking Oil 1L',         sku: 'SAU-004', category: 'Sauces & Condiments',   sellingPrice: 580,  costPrice: 430,  stock: 30,  lowStockThreshold: 8,  description: 'Pure sunflower cooking oil' },
    { name: 'Heinz Tomato Ketchup 570g',        sku: 'SAU-005', category: 'Sauces & Condiments',   sellingPrice: 480,  costPrice: 355,  stock: 25,  lowStockThreshold: 8,  description: 'Classic tomato ketchup' },
    { name: 'Coconut Oil 500ml',                sku: 'SAU-006', category: 'Sauces & Condiments',   sellingPrice: 380,  costPrice: 280,  stock: 30,  lowStockThreshold: 8,  description: 'Pure virgin coconut oil' },
    { name: 'White Vinegar 500ml',              sku: 'SAU-007', category: 'Sauces & Condiments',   sellingPrice: 120,  costPrice: 85,   stock: 35,  lowStockThreshold: 10, description: 'White distilled vinegar' },
    { name: 'Mustard Paste 200g',               sku: 'SAU-008', category: 'Sauces & Condiments',   sellingPrice: 180,  costPrice: 130,  stock: 30,  lowStockThreshold: 8,  description: 'Yellow mustard paste' },
    { name: 'Worcestershire Sauce 150ml',       sku: 'SAU-009', category: 'Sauces & Condiments',   sellingPrice: 320,  costPrice: 235,  stock: 20,  lowStockThreshold: 6,  description: 'Classic Worcestershire sauce' },
    // ── Snacks & Biscuits ────────────────────────────────────────────────────
    { name: "Lay's Classic Chips 100g",         sku: 'SNK-001', category: 'Snacks & Biscuits',     sellingPrice: 250,  costPrice: 180,  stock: 60,  lowStockThreshold: 15, description: 'Classic salted potato chips',                  images: ['/uploads/products/seed-SNK-001.jpg'] },
    { name: 'Oreo Cookies 137g',                sku: 'SNK-002', category: 'Snacks & Biscuits',     sellingPrice: 350,  costPrice: 260,  stock: 0,   lowStockThreshold: 10, description: 'Original chocolate sandwich cookies',          images: ['/uploads/products/seed-SNK-002.jpg'] },
    { name: 'Pringles Original 165g',           sku: 'SNK-003', category: 'Snacks & Biscuits',     sellingPrice: 750,  costPrice: 580,  stock: 30,  lowStockThreshold: 10, description: 'Stackable potato crisps',                      images: ['/uploads/products/seed-SNK-003.jpg'] },
    { name: 'Munchee Cream Cracker 200g',       sku: 'SNK-004', category: 'Snacks & Biscuits',     sellingPrice: 120,  costPrice: 85,   stock: 5,   lowStockThreshold: 20, description: 'Light cream crackers',                         images: ['/uploads/products/seed-SNK-004.jpg'] },
    { name: 'Munchee Marie Biscuits 200g',      sku: 'SNK-005', category: 'Snacks & Biscuits',     sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 15, description: 'Classic marie biscuits' },
    { name: 'Digestive Biscuits 400g',          sku: 'SNK-006', category: 'Snacks & Biscuits',     sellingPrice: 380,  costPrice: 280,  stock: 35,  lowStockThreshold: 10, description: 'Whole wheat digestive biscuits' },
    { name: 'Munchee Chocolate Biscuits 200g',  sku: 'SNK-007', category: 'Snacks & Biscuits',     sellingPrice: 180,  costPrice: 130,  stock: 50,  lowStockThreshold: 12, description: 'Chocolate flavoured biscuits' },
    { name: 'Roasted Peanuts 200g',             sku: 'SNK-008', category: 'Snacks & Biscuits',     sellingPrice: 180,  costPrice: 130,  stock: 50,  lowStockThreshold: 12, description: 'Salted roasted peanuts' },
    { name: 'Murukku 150g',                     sku: 'SNK-009', category: 'Snacks & Biscuits',     sellingPrice: 150,  costPrice: 105,  stock: 45,  lowStockThreshold: 12, description: 'Crispy savoury snack' },
    { name: 'Cheese Balls 60g',                 sku: 'SNK-010', category: 'Snacks & Biscuits',     sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 15, description: 'Cheese flavoured puffed snack' },
    // ── Confectionery ────────────────────────────────────────────────────────
    { name: 'KitKat 2-Finger 17g',              sku: 'CNF-001', category: 'Confectionery',          sellingPrice: 120,  costPrice: 85,   stock: 100, lowStockThreshold: 25, description: 'Milk chocolate wafer bar' },
    { name: 'EH Toffee Assorted 100g',          sku: 'CNF-002', category: 'Confectionery',          sellingPrice: 150,  costPrice: 105,  stock: 80,  lowStockThreshold: 20, description: 'Elephant House assorted toffees' },
    { name: 'Natureland Honey 250g',            sku: 'CNF-003', category: 'Confectionery',          sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 6,  description: 'Pure natural honey' },
    { name: 'Dairy Milk Chocolate 45g',         sku: 'CNF-004', category: 'Confectionery',          sellingPrice: 250,  costPrice: 180,  stock: 80,  lowStockThreshold: 20, description: 'Cadbury Dairy Milk chocolate bar' },
    { name: 'Lemon Drops 100g',                 sku: 'CNF-005', category: 'Confectionery',          sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 15, description: 'Lemon flavoured hard candy' },
    { name: 'Kist Jam Strawberry 500g',         sku: 'CNF-006', category: 'Confectionery',          sellingPrice: 380,  costPrice: 280,  stock: 30,  lowStockThreshold: 8,  description: 'Strawberry fruit jam' },
    { name: 'Nutella 200g',                     sku: 'CNF-007', category: 'Confectionery',          sellingPrice: 980,  costPrice: 730,  stock: 20,  lowStockThreshold: 5,  description: 'Hazelnut chocolate spread' },
    { name: 'Polo Mints 34g',                   sku: 'CNF-008', category: 'Confectionery',          sellingPrice: 120,  costPrice: 85,   stock: 70,  lowStockThreshold: 20, description: 'Mint flavoured polo candy' },
    { name: 'Choco Pie 28g each',               sku: 'CNF-009', category: 'Confectionery',          sellingPrice: 80,   costPrice: 55,   stock: 100, lowStockThreshold: 25, description: 'Chocolate marshmallow pie snack' },
    // ── Bakery ───────────────────────────────────────────────────────────────
    { name: 'Gardenia White Bread 450g',        sku: 'BAK-001', category: 'Bakery',                 sellingPrice: 180,  costPrice: 130,  stock: 20,  lowStockThreshold: 8,  description: 'Soft sliced white bread' },
    { name: 'Butter Buns Pack of 4',            sku: 'BAK-002', category: 'Bakery',                 sellingPrice: 220,  costPrice: 160,  stock: 15,  lowStockThreshold: 6,  description: 'Freshly baked butter buns' },
    { name: 'Seeni Sambol Roll',                sku: 'BAK-003', category: 'Bakery',                 sellingPrice: 80,   costPrice: 55,   stock: 30,  lowStockThreshold: 10, description: 'Traditional Sri Lankan sweet onion roll' },
    { name: 'Whole Wheat Bread 400g',           sku: 'BAK-004', category: 'Bakery',                 sellingPrice: 200,  costPrice: 145,  stock: 15,  lowStockThreshold: 6,  description: 'Sliced whole wheat bread' },
    { name: 'Croissant each',                   sku: 'BAK-005', category: 'Bakery',                 sellingPrice: 120,  costPrice: 85,   stock: 20,  lowStockThreshold: 8,  description: 'Buttery baked croissant' },
    { name: 'Egg Tart each',                    sku: 'BAK-006', category: 'Bakery',                 sellingPrice: 100,  costPrice: 68,   stock: 20,  lowStockThreshold: 8,  description: 'Baked egg custard tart' },
    { name: 'Isso Vadai each',                  sku: 'BAK-007', category: 'Bakery',                 sellingPrice: 120,  costPrice: 85,   stock: 20,  lowStockThreshold: 8,  description: 'Crispy prawn vadai' },
    { name: 'Vegetable Roti each',              sku: 'BAK-008', category: 'Bakery',                 sellingPrice: 80,   costPrice: 55,   stock: 25,  lowStockThreshold: 10, description: 'Stuffed vegetable roti' },
    { name: 'Chocolate Muffin each',            sku: 'BAK-009', category: 'Bakery',                 sellingPrice: 120,  costPrice: 85,   stock: 15,  lowStockThreshold: 6,  description: 'Freshly baked chocolate muffin' },
    // ── Personal Care ────────────────────────────────────────────────────────
    { name: 'Dove Soap Bar 100g',               sku: 'CRE-001', category: 'Personal Care',          sellingPrice: 220,  costPrice: 160,  stock: 40,  lowStockThreshold: 15, description: 'Moisturising beauty bar',                      images: ['/uploads/products/seed-CRE-001.jpg'] },
    { name: 'Sunsilk Shampoo 200ml',            sku: 'PRC-001', category: 'Personal Care',          sellingPrice: 380,  costPrice: 280,  stock: 35,  lowStockThreshold: 10, description: 'Nourishing shampoo for smooth hair' },
    { name: 'Dettol Soap 75g',                  sku: 'PRC-002', category: 'Personal Care',          sellingPrice: 150,  costPrice: 105,  stock: 50,  lowStockThreshold: 15, description: 'Antibacterial protection soap' },
    { name: 'Nivea Body Lotion 200ml',          sku: 'PRC-003', category: 'Personal Care',          sellingPrice: 580,  costPrice: 430,  stock: 25,  lowStockThreshold: 8,  description: 'Moisturising body lotion' },
    { name: 'Head & Shoulders Shampoo 200ml',   sku: 'PRC-004', category: 'Personal Care',          sellingPrice: 480,  costPrice: 355,  stock: 30,  lowStockThreshold: 8,  description: 'Anti-dandruff shampoo' },
    { name: 'Vaseline Body Lotion 200ml',       sku: 'PRC-005', category: 'Personal Care',          sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Intensive moisturising lotion' },
    { name: 'Parachute Coconut Oil 200ml',      sku: 'PRC-006', category: 'Personal Care',          sellingPrice: 280,  costPrice: 205,  stock: 30,  lowStockThreshold: 8,  description: 'Pure coconut hair oil' },
    { name: 'Rexona Deodorant 150ml',           sku: 'PRC-007', category: 'Personal Care',          sellingPrice: 480,  costPrice: 355,  stock: 25,  lowStockThreshold: 8,  description: 'Antiperspirant deodorant spray' },
    { name: 'Pantene Conditioner 200ml',        sku: 'PRC-008', category: 'Personal Care',          sellingPrice: 450,  costPrice: 330,  stock: 25,  lowStockThreshold: 8,  description: 'Hair conditioner for smooth hair' },
    { name: 'Gillette Shaving Gel 200ml',       sku: 'PRC-009', category: 'Personal Care',          sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Sensitive skin shaving gel' },
    // ── Oral Care ────────────────────────────────────────────────────────────
    { name: 'Colgate Toothpaste 150g',          sku: 'CRE-002', category: 'Oral Care',              sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Strong teeth fluoride toothpaste',             images: ['/uploads/products/seed-CRE-002.jpg'] },
    { name: 'Colgate Toothbrush Medium',        sku: 'ORC-001', category: 'Oral Care',              sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Medium bristle toothbrush' },
    { name: 'Sensodyne Toothpaste 75g',         sku: 'ORC-002', category: 'Oral Care',              sellingPrice: 480,  costPrice: 360,  stock: 25,  lowStockThreshold: 8,  description: 'Sensitive teeth toothpaste' },
    { name: 'Close-Up Toothpaste 80g',          sku: 'ORC-003', category: 'Oral Care',              sellingPrice: 220,  costPrice: 160,  stock: 35,  lowStockThreshold: 10, description: 'Whitening toothpaste with mouthwash' },
    { name: 'Listerine Mouthwash 250ml',        sku: 'ORC-004', category: 'Oral Care',              sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 6,  description: 'Antibacterial mouthwash' },
    { name: 'Colgate Kids Toothbrush',          sku: 'ORC-005', category: 'Oral Care',              sellingPrice: 150,  costPrice: 105,  stock: 30,  lowStockThreshold: 8,  description: 'Soft bristle toothbrush for kids' },
    { name: 'Oral-B Toothbrush',                sku: 'ORC-006', category: 'Oral Care',              sellingPrice: 250,  costPrice: 180,  stock: 30,  lowStockThreshold: 8,  description: 'Indicator toothbrush' },
    { name: 'Dental Floss 50m',                 sku: 'ORC-007', category: 'Oral Care',              sellingPrice: 280,  costPrice: 205,  stock: 25,  lowStockThreshold: 6,  description: 'Waxed dental floss' },
    { name: 'Colgate Whitening Toothpaste 75g', sku: 'ORC-008', category: 'Oral Care',              sellingPrice: 320,  costPrice: 235,  stock: 30,  lowStockThreshold: 8,  description: 'Whitening fluoride toothpaste' },
    // ── Cleaning & Laundry ───────────────────────────────────────────────────
    { name: 'Sunlight Dish Wash 500ml',         sku: 'CLN-001', category: 'Cleaning & Laundry',     sellingPrice: 290,  costPrice: 210,  stock: 50,  lowStockThreshold: 15, description: 'Lemon dishwashing liquid',                     images: ['/uploads/products/seed-CLN-001.jpg'] },
    { name: 'Surf Excel Detergent 1kg',         sku: 'CLN-002', category: 'Cleaning & Laundry',     sellingPrice: 480,  costPrice: 360,  stock: 35,  lowStockThreshold: 10, description: 'Powerful laundry detergent' },
    { name: 'Dettol Floor Cleaner 500ml',       sku: 'CLN-003', category: 'Cleaning & Laundry',     sellingPrice: 380,  costPrice: 280,  stock: 30,  lowStockThreshold: 8,  description: 'Antibacterial floor cleaner' },
    { name: 'Rin Detergent Bar 250g',           sku: 'CLN-004', category: 'Cleaning & Laundry',     sellingPrice: 95,   costPrice: 65,   stock: 60,  lowStockThreshold: 15, description: 'Laundry soap bar' },
    { name: 'Baygon Insect Spray 300ml',        sku: 'CLN-005', category: 'Cleaning & Laundry',     sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Household insect killer spray' },
    { name: 'Harpic Toilet Cleaner 500ml',      sku: 'CLN-006', category: 'Cleaning & Laundry',     sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Toilet bowl cleaner and disinfectant' },
    { name: 'Comfort Fabric Softener 500ml',    sku: 'CLN-007', category: 'Cleaning & Laundry',     sellingPrice: 320,  costPrice: 235,  stock: 25,  lowStockThreshold: 8,  description: 'Fabric softener and freshener' },
    { name: 'Dettol Antiseptic Liquid 100ml',   sku: 'CLN-008', category: 'Cleaning & Laundry',     sellingPrice: 280,  costPrice: 205,  stock: 30,  lowStockThreshold: 8,  description: 'Multipurpose antiseptic liquid' },
    { name: 'Scotch-Brite Sponge each',         sku: 'CLN-009', category: 'Cleaning & Laundry',     sellingPrice: 120,  costPrice: 85,   stock: 40,  lowStockThreshold: 10, description: 'Scrub sponge for dishes' },
    // ── Baby Products ────────────────────────────────────────────────────────
    { name: 'Pampers Diapers S 16ct',           sku: 'BAB-001', category: 'Baby Products',          sellingPrice: 980,  costPrice: 730,  stock: 20,  lowStockThreshold: 5,  description: 'Soft disposable diapers for babies' },
    { name: 'Cerelac Wheat 200g',               sku: 'BAB-002', category: 'Baby Products',          sellingPrice: 580,  costPrice: 430,  stock: 15,  lowStockThreshold: 5,  description: 'Fortified infant cereal' },
    { name: "Johnson's Baby Powder 100g",       sku: 'BAB-003', category: 'Baby Products',          sellingPrice: 320,  costPrice: 235,  stock: 25,  lowStockThreshold: 8,  description: 'Gentle baby powder' },
    { name: "Johnson's Baby Shampoo 200ml",     sku: 'BAB-004', category: 'Baby Products',          sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Tear-free baby shampoo' },
    { name: "Johnson's Baby Lotion 200ml",      sku: 'BAB-005', category: 'Baby Products',          sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Gentle moisturising baby lotion' },
    { name: 'Pampers Baby Wipes 56ct',          sku: 'BAB-006', category: 'Baby Products',          sellingPrice: 380,  costPrice: 280,  stock: 25,  lowStockThreshold: 8,  description: 'Soft fragrance-free baby wipes' },
    { name: 'Cerelac Rice 200g',                sku: 'BAB-007', category: 'Baby Products',          sellingPrice: 580,  costPrice: 430,  stock: 15,  lowStockThreshold: 5,  description: 'Fortified rice infant cereal' },
    { name: 'Baby Feeding Bottle 250ml',        sku: 'BAB-008', category: 'Baby Products',          sellingPrice: 480,  costPrice: 355,  stock: 15,  lowStockThreshold: 4,  description: 'BPA-free baby feeding bottle' },
    { name: 'Farley Rusks 150g',                sku: 'BAB-009', category: 'Baby Products',          sellingPrice: 320,  costPrice: 235,  stock: 20,  lowStockThreshold: 6,  description: 'Baby weaning rusks' },
    // ── Pet Care ─────────────────────────────────────────────────────────────
    { name: 'Pedigree Dog Food 400g',           sku: 'PTC-001', category: 'Pet Care',               sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 5,  description: 'Complete nutrition for adult dogs' },
    { name: 'Whiskas Cat Food 400g',            sku: 'PTC-002', category: 'Pet Care',               sellingPrice: 350,  costPrice: 255,  stock: 20,  lowStockThreshold: 5,  description: 'Balanced nutrition for adult cats' },
    { name: 'Pedigree Dog Food 3kg',            sku: 'PTC-003', category: 'Pet Care',               sellingPrice: 1800, costPrice: 1330, stock: 10,  lowStockThreshold: 3,  description: 'Dry dog food large pack' },
    { name: 'Whiskas Cat Food Pouch 85g',       sku: 'PTC-004', category: 'Pet Care',               sellingPrice: 180,  costPrice: 130,  stock: 30,  lowStockThreshold: 8,  description: 'Wet cat food in pouch' },
    { name: 'Eukanuba Puppy Food 1kg',          sku: 'PTC-005', category: 'Pet Care',               sellingPrice: 1200, costPrice: 890,  stock: 8,   lowStockThreshold: 3,  description: 'Premium puppy dry food' },
    { name: 'Dog Collar Medium',                sku: 'PTC-006', category: 'Pet Care',               sellingPrice: 280,  costPrice: 205,  stock: 15,  lowStockThreshold: 4,  description: 'Adjustable nylon dog collar' },
    { name: 'Cat Litter Sand 5L',               sku: 'PTC-007', category: 'Pet Care',               sellingPrice: 580,  costPrice: 430,  stock: 12,  lowStockThreshold: 4,  description: 'Clumping cat litter sand' },
    { name: 'Pet Shampoo 200ml',                sku: 'PTC-008', category: 'Pet Care',               sellingPrice: 320,  costPrice: 235,  stock: 15,  lowStockThreshold: 4,  description: 'Gentle pet grooming shampoo' },
    { name: 'Dog Treats Biscuits 100g',         sku: 'PTC-009', category: 'Pet Care',               sellingPrice: 280,  costPrice: 205,  stock: 20,  lowStockThreshold: 5,  description: 'Training treats for dogs' },
    // ── Kitchen & Dining ─────────────────────────────────────────────────────
    { name: 'Hela Tissue Paper 10 rolls',       sku: 'KTD-001', category: 'Kitchen & Dining',       sellingPrice: 450,  costPrice: 330,  stock: 30,  lowStockThreshold: 8,  description: '2-ply soft tissue rolls' },
    { name: 'Ziplock Bags 50ct',                sku: 'KTD-002', category: 'Kitchen & Dining',       sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Resealable food storage bags' },
    { name: 'Melamine Plate Set 6pc',           sku: 'KTD-003', category: 'Kitchen & Dining',       sellingPrice: 1200, costPrice: 880,  stock: 10,  lowStockThreshold: 3,  description: 'Durable melamine dinner plates' },
    { name: 'Aluminium Foil 30m',               sku: 'KTD-004', category: 'Kitchen & Dining',       sellingPrice: 280,  costPrice: 205,  stock: 25,  lowStockThreshold: 8,  description: 'Heavy duty kitchen foil' },
    { name: 'Cling Wrap 30m',                   sku: 'KTD-005', category: 'Kitchen & Dining',       sellingPrice: 180,  costPrice: 130,  stock: 30,  lowStockThreshold: 8,  description: 'Food grade cling film wrap' },
    { name: 'Plastic Lunch Box 1L',             sku: 'KTD-006', category: 'Kitchen & Dining',       sellingPrice: 280,  costPrice: 205,  stock: 20,  lowStockThreshold: 6,  description: 'Airtight food storage container' },
    { name: 'Kitchen Towel 2 rolls',            sku: 'KTD-007', category: 'Kitchen & Dining',       sellingPrice: 180,  costPrice: 130,  stock: 30,  lowStockThreshold: 8,  description: 'Absorbent kitchen paper towel' },
    { name: 'Disposable Cups 50ct',             sku: 'KTD-008', category: 'Kitchen & Dining',       sellingPrice: 220,  costPrice: 160,  stock: 25,  lowStockThreshold: 8,  description: 'Plastic disposable drinking cups' },
    { name: 'Wooden Spoon Set 3pc',             sku: 'KTD-009', category: 'Kitchen & Dining',       sellingPrice: 180,  costPrice: 130,  stock: 20,  lowStockThreshold: 5,  description: 'Wooden cooking spoon set' },
    // ── Soft Drinks & Water (remaining top-up) ───────────────────────────────
    { name: 'Fanta Orange 500ml',               sku: 'SDW-003', category: 'Soft Drinks & Water',   sellingPrice: 175,  costPrice: 125,  stock: 70,  lowStockThreshold: 20, description: 'Orange flavoured carbonated drink' },
    { name: '7UP 500ml',                        sku: 'SDW-004', category: 'Soft Drinks & Water',   sellingPrice: 175,  costPrice: 125,  stock: 65,  lowStockThreshold: 20, description: 'Lemon-lime flavoured soft drink' },
    { name: 'EH Ginger Beer 400ml',             sku: 'SDW-005', category: 'Soft Drinks & Water',   sellingPrice: 120,  costPrice: 85,   stock: 50,  lowStockThreshold: 15, description: 'Elephant House ginger beer' },
    { name: 'Sparkling Water 500ml',            sku: 'SDW-006', category: 'Soft Drinks & Water',   sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 12, description: 'Carbonated mineral water' },
    { name: 'Nestlé Pure Life Water 1L',        sku: 'SDW-007', category: 'Soft Drinks & Water',   sellingPrice: 100,  costPrice: 68,   stock: 100, lowStockThreshold: 25, description: 'Purified bottled water' },
  ];

  // Get admin _id via raw DB query to avoid any Mongoose type issues
  const adminRaw = await mongoose.connection.db!
    .collection('users')
    .findOne({ email: 'admin@oneshop.lk' }, { projection: { _id: 1 } });
  if (!adminRaw) throw new Error('Admin user not found – cannot seed products');
  const adminId = new mongoose.Types.ObjectId(adminRaw._id.toString());

  console.log('');
  for (const p of products) {
    const exists = await Product.findOne({ sku: p.sku });
    const imageDest = path.join(UPLOADS_DIR, `seed-${p.sku}.jpg`);
    const imageExists = fs.existsSync(imageDest);

    if (!exists) {
      await Product.create({
        ...p,
        images: imageExists ? p.images : [],
        storeId: STORE_ID,
        createdBy: adminId,
      });
      console.log(`✓ Product created: ${p.name}${imageExists ? ' (with image)' : ' (no image)'}`);
    } else {
      const updates: Record<string, unknown> = {};
      if (imageExists && exists.images.length === 0) updates.images = p.images;
      if (exists.category !== p.category) updates.category = p.category;
      if (Object.keys(updates).length > 0) {
        await Product.updateOne({ _id: exists._id }, { $set: updates });
        console.log(`  Updated ${p.name}: ${Object.keys(updates).join(', ')}`);
      } else {
        console.log(`  Product ${p.sku} already exists – skipping`);
      }
    }
  }

  // ── 5. Seed Customers ──────────────────────────────────────────────────────
  const customers = [
    { name: 'Amal Perera',           email: 'amal.perera@gmail.com',    phone: '+94 71 234 5678', totalOrders: 24, totalSpent: 234000, lastPurchase: new Date('2026-02-20') },
    { name: 'Nimali Fernando',        email: 'nimali.f@yahoo.com',        phone: '+94 76 345 6789', totalOrders: 18, totalSpent: 189500, lastPurchase: new Date('2026-02-19') },
    { name: 'Kasun Rajapaksa',        email: 'kasun.r@gmail.com',         phone: '+94 77 456 7890', totalOrders: 32, totalSpent: 456200, lastPurchase: new Date('2026-02-20') },
    { name: 'Dilani Wickramasinghe',  email: 'dilani.w@hotmail.com',      phone: '+94 78 567 8901', totalOrders: 12, totalSpent: 145000, lastPurchase: new Date('2026-02-18') },
    { name: 'Ruwan Silva',            email: 'ruwan.silva@gmail.com',     phone: '+94 71 678 9012', totalOrders: 28, totalSpent: 312800, lastPurchase: new Date('2026-02-20') },
    { name: 'Chamari Bandara',        email: 'chamari.b@gmail.com',       phone: '+94 76 789 0123', totalOrders: 15, totalSpent: 178400, lastPurchase: new Date('2026-02-17') },
    { name: 'Pradeep Jayawardena',    email: 'pradeep.j@yahoo.com',       phone: '+94 77 890 1234', totalOrders: 21, totalSpent: 267300, lastPurchase: new Date('2026-02-19') },
    { name: 'Shalini Dissanayake',    email: 'shalini.d@gmail.com',       phone: '+94 78 901 2345', totalOrders:  9, totalSpent:  98600, lastPurchase: new Date('2026-02-16') },
    { name: 'Tharaka Kumara',         email: 'tharaka.k@gmail.com',       phone: '+94 71 012 3456', totalOrders: 35, totalSpent: 498700, lastPurchase: new Date('2026-02-21') },
    { name: 'Sanduni Rathnayake',     email: 'sanduni.r@outlook.com',     phone: '+94 76 123 4567', totalOrders:  7, totalSpent:  76200, lastPurchase: new Date('2026-02-15') },
  ];

  console.log('');
  for (const c of customers) {
    const exists = await Customer.findOne({ email: c.email, storeId: STORE_ID });
    if (!exists) {
      const avatar = c.name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
      await Customer.create({ ...c, avatar, storeId: STORE_ID });
      console.log(`✓ Customer created: ${c.name}`);
    } else {
      console.log(`  Customer "${c.name}" already exists – skipping`);
    }
  }

  // ── 6. Seed StoreSettings ──────────────────────────────────────────────────
  const existingSettings = await StoreSettings.findOne({ storeId: STORE_ID });
  if (!existingSettings) {
    await StoreSettings.create({
      storeId:        STORE_ID,
      storeName:      'OneShop',
      currency:       'LKR',
      currencyLocale: 'en-LK',
      address:        'No. 1, Main Street, Colombo 01',
      phone:          '+94 11 234 5678',
      email:          'info@oneshop.lk',
    });
    console.log('\n✓ StoreSettings created');
  } else {
    console.log('\n  StoreSettings already exists – skipping');
  }

  // ── 7. Seed Orders ─────────────────────────────────────────────────────────
  console.log('');
  const orderDocs = [
    // ── Amal Perera ──────────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-001', source: 'physical',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [
        { productName: 'Nestlé Milo 400g',   sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Coca-Cola 500ml',    sku: 'BEV-001', quantity: 2, unitPrice: 180, subtotal: 360 },
        { productName: 'Anchor Butter 200g', sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
      ],
      subtotal: 1500, discount: 0, total: 1500, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2025-12-10'), updatedAt: new Date('2025-12-10'),
    },
    {
      orderId: 'ORD-SEED-002', source: 'physical',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [
        { productName: 'Dilmah Tea Bags 50s',      sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
      ],
      subtotal: 1120, discount: 0, total: 1120, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-01-05'), updatedAt: new Date('2026-01-05'),
    },
    {
      orderId: 'ORD-SEED-003', source: 'online',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [
        { productName: 'Nestlé Milo 1kg',        sku: 'MLT-004', quantity: 1, unitPrice: 1350, subtotal: 1350 },
        { productName: 'Horlicks Original 500g', sku: 'MLT-001', quantity: 1, unitPrice: 850,  subtotal: 850  },
        { productName: 'Nescafé Classic 50g',    sku: 'TEA-003', quantity: 1, unitPrice: 480,  subtotal: 480  },
      ],
      subtotal: 2680, discount: 0, total: 2680, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 45, Galle Road, Colombo 03', storeId: STORE_ID,
      createdAt: new Date('2026-01-28'), updatedAt: new Date('2026-01-28'),
    },
    {
      orderId: 'ORD-SEED-004', source: 'physical',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [
        { productName: 'Carrot 1kg',           sku: 'VEG-001', quantity: 2, unitPrice: 180, subtotal: 360 },
        { productName: 'Potato 1kg',           sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
        { productName: 'Banana bunch ~1kg',    sku: 'FRT-001', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Apple Imported 1kg',   sku: 'FRT-002', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 1190, discount: 0, total: 1190, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-02-20'),
    },
    {
      orderId: 'ORD-SEED-005', source: 'online',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [
        { productName: 'Kist Mango Juice 200ml',  sku: 'JUS-001', quantity: 4, unitPrice: 85,  subtotal: 340 },
        { productName: 'Kist Guava Juice 200ml',  sku: 'JUS-004', quantity: 4, unitPrice: 85,  subtotal: 340 },
        { productName: 'EH Cream Soda 400ml',     sku: 'SDW-002', quantity: 2, unitPrice: 120, subtotal: 240 },
      ],
      subtotal: 920, discount: 0, total: 920, status: 'shipped',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 45, Galle Road, Colombo 03', storeId: STORE_ID,
      createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15'),
    },
    // ── Nimali Fernando ──────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-006', source: 'online',
      customerName: 'Nimali Fernando', customerEmail: 'nimali.f@yahoo.com', customerPhone: '+94 76 345 6789',
      items: [
        { productName: 'Anchor Cheese Slices 200g',  sku: 'CHF-001', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'Anchor Cooking Cream 200ml', sku: 'CHF-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Nestlé Yoghurt 100g',        sku: 'CHF-002', quantity: 2, unitPrice: 120, subtotal: 240 },
      ],
      subtotal: 1200, discount: 0, total: 1200, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 12, Temple Road, Kandy', storeId: STORE_ID,
      createdAt: new Date('2025-12-15'), updatedAt: new Date('2025-12-15'),
    },
    {
      orderId: 'ORD-SEED-007', source: 'physical',
      customerName: 'Nimali Fernando', customerEmail: 'nimali.f@yahoo.com', customerPhone: '+94 76 345 6789',
      items: [
        { productName: 'Anchor Butter 200g',       sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
      ],
      subtotal: 1220, discount: 0, total: 1220, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-01-10'), updatedAt: new Date('2026-01-10'),
    },
    {
      orderId: 'ORD-SEED-008', source: 'online',
      customerName: 'Nimali Fernando', customerEmail: 'nimali.f@yahoo.com', customerPhone: '+94 76 345 6789',
      items: [
        { productName: 'EH Vanilla Ice Cream 500ml',   sku: 'DAI-002', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'McCain French Fries 750g',     sku: 'FRZ-002', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Frozen Chicken Nuggets 300g',  sku: 'FRZ-004', quantity: 1, unitPrice: 580, subtotal: 580 },
      ],
      subtotal: 1810, discount: 0, total: 1810, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 12, Temple Road, Kandy', storeId: STORE_ID,
      createdAt: new Date('2026-02-05'), updatedAt: new Date('2026-02-05'),
    },
    {
      orderId: 'ORD-SEED-009', source: 'physical',
      customerName: 'Nimali Fernando', customerEmail: 'nimali.f@yahoo.com', customerPhone: '+94 76 345 6789',
      items: [
        { productName: 'Dilmah Tea Bags 50s', sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Nescafé Classic 50g', sku: 'TEA-003', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Nestlé Milo 400g',    sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
      ],
      subtotal: 1520, discount: 0, total: 1520, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01'),
    },
    {
      orderId: 'ORD-SEED-010', source: 'online',
      customerName: 'Nimali Fernando', customerEmail: 'nimali.f@yahoo.com', customerPhone: '+94 76 345 6789',
      items: [
        { productName: 'Apple Imported 1kg', sku: 'FRT-002', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Banana bunch ~1kg',  sku: 'FRT-001', quantity: 2, unitPrice: 150, subtotal: 300 },
        { productName: 'Papaya 1kg',         sku: 'FRT-003', quantity: 1, unitPrice: 120, subtotal: 120 },
      ],
      subtotal: 900, discount: 0, total: 900, status: 'processing',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 12, Temple Road, Kandy', storeId: STORE_ID,
      createdAt: new Date('2026-04-05'), updatedAt: new Date('2026-04-05'),
    },
    // ── Kasun Rajapaksa ──────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-011', source: 'physical',
      customerName: 'Kasun Rajapaksa', customerEmail: 'kasun.r@gmail.com', customerPhone: '+94 77 456 7890',
      items: [
        { productName: 'Nestlé Milo 1kg',         sku: 'MLT-004', quantity: 1, unitPrice: 1350, subtotal: 1350 },
        { productName: 'Horlicks Original 500g',  sku: 'MLT-001', quantity: 1, unitPrice: 850,  subtotal: 850  },
        { productName: 'Anchor Milk Powder 400g', sku: 'MLT-006', quantity: 1, unitPrice: 820,  subtotal: 820  },
      ],
      subtotal: 3020, discount: 0, total: 3020, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2025-12-05'), updatedAt: new Date('2025-12-05'),
    },
    {
      orderId: 'ORD-SEED-012', source: 'online',
      customerName: 'Kasun Rajapaksa', customerEmail: 'kasun.r@gmail.com', customerPhone: '+94 77 456 7890',
      items: [
        { productName: 'Frozen Prawns 250g',          sku: 'FRZ-006', quantity: 1, unitPrice: 680, subtotal: 680 },
        { productName: 'Frozen Fish Fingers 300g',    sku: 'FRZ-001', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Frozen Chicken Nuggets 300g', sku: 'FRZ-004', quantity: 1, unitPrice: 580, subtotal: 580 },
      ],
      subtotal: 1740, discount: 0, total: 1740, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 78, Peradeniya Road, Kandy', storeId: STORE_ID,
      createdAt: new Date('2025-12-28'), updatedAt: new Date('2025-12-28'),
    },
    {
      orderId: 'ORD-SEED-013', source: 'physical',
      customerName: 'Kasun Rajapaksa', customerEmail: 'kasun.r@gmail.com', customerPhone: '+94 77 456 7890',
      items: [
        { productName: 'Carrot 1kg',               sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Tomato 1kg',               sku: 'VEG-002', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Potato 1kg',               sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
      ],
      subtotal: 1260, discount: 0, total: 1260, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-01-20'), updatedAt: new Date('2026-01-20'),
    },
    {
      orderId: 'ORD-SEED-014', source: 'online',
      customerName: 'Kasun Rajapaksa', customerEmail: 'kasun.r@gmail.com', customerPhone: '+94 77 456 7890',
      items: [
        { productName: 'Anchor Mozzarella Block 250g',   sku: 'CHF-007', quantity: 1, unitPrice: 950, subtotal: 950 },
        { productName: 'Elle & Vire Whipping Cream 200ml', sku: 'CHF-006', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Kotmale Greek Yoghurt 150g',     sku: 'CHF-005', quantity: 2, unitPrice: 180, subtotal: 360 },
      ],
      subtotal: 1790, discount: 0, total: 1790, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 78, Peradeniya Road, Kandy', storeId: STORE_ID,
      createdAt: new Date('2026-02-14'), updatedAt: new Date('2026-02-14'),
    },
    {
      orderId: 'ORD-SEED-015', source: 'physical',
      customerName: 'Kasun Rajapaksa', customerEmail: 'kasun.r@gmail.com', customerPhone: '+94 77 456 7890',
      items: [
        { productName: 'Nestlé Milo 400g',       sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Dilmah Tea Bags 50s',    sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Nescafé Classic 50g',    sku: 'TEA-003', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Cowhead Orange Juice 1L',sku: 'JUS-002', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 2000, discount: 0, total: 2000, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-03-22'), updatedAt: new Date('2026-03-22'),
    },
    // ── Dilani Wickramasinghe ────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-016', source: 'online',
      customerName: 'Dilani Wickramasinghe', customerEmail: 'dilani.w@hotmail.com', customerPhone: '+94 78 567 8901',
      items: [
        { productName: 'Anchor Butter 200g',         sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Anchor Cheese Slices 200g',  sku: 'CHF-001', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'Anchor Cooking Cream 200ml', sku: 'CHF-003', quantity: 1, unitPrice: 380, subtotal: 380 },
      ],
      subtotal: 1450, discount: 0, total: 1450, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 23, Baseline Road, Dematagoda', storeId: STORE_ID,
      createdAt: new Date('2026-01-15'), updatedAt: new Date('2026-01-15'),
    },
    {
      orderId: 'ORD-SEED-017', source: 'physical',
      customerName: 'Dilani Wickramasinghe', customerEmail: 'dilani.w@hotmail.com', customerPhone: '+94 78 567 8901',
      items: [
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
        { productName: 'Nestlé Yoghurt 100g',       sku: 'CHF-002', quantity: 1, unitPrice: 120, subtotal: 120 },
      ],
      subtotal: 850, discount: 0, total: 850, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-03'), updatedAt: new Date('2026-02-03'),
    },
    {
      orderId: 'ORD-SEED-018', source: 'online',
      customerName: 'Dilani Wickramasinghe', customerEmail: 'dilani.w@hotmail.com', customerPhone: '+94 78 567 8901',
      items: [
        { productName: 'Nestlé Milo 400g',       sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Horlicks Original 500g', sku: 'MLT-001', quantity: 1, unitPrice: 850, subtotal: 850 },
      ],
      subtotal: 1500, discount: 0, total: 1500, status: 'shipped',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 23, Baseline Road, Dematagoda', storeId: STORE_ID,
      createdAt: new Date('2026-03-10'), updatedAt: new Date('2026-03-10'),
    },
    {
      orderId: 'ORD-SEED-019', source: 'physical',
      customerName: 'Dilani Wickramasinghe', customerEmail: 'dilani.w@hotmail.com', customerPhone: '+94 78 567 8901',
      items: [
        { productName: 'Apple Imported 1kg', sku: 'FRT-002', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Banana bunch ~1kg',  sku: 'FRT-001', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Papaya 1kg',         sku: 'FRT-003', quantity: 1, unitPrice: 120, subtotal: 120 },
      ],
      subtotal: 750, discount: 0, total: 750, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-08'), updatedAt: new Date('2026-04-08'),
    },
    // ── Ruwan Silva ──────────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-020', source: 'physical',
      customerName: 'Ruwan Silva', customerEmail: 'ruwan.silva@gmail.com', customerPhone: '+94 71 678 9012',
      items: [
        { productName: 'Nestlé Milo 1kg',         sku: 'MLT-004', quantity: 1, unitPrice: 1350, subtotal: 1350 },
        { productName: 'Anchor Milk Powder 400g', sku: 'MLT-006', quantity: 1, unitPrice: 820,  subtotal: 820  },
        { productName: 'Horlicks Original 500g',  sku: 'MLT-001', quantity: 1, unitPrice: 850,  subtotal: 850  },
      ],
      subtotal: 3020, discount: 0, total: 3020, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2025-12-20'), updatedAt: new Date('2025-12-20'),
    },
    {
      orderId: 'ORD-SEED-021', source: 'online',
      customerName: 'Ruwan Silva', customerEmail: 'ruwan.silva@gmail.com', customerPhone: '+94 71 678 9012',
      items: [
        { productName: 'McCain French Fries 750g',    sku: 'FRZ-002', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'EH Vanilla Ice Cream 500ml',  sku: 'DAI-002', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'EH Chocolate Ice Cream 500ml',sku: 'FRZ-003', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'Frozen Prawns 250g',           sku: 'FRZ-006', quantity: 1, unitPrice: 680, subtotal: 680 },
      ],
      subtotal: 2490, discount: 0, total: 2490, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 56, Havelock Road, Colombo 05', storeId: STORE_ID,
      createdAt: new Date('2026-01-12'), updatedAt: new Date('2026-01-12'),
    },
    {
      orderId: 'ORD-SEED-022', source: 'physical',
      customerName: 'Ruwan Silva', customerEmail: 'ruwan.silva@gmail.com', customerPhone: '+94 71 678 9012',
      items: [
        { productName: 'Carrot 1kg',           sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Potato 1kg',           sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
        { productName: 'Banana bunch ~1kg',    sku: 'FRT-001', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Eggs Tray of 12',       sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Butter 200g',   sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
      ],
      subtotal: 1400, discount: 0, total: 1400, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01'),
    },
    {
      orderId: 'ORD-SEED-023', source: 'online',
      customerName: 'Ruwan Silva', customerEmail: 'ruwan.silva@gmail.com', customerPhone: '+94 71 678 9012',
      items: [
        { productName: 'Cowhead Orange Juice 1L', sku: 'JUS-002', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Dilmah Tea Bags 50s',     sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Nescafé Classic 50g',     sku: 'TEA-003', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 1350, discount: 0, total: 1350, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 56, Havelock Road, Colombo 05', storeId: STORE_ID,
      createdAt: new Date('2026-03-05'), updatedAt: new Date('2026-03-05'),
    },
    {
      orderId: 'ORD-SEED-024', source: 'physical',
      customerName: 'Ruwan Silva', customerEmail: 'ruwan.silva@gmail.com', customerPhone: '+94 71 678 9012',
      items: [
        { productName: 'Coca-Cola 500ml',  sku: 'BEV-001', quantity: 3, unitPrice: 180, subtotal: 540 },
        { productName: 'Nestlé Milo 400g', sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
      ],
      subtotal: 1190, discount: 0, total: 1190, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-12'), updatedAt: new Date('2026-04-12'),
    },
    // ── Chamari Bandara ──────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-025', source: 'physical',
      customerName: 'Chamari Bandara', customerEmail: 'chamari.b@gmail.com', customerPhone: '+94 76 789 0123',
      items: [
        { productName: 'Eggs Tray of 12',   sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Butter 200g',sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Cow Milk 1L Pack',  sku: 'DAI-009', quantity: 1, unitPrice: 280, subtotal: 280 },
      ],
      subtotal: 1150, discount: 0, total: 1150, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2025-12-22'), updatedAt: new Date('2025-12-22'),
    },
    {
      orderId: 'ORD-SEED-026', source: 'online',
      customerName: 'Chamari Bandara', customerEmail: 'chamari.b@gmail.com', customerPhone: '+94 76 789 0123',
      items: [
        { productName: 'Dilmah Tea Bags 50s', sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Nescafé Classic 50g', sku: 'TEA-003', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 870, discount: 0, total: 870, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 34, Station Road, Nugegoda', storeId: STORE_ID,
      createdAt: new Date('2026-01-18'), updatedAt: new Date('2026-01-18'),
    },
    {
      orderId: 'ORD-SEED-027', source: 'physical',
      customerName: 'Chamari Bandara', customerEmail: 'chamari.b@gmail.com', customerPhone: '+94 76 789 0123',
      items: [
        { productName: 'Carrot 1kg',  sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Tomato 1kg',  sku: 'VEG-002', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Potato 1kg',  sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
        { productName: 'Cabbage 1kg', sku: 'VEG-005', quantity: 1, unitPrice: 100, subtotal: 100 },
      ],
      subtotal: 630, discount: 0, total: 630, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-12'), updatedAt: new Date('2026-02-12'),
    },
    {
      orderId: 'ORD-SEED-028', source: 'online',
      customerName: 'Chamari Bandara', customerEmail: 'chamari.b@gmail.com', customerPhone: '+94 76 789 0123',
      items: [
        { productName: 'Nestlé Milo 400g',  sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Nestlé Yoghurt 100g',sku: 'CHF-002', quantity: 3, unitPrice: 120, subtotal: 360 },
      ],
      subtotal: 1010, discount: 0, total: 1010, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 34, Station Road, Nugegoda', storeId: STORE_ID,
      createdAt: new Date('2026-03-08'), updatedAt: new Date('2026-03-08'),
    },
    {
      orderId: 'ORD-SEED-029', source: 'physical',
      customerName: 'Chamari Bandara', customerEmail: 'chamari.b@gmail.com', customerPhone: '+94 76 789 0123',
      items: [
        { productName: 'Anchor Butter 200g',       sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Cheese Slices 200g', sku: 'CHF-001', quantity: 1, unitPrice: 580, subtotal: 580 },
      ],
      subtotal: 1450, discount: 0, total: 1450, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-03'), updatedAt: new Date('2026-04-03'),
    },
    // ── Pradeep Jayawardena ──────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-030', source: 'physical',
      customerName: 'Pradeep Jayawardena', customerEmail: 'pradeep.j@yahoo.com', customerPhone: '+94 77 890 1234',
      items: [
        { productName: 'Nestlé Milo 400g',   sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Anchor Butter 200g', sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Eggs Tray of 12',    sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Dilmah Tea Bags 50s',sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
      ],
      subtotal: 1910, discount: 0, total: 1910, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-01-08'), updatedAt: new Date('2026-01-08'),
    },
    {
      orderId: 'ORD-SEED-031', source: 'online',
      customerName: 'Pradeep Jayawardena', customerEmail: 'pradeep.j@yahoo.com', customerPhone: '+94 77 890 1234',
      items: [
        { productName: 'EH Vanilla Ice Cream 500ml',  sku: 'DAI-002', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'McCain French Fries 750g',    sku: 'FRZ-002', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Frozen Chicken Nuggets 300g', sku: 'FRZ-004', quantity: 1, unitPrice: 580, subtotal: 580 },
      ],
      subtotal: 1810, discount: 0, total: 1810, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 89, Nawala Road, Rajagiriya', storeId: STORE_ID,
      createdAt: new Date('2026-01-28'), updatedAt: new Date('2026-01-28'),
    },
    {
      orderId: 'ORD-SEED-032', source: 'physical',
      customerName: 'Pradeep Jayawardena', customerEmail: 'pradeep.j@yahoo.com', customerPhone: '+94 77 890 1234',
      items: [
        { productName: 'Carrot 1kg',         sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Potato 1kg',         sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
        { productName: 'Apple Imported 1kg', sku: 'FRT-002', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Banana bunch ~1kg',  sku: 'FRT-001', quantity: 1, unitPrice: 150, subtotal: 150 },
      ],
      subtotal: 1010, discount: 0, total: 1010, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-02-20'),
    },
    {
      orderId: 'ORD-SEED-033', source: 'online',
      customerName: 'Pradeep Jayawardena', customerEmail: 'pradeep.j@yahoo.com', customerPhone: '+94 77 890 1234',
      items: [
        { productName: 'Horlicks Original 500g', sku: 'MLT-001', quantity: 1, unitPrice: 850, subtotal: 850 },
        { productName: 'Nestomalt 400g',          sku: 'MLT-002', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Ovaltine 400g',            sku: 'MLT-003', quantity: 1, unitPrice: 720, subtotal: 720 },
      ],
      subtotal: 2050, discount: 0, total: 2050, status: 'shipped',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 89, Nawala Road, Rajagiriya', storeId: STORE_ID,
      createdAt: new Date('2026-03-18'), updatedAt: new Date('2026-03-18'),
    },
    {
      orderId: 'ORD-SEED-034', source: 'physical',
      customerName: 'Pradeep Jayawardena', customerEmail: 'pradeep.j@yahoo.com', customerPhone: '+94 77 890 1234',
      items: [
        { productName: 'Nestlé Milo 400g',        sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Dilmah Tea Bags 50s',     sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Cowhead Orange Juice 1L', sku: 'JUS-002', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 1520, discount: 0, total: 1520, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-10'), updatedAt: new Date('2026-04-10'),
    },
    // ── Shalini Dissanayake ──────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-035', source: 'physical',
      customerName: 'Shalini Dissanayake', customerEmail: 'shalini.d@gmail.com', customerPhone: '+94 78 901 2345',
      items: [
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
      ],
      subtotal: 730, discount: 0, total: 730, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-01-25'), updatedAt: new Date('2026-01-25'),
    },
    {
      orderId: 'ORD-SEED-036', source: 'online',
      customerName: 'Shalini Dissanayake', customerEmail: 'shalini.d@gmail.com', customerPhone: '+94 78 901 2345',
      items: [
        { productName: 'Dilmah Tea Bags 50s', sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
        { productName: 'Nestlé Milo 400g',    sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
      ],
      subtotal: 1040, discount: 0, total: 1040, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 67, High Level Road, Maharagama', storeId: STORE_ID,
      createdAt: new Date('2026-02-28'), updatedAt: new Date('2026-02-28'),
    },
    {
      orderId: 'ORD-SEED-037', source: 'physical',
      customerName: 'Shalini Dissanayake', customerEmail: 'shalini.d@gmail.com', customerPhone: '+94 78 901 2345',
      items: [
        { productName: 'Carrot 1kg',  sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Tomato 1kg',  sku: 'VEG-002', quantity: 1, unitPrice: 150, subtotal: 150 },
        { productName: 'Cabbage 1kg', sku: 'VEG-005', quantity: 1, unitPrice: 100, subtotal: 100 },
      ],
      subtotal: 430, discount: 0, total: 430, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-03-25'), updatedAt: new Date('2026-03-25'),
    },
    {
      orderId: 'ORD-SEED-038', source: 'physical',
      customerName: 'Shalini Dissanayake', customerEmail: 'shalini.d@gmail.com', customerPhone: '+94 78 901 2345',
      items: [
        { productName: 'Anchor Butter 200g',  sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Nestlé Yoghurt 100g', sku: 'CHF-002', quantity: 1, unitPrice: 120, subtotal: 120 },
      ],
      subtotal: 610, discount: 0, total: 610, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-15'), updatedAt: new Date('2026-04-15'),
    },
    // ── Tharaka Kumara ───────────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-039', source: 'physical',
      customerName: 'Tharaka Kumara', customerEmail: 'tharaka.k@gmail.com', customerPhone: '+94 71 012 3456',
      items: [
        { productName: 'Nestlé Milo 1kg',         sku: 'MLT-004', quantity: 1, unitPrice: 1350, subtotal: 1350 },
        { productName: 'Horlicks Original 500g',  sku: 'MLT-001', quantity: 1, unitPrice: 850,  subtotal: 850  },
        { productName: 'Anchor Milk Powder 400g', sku: 'MLT-006', quantity: 1, unitPrice: 820,  subtotal: 820  },
        { productName: 'Nescafé Classic 50g',     sku: 'TEA-003', quantity: 1, unitPrice: 480,  subtotal: 480  },
      ],
      subtotal: 3500, discount: 0, total: 3500, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2025-12-08'), updatedAt: new Date('2025-12-08'),
    },
    {
      orderId: 'ORD-SEED-040', source: 'online',
      customerName: 'Tharaka Kumara', customerEmail: 'tharaka.k@gmail.com', customerPhone: '+94 71 012 3456',
      items: [
        { productName: 'McCain French Fries 750g',    sku: 'FRZ-002', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Frozen Prawns 250g',           sku: 'FRZ-006', quantity: 1, unitPrice: 680, subtotal: 680 },
        { productName: 'Frozen Chicken Nuggets 300g', sku: 'FRZ-004', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'EH Vanilla Ice Cream 500ml',  sku: 'DAI-002', quantity: 1, unitPrice: 580, subtotal: 580 },
        { productName: 'EH Chocolate Ice Cream 500ml',sku: 'FRZ-003', quantity: 1, unitPrice: 580, subtotal: 580 },
      ],
      subtotal: 3070, discount: 0, total: 3070, status: 'delivered',
      paymentMethod: 'Bank Transfer', paymentStatus: 'paid',
      deliveryAddress: 'No. 15, Rajapaksha Mawatha, Gampaha', storeId: STORE_ID,
      createdAt: new Date('2026-01-05'), updatedAt: new Date('2026-01-05'),
    },
    {
      orderId: 'ORD-SEED-041', source: 'physical',
      customerName: 'Tharaka Kumara', customerEmail: 'tharaka.k@gmail.com', customerPhone: '+94 71 012 3456',
      items: [
        { productName: 'Anchor Butter 200g',       sku: 'DAI-001', quantity: 1, unitPrice: 490, subtotal: 490 },
        { productName: 'Eggs Tray of 12',           sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Anchor Full Cream Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 },
        { productName: 'Carrot 1kg',               sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Potato 1kg',               sku: 'VEG-003', quantity: 1, unitPrice: 200, subtotal: 200 },
      ],
      subtotal: 1600, discount: 0, total: 1600, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-10'), updatedAt: new Date('2026-02-10'),
    },
    {
      orderId: 'ORD-SEED-042', source: 'online',
      customerName: 'Tharaka Kumara', customerEmail: 'tharaka.k@gmail.com', customerPhone: '+94 71 012 3456',
      items: [
        { productName: 'Nestlé Milo 400g',        sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Dilmah Tea Bags 50s',     sku: 'TEA-001', quantity: 2, unitPrice: 390, subtotal: 780 },
        { productName: 'Nescafé Classic 50g',     sku: 'TEA-003', quantity: 1, unitPrice: 480, subtotal: 480 },
        { productName: 'Cowhead Orange Juice 1L', sku: 'JUS-002', quantity: 1, unitPrice: 480, subtotal: 480 },
      ],
      subtotal: 2390, discount: 0, total: 2390, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 15, Rajapaksha Mawatha, Gampaha', storeId: STORE_ID,
      createdAt: new Date('2026-03-12'), updatedAt: new Date('2026-03-12'),
    },
    {
      orderId: 'ORD-SEED-043', source: 'physical',
      customerName: 'Tharaka Kumara', customerEmail: 'tharaka.k@gmail.com', customerPhone: '+94 71 012 3456',
      items: [
        { productName: 'Apple Imported 1kg', sku: 'FRT-002', quantity: 2, unitPrice: 480, subtotal: 960 },
        { productName: 'Banana bunch ~1kg',  sku: 'FRT-001', quantity: 2, unitPrice: 150, subtotal: 300 },
        { productName: 'Papaya 1kg',         sku: 'FRT-003', quantity: 1, unitPrice: 120, subtotal: 120 },
      ],
      subtotal: 1380, discount: 0, total: 1380, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-04-05'), updatedAt: new Date('2026-04-05'),
    },
    // ── Sanduni Rathnayake ───────────────────────────────────────────────────
    {
      orderId: 'ORD-SEED-044', source: 'physical',
      customerName: 'Sanduni Rathnayake', customerEmail: 'sanduni.r@outlook.com', customerPhone: '+94 76 123 4567',
      items: [
        { productName: 'Eggs Tray of 12',       sku: 'DAI-003', quantity: 1, unitPrice: 380, subtotal: 380 },
        { productName: 'Nestlé Fresh Milk 500ml',sku: 'DAI-007', quantity: 1, unitPrice: 195, subtotal: 195 },
      ],
      subtotal: 575, discount: 0, total: 575, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: new Date('2026-02-15'), updatedAt: new Date('2026-02-15'),
    },
    {
      orderId: 'ORD-SEED-045', source: 'online',
      customerName: 'Sanduni Rathnayake', customerEmail: 'sanduni.r@outlook.com', customerPhone: '+94 76 123 4567',
      items: [
        { productName: 'Nestlé Milo 400g',   sku: 'BEV-004', quantity: 1, unitPrice: 650, subtotal: 650 },
        { productName: 'Dilmah Tea Bags 50s',sku: 'TEA-001', quantity: 1, unitPrice: 390, subtotal: 390 },
      ],
      subtotal: 1040, discount: 0, total: 1040, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid',
      deliveryAddress: 'No. 102, Dutugemunu Street, Kesbewa', storeId: STORE_ID,
      createdAt: new Date('2026-03-20'), updatedAt: new Date('2026-03-20'),
    },
    {
      orderId: 'ORD-SEED-046', source: 'physical',
      customerName: 'Sanduni Rathnayake', customerEmail: 'sanduni.r@outlook.com', customerPhone: '+94 76 123 4567',
      items: [
        { productName: 'Carrot 1kg', sku: 'VEG-001', quantity: 1, unitPrice: 180, subtotal: 180 },
        { productName: 'Tomato 1kg', sku: 'VEG-002', quantity: 1, unitPrice: 150, subtotal: 150 },
      ],
      subtotal: 330, discount: 0, total: 330, status: 'pending',
      paymentMethod: 'Cash', paymentStatus: 'pending', storeId: STORE_ID,
      createdAt: new Date('2026-04-14'), updatedAt: new Date('2026-04-14'),
    },
  ];

  for (const o of orderDocs) {
    const exists = await Order.findOne({ orderId: o.orderId });
    if (!exists) {
      await Order.collection.insertOne(o); // bypass Mongoose auto-timestamp to preserve createdAt
      console.log(`✓ Order created: ${o.orderId} – ${o.customerName}`);
    } else {
      console.log(`  Order ${o.orderId} already exists – skipping`);
    }
  }

  // ── 8. Sync Customer stats from real Order data ────────────────────────────
  console.log('');
  for (const c of customers) {
    const orders = await Order.find({ customerEmail: c.email, storeId: STORE_ID });
    if (orders.length === 0) continue;
    const totalOrders  = orders.length;
    const totalSpent   = orders.reduce((sum, o) => sum + o.total, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastPurchase = orders.reduce((latest, o) => {
      const d = (o as any).createdAt as Date;
      return d > latest ? d : latest;
    }, new Date(0));
    await Customer.findOneAndUpdate(
      { email: c.email, storeId: STORE_ID },
      { $set: { totalOrders, totalSpent, lastPurchase } }
    );
    console.log(`✓ Stats synced: ${c.name} → ${totalOrders} orders, LKR ${totalSpent.toLocaleString()}`);
  }

  console.log('\nSeeding complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
