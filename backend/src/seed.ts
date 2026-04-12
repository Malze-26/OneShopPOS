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
    // ── Tea & Coffee ─────────────────────────────────────────────────────────
    { name: 'Dilmah Tea Bags 50s',              sku: 'TEA-001', category: 'Tea & Coffee',          sellingPrice: 390,  costPrice: 290,  stock: 40,  lowStockThreshold: 10, description: 'Premium Ceylon tea bags' },
    { name: 'Lipton Yellow Label Tea 100g',     sku: 'TEA-002', category: 'Tea & Coffee',          sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Classic black tea leaves' },
    { name: 'Nescafé Classic 50g',              sku: 'TEA-003', category: 'Tea & Coffee',          sellingPrice: 480,  costPrice: 360,  stock: 30,  lowStockThreshold: 8,  description: 'Instant coffee' },
    // ── Juices & Cordials ────────────────────────────────────────────────────
    { name: 'Kist Mango Juice 200ml',           sku: 'JUS-001', category: 'Juices & Cordials',     sellingPrice: 85,   costPrice: 60,   stock: 72,  lowStockThreshold: 20, description: 'Mango flavoured juice drink' },
    { name: 'Cowhead Orange Juice 1L',          sku: 'JUS-002', category: 'Juices & Cordials',     sellingPrice: 480,  costPrice: 360,  stock: 25,  lowStockThreshold: 8,  description: '100% orange juice' },
    { name: 'Ribena Blackcurrant 500ml',        sku: 'JUS-003', category: 'Juices & Cordials',     sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 8,  description: 'Blackcurrant cordial' },
    // ── Dairy & Eggs ─────────────────────────────────────────────────────────
    { name: 'Anchor Butter 200g',               sku: 'DAI-001', category: 'Dairy & Eggs',          sellingPrice: 490,  costPrice: 380,  stock: 25,  lowStockThreshold: 10, description: 'Pure New Zealand butter',                      images: ['/uploads/products/seed-DAI-001.jpg'] },
    { name: 'Eggs Tray of 12',                  sku: 'DAI-003', category: 'Dairy & Eggs',          sellingPrice: 380,  costPrice: 280,  stock: 40,  lowStockThreshold: 10, description: 'Fresh farm eggs' },
    { name: 'Anchor Full Cream Milk 1L',        sku: 'DAI-004', category: 'Dairy & Eggs',          sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Fresh pasteurised full cream milk' },
    { name: 'Buffalo Curd 400g',                sku: 'DAI-005', category: 'Dairy & Eggs',          sellingPrice: 220,  costPrice: 160,  stock: 25,  lowStockThreshold: 8,  description: 'Natural buffalo curd' },
    // ── Chilled Food ─────────────────────────────────────────────────────────
    { name: 'Anchor Cheese Slices 200g',        sku: 'CHF-001', category: 'Chilled Food',          sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 6,  description: 'Processed cheese slices' },
    { name: 'Nestlé Yoghurt 100g',              sku: 'CHF-002', category: 'Chilled Food',          sellingPrice: 120,  costPrice: 85,   stock: 35,  lowStockThreshold: 10, description: 'Flavoured yoghurt' },
    { name: 'Anchor Cooking Cream 200ml',       sku: 'CHF-003', category: 'Chilled Food',          sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 6,  description: 'Cooking cream for curries and desserts' },
    // ── Frozen Food ──────────────────────────────────────────────────────────
    { name: 'EH Vanilla Ice Cream 500ml',       sku: 'DAI-002', category: 'Frozen Food',           sellingPrice: 580,  costPrice: 430,  stock: 18,  lowStockThreshold: 6,  description: 'Creamy vanilla ice cream',                     images: ['/uploads/products/seed-DAI-002.jpg'] },
    { name: 'Frozen Fish Fingers 300g',         sku: 'FRZ-001', category: 'Frozen Food',           sellingPrice: 480,  costPrice: 355,  stock: 20,  lowStockThreshold: 6,  description: 'Ready-to-cook breaded fish fingers' },
    { name: 'McCain French Fries 750g',         sku: 'FRZ-002', category: 'Frozen Food',           sellingPrice: 650,  costPrice: 480,  stock: 15,  lowStockThreshold: 5,  description: 'Straight cut frozen fries' },
    // ── Vegetables ───────────────────────────────────────────────────────────
    { name: 'Carrot 1kg',                       sku: 'VEG-001', category: 'Vegetables',            sellingPrice: 180,  costPrice: 120,  stock: 50,  lowStockThreshold: 15, description: 'Fresh local carrots' },
    { name: 'Tomato 1kg',                       sku: 'VEG-002', category: 'Vegetables',            sellingPrice: 150,  costPrice: 100,  stock: 60,  lowStockThreshold: 15, description: 'Fresh ripe tomatoes' },
    { name: 'Potato 1kg',                       sku: 'VEG-003', category: 'Vegetables',            sellingPrice: 200,  costPrice: 140,  stock: 80,  lowStockThreshold: 20, description: 'Fresh local potatoes' },
    { name: 'Leeks 500g',                       sku: 'VEG-004', category: 'Vegetables',            sellingPrice: 120,  costPrice: 80,   stock: 40,  lowStockThreshold: 12, description: 'Fresh leeks' },
    // ── Fruits ───────────────────────────────────────────────────────────────
    { name: 'Banana bunch ~1kg',                sku: 'FRT-001', category: 'Fruits',                sellingPrice: 150,  costPrice: 100,  stock: 40,  lowStockThreshold: 10, description: 'Fresh ripe bananas' },
    { name: 'Apple Imported 1kg',               sku: 'FRT-002', category: 'Fruits',                sellingPrice: 480,  costPrice: 350,  stock: 30,  lowStockThreshold: 10, description: 'Imported fresh apples' },
    { name: 'Papaya 1kg',                       sku: 'FRT-003', category: 'Fruits',                sellingPrice: 120,  costPrice: 80,   stock: 25,  lowStockThreshold: 8,  description: 'Fresh ripe papaya' },
    // ── Meat & Poultry ───────────────────────────────────────────────────────
    { name: 'Chicken Whole 1kg',                sku: 'MET-001', category: 'Meat & Poultry',        sellingPrice: 850,  costPrice: 630,  stock: 20,  lowStockThreshold: 5,  description: 'Fresh whole chicken' },
    { name: 'Chicken Breast 500g',              sku: 'MET-002', category: 'Meat & Poultry',        sellingPrice: 550,  costPrice: 400,  stock: 25,  lowStockThreshold: 8,  description: 'Boneless chicken breast' },
    { name: 'Beef 500g',                        sku: 'MET-003', category: 'Meat & Poultry',        sellingPrice: 700,  costPrice: 520,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh beef cuts' },
    // ── Processed Meats ──────────────────────────────────────────────────────
    { name: 'EH Chicken Sausages 200g',         sku: 'PRM-001', category: 'Processed Meats',       sellingPrice: 350,  costPrice: 255,  stock: 30,  lowStockThreshold: 8,  description: 'Elephant House chicken sausages' },
    { name: 'Prima Ham 100g',                   sku: 'PRM-002', category: 'Processed Meats',       sellingPrice: 280,  costPrice: 205,  stock: 25,  lowStockThreshold: 8,  description: 'Sliced cooked ham' },
    // ── Seafood ──────────────────────────────────────────────────────────────
    { name: 'Fresh Tuna 500g',                  sku: 'SEA-001', category: 'Seafood',               sellingPrice: 600,  costPrice: 440,  stock: 20,  lowStockThreshold: 5,  description: 'Fresh yellowfin tuna' },
    { name: 'Tiger Prawns 250g',                sku: 'SEA-002', category: 'Seafood',               sellingPrice: 750,  costPrice: 550,  stock: 15,  lowStockThreshold: 5,  description: 'Fresh tiger prawns' },
    { name: 'Dried Fish Karawala 250g',         sku: 'SEA-003', category: 'Seafood',               sellingPrice: 400,  costPrice: 295,  stock: 30,  lowStockThreshold: 8,  description: 'Dried salted fish' },
    // ── Rice & Grains ─────────────────────────────────────────────────────────
    { name: 'Araliya Basmati Rice 1kg',         sku: 'GRN-001', category: 'Rice & Grains',         sellingPrice: 380,  costPrice: 290,  stock: 80,  lowStockThreshold: 20, description: 'Premium long-grain basmati rice',              images: ['/uploads/products/seed-GRN-001.jpg'] },
    { name: 'Keeri Samba Rice 5kg',             sku: 'RCG-001', category: 'Rice & Grains',         sellingPrice: 1200, costPrice: 900,  stock: 30,  lowStockThreshold: 8,  description: 'Premium Sri Lankan short-grain rice' },
    { name: 'Red Raw Rice 5kg',                 sku: 'RCG-002', category: 'Rice & Grains',         sellingPrice: 950,  costPrice: 700,  stock: 35,  lowStockThreshold: 8,  description: 'Nutritious red raw rice' },
    { name: 'Quaker Oats 500g',                 sku: 'RCG-003', category: 'Rice & Grains',         sellingPrice: 280,  costPrice: 205,  stock: 40,  lowStockThreshold: 10, description: 'Rolled oats' },
    // ── Flour & Baking ───────────────────────────────────────────────────────
    { name: 'Prima Flour 1kg',                  sku: 'FLB-001', category: 'Flour & Baking',        sellingPrice: 250,  costPrice: 185,  stock: 50,  lowStockThreshold: 15, description: 'All-purpose wheat flour' },
    { name: 'White Sugar 1kg',                  sku: 'FLB-002', category: 'Flour & Baking',        sellingPrice: 280,  costPrice: 210,  stock: 60,  lowStockThreshold: 15, description: 'Refined white sugar' },
    { name: 'Brown Sugar 500g',                 sku: 'FLB-003', category: 'Flour & Baking',        sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Unrefined brown sugar' },
    // ── Pasta & Noodles ──────────────────────────────────────────────────────
    { name: 'Maggi Noodles 78g',                sku: 'NDL-001', category: 'Pasta & Noodles',       sellingPrice: 120,  costPrice: 85,   stock: 80,  lowStockThreshold: 20, description: 'Instant chicken noodles' },
    { name: 'Indomie Mi Goreng 80g',            sku: 'NDL-002', category: 'Pasta & Noodles',       sellingPrice: 140,  costPrice: 100,  stock: 60,  lowStockThreshold: 15, description: 'Indonesian fried noodles' },
    { name: 'Penne Pasta 500g',                 sku: 'NDL-003', category: 'Pasta & Noodles',       sellingPrice: 280,  costPrice: 200,  stock: 30,  lowStockThreshold: 8,  description: 'Italian penne pasta' },
    // ── Canned & Preserved ───────────────────────────────────────────────────
    { name: 'Soya Meat 100g',                   sku: 'PAN-001', category: 'Canned & Preserved',    sellingPrice: 145,  costPrice: 100,  stock: 70,  lowStockThreshold: 20, description: 'Textured soy protein chunks',                  images: ['/uploads/products/seed-PAN-001.jpg'] },
    { name: 'Mackerel in Brine 425g',           sku: 'CAN-001', category: 'Canned & Preserved',    sellingPrice: 320,  costPrice: 230,  stock: 45,  lowStockThreshold: 10, description: 'Canned mackerel fish' },
    { name: 'Green Peas Canned 400g',           sku: 'CAN-002', category: 'Canned & Preserved',    sellingPrice: 280,  costPrice: 200,  stock: 35,  lowStockThreshold: 8,  description: 'Canned green peas' },
    { name: 'Tomato Paste 135g',                sku: 'CAN-003', category: 'Canned & Preserved',    sellingPrice: 150,  costPrice: 105,  stock: 50,  lowStockThreshold: 12, description: 'Concentrated tomato paste' },
    // ── Sauces & Condiments ──────────────────────────────────────────────────
    { name: 'Maggi Soy Sauce 625ml',            sku: 'SAU-001', category: 'Sauces & Condiments',   sellingPrice: 380,  costPrice: 280,  stock: 35,  lowStockThreshold: 10, description: 'Light soy sauce' },
    { name: 'Harischandra Chilli Sauce 400g',   sku: 'SAU-002', category: 'Sauces & Condiments',   sellingPrice: 280,  costPrice: 200,  stock: 40,  lowStockThreshold: 10, description: 'Hot chilli sauce' },
    { name: 'Araliya Coconut Cream 400ml',      sku: 'SAU-003', category: 'Sauces & Condiments',   sellingPrice: 180,  costPrice: 130,  stock: 50,  lowStockThreshold: 12, description: 'Rich coconut cream for cooking' },
    { name: 'Sunflower Cooking Oil 1L',         sku: 'SAU-004', category: 'Sauces & Condiments',   sellingPrice: 580,  costPrice: 430,  stock: 30,  lowStockThreshold: 8,  description: 'Pure sunflower cooking oil' },
    // ── Snacks & Biscuits ────────────────────────────────────────────────────
    { name: "Lay's Classic Chips 100g",         sku: 'SNK-001', category: 'Snacks & Biscuits',     sellingPrice: 250,  costPrice: 180,  stock: 60,  lowStockThreshold: 15, description: 'Classic salted potato chips',                  images: ['/uploads/products/seed-SNK-001.jpg'] },
    { name: 'Oreo Cookies 137g',                sku: 'SNK-002', category: 'Snacks & Biscuits',     sellingPrice: 350,  costPrice: 260,  stock: 0,   lowStockThreshold: 10, description: 'Original chocolate sandwich cookies',          images: ['/uploads/products/seed-SNK-002.jpg'] },
    { name: 'Pringles Original 165g',           sku: 'SNK-003', category: 'Snacks & Biscuits',     sellingPrice: 750,  costPrice: 580,  stock: 30,  lowStockThreshold: 10, description: 'Stackable potato crisps',                      images: ['/uploads/products/seed-SNK-003.jpg'] },
    { name: 'Munchee Cream Cracker 200g',       sku: 'SNK-004', category: 'Snacks & Biscuits',     sellingPrice: 120,  costPrice: 85,   stock: 5,   lowStockThreshold: 20, description: 'Light cream crackers',                         images: ['/uploads/products/seed-SNK-004.jpg'] },
    { name: 'Munchee Marie Biscuits 200g',      sku: 'SNK-005', category: 'Snacks & Biscuits',     sellingPrice: 120,  costPrice: 85,   stock: 60,  lowStockThreshold: 15, description: 'Classic marie biscuits' },
    // ── Confectionery ────────────────────────────────────────────────────────
    { name: 'KitKat 2-Finger 17g',              sku: 'CNF-001', category: 'Confectionery',          sellingPrice: 120,  costPrice: 85,   stock: 100, lowStockThreshold: 25, description: 'Milk chocolate wafer bar' },
    { name: 'EH Toffee Assorted 100g',          sku: 'CNF-002', category: 'Confectionery',          sellingPrice: 150,  costPrice: 105,  stock: 80,  lowStockThreshold: 20, description: 'Elephant House assorted toffees' },
    { name: 'Natureland Honey 250g',            sku: 'CNF-003', category: 'Confectionery',          sellingPrice: 580,  costPrice: 430,  stock: 20,  lowStockThreshold: 6,  description: 'Pure natural honey' },
    // ── Bakery ───────────────────────────────────────────────────────────────
    { name: 'Gardenia White Bread 450g',        sku: 'BAK-001', category: 'Bakery',                 sellingPrice: 180,  costPrice: 130,  stock: 20,  lowStockThreshold: 8,  description: 'Soft sliced white bread' },
    { name: 'Butter Buns Pack of 4',            sku: 'BAK-002', category: 'Bakery',                 sellingPrice: 220,  costPrice: 160,  stock: 15,  lowStockThreshold: 6,  description: 'Freshly baked butter buns' },
    { name: 'Seeni Sambol Roll',                sku: 'BAK-003', category: 'Bakery',                 sellingPrice: 80,   costPrice: 55,   stock: 30,  lowStockThreshold: 10, description: 'Traditional Sri Lankan sweet onion roll' },
    // ── Personal Care ────────────────────────────────────────────────────────
    { name: 'Dove Soap Bar 100g',               sku: 'CRE-001', category: 'Personal Care',          sellingPrice: 220,  costPrice: 160,  stock: 40,  lowStockThreshold: 15, description: 'Moisturising beauty bar',                      images: ['/uploads/products/seed-CRE-001.jpg'] },
    { name: 'Sunsilk Shampoo 200ml',            sku: 'PRC-001', category: 'Personal Care',          sellingPrice: 380,  costPrice: 280,  stock: 35,  lowStockThreshold: 10, description: 'Nourishing shampoo for smooth hair' },
    { name: 'Dettol Soap 75g',                  sku: 'PRC-002', category: 'Personal Care',          sellingPrice: 150,  costPrice: 105,  stock: 50,  lowStockThreshold: 15, description: 'Antibacterial protection soap' },
    { name: 'Nivea Body Lotion 200ml',          sku: 'PRC-003', category: 'Personal Care',          sellingPrice: 580,  costPrice: 430,  stock: 25,  lowStockThreshold: 8,  description: 'Moisturising body lotion' },
    // ── Oral Care ────────────────────────────────────────────────────────────
    { name: 'Colgate Toothpaste 150g',          sku: 'CRE-002', category: 'Oral Care',              sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Strong teeth fluoride toothpaste',             images: ['/uploads/products/seed-CRE-002.jpg'] },
    { name: 'Colgate Toothbrush Medium',        sku: 'ORC-001', category: 'Oral Care',              sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Medium bristle toothbrush' },
    { name: 'Sensodyne Toothpaste 75g',         sku: 'ORC-002', category: 'Oral Care',              sellingPrice: 480,  costPrice: 360,  stock: 25,  lowStockThreshold: 8,  description: 'Sensitive teeth toothpaste' },
    // ── Cleaning & Laundry ───────────────────────────────────────────────────
    { name: 'Sunlight Dish Wash 500ml',         sku: 'CLN-001', category: 'Cleaning & Laundry',     sellingPrice: 290,  costPrice: 210,  stock: 50,  lowStockThreshold: 15, description: 'Lemon dishwashing liquid',                     images: ['/uploads/products/seed-CLN-001.jpg'] },
    { name: 'Surf Excel Detergent 1kg',         sku: 'CLN-002', category: 'Cleaning & Laundry',     sellingPrice: 480,  costPrice: 360,  stock: 35,  lowStockThreshold: 10, description: 'Powerful laundry detergent' },
    { name: 'Dettol Floor Cleaner 500ml',       sku: 'CLN-003', category: 'Cleaning & Laundry',     sellingPrice: 380,  costPrice: 280,  stock: 30,  lowStockThreshold: 8,  description: 'Antibacterial floor cleaner' },
    // ── Baby Products ────────────────────────────────────────────────────────
    { name: 'Pampers Diapers S 16ct',           sku: 'BAB-001', category: 'Baby Products',          sellingPrice: 980,  costPrice: 730,  stock: 20,  lowStockThreshold: 5,  description: 'Soft disposable diapers for babies' },
    { name: 'Cerelac Wheat 200g',               sku: 'BAB-002', category: 'Baby Products',          sellingPrice: 580,  costPrice: 430,  stock: 15,  lowStockThreshold: 5,  description: 'Fortified infant cereal' },
    { name: "Johnson's Baby Powder 100g",       sku: 'BAB-003', category: 'Baby Products',          sellingPrice: 320,  costPrice: 235,  stock: 25,  lowStockThreshold: 8,  description: 'Gentle baby powder' },
    // ── Pet Care ─────────────────────────────────────────────────────────────
    { name: 'Pedigree Dog Food 400g',           sku: 'PTC-001', category: 'Pet Care',               sellingPrice: 380,  costPrice: 280,  stock: 20,  lowStockThreshold: 5,  description: 'Complete nutrition for adult dogs' },
    { name: 'Whiskas Cat Food 400g',            sku: 'PTC-002', category: 'Pet Care',               sellingPrice: 350,  costPrice: 255,  stock: 20,  lowStockThreshold: 5,  description: 'Balanced nutrition for adult cats' },
    // ── Kitchen & Dining ─────────────────────────────────────────────────────
    { name: 'Hela Tissue Paper 10 rolls',       sku: 'KTD-001', category: 'Kitchen & Dining',       sellingPrice: 450,  costPrice: 330,  stock: 30,  lowStockThreshold: 8,  description: '2-ply soft tissue rolls' },
    { name: 'Ziplock Bags 50ct',                sku: 'KTD-002', category: 'Kitchen & Dining',       sellingPrice: 180,  costPrice: 130,  stock: 40,  lowStockThreshold: 10, description: 'Resealable food storage bags' },
    { name: 'Melamine Plate Set 6pc',           sku: 'KTD-003', category: 'Kitchen & Dining',       sellingPrice: 1200, costPrice: 880,  stock: 10,  lowStockThreshold: 3,  description: 'Durable melamine dinner plates' },
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

  console.log('\nSeeding complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
