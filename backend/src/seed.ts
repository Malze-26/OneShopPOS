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
  const categories = [
    { name: 'Vegetables',        icon: '🥦', color: '#16a34a' },
    { name: 'Fruits',            icon: '🍎', color: '#f97316' },
    { name: 'Meat',              icon: '🥩', color: '#dc2626' },
    { name: 'Seafood',           icon: '🐟', color: '#0ea5e9' },
    { name: 'Processed Meats',   icon: '🥓', color: '#b45309' },
    { name: 'Bakery',            icon: '🍞', color: '#d97706' },
    { name: 'Snacks',            icon: '🍿', color: '#f79009' },
    { name: 'Grains & Pulses',   icon: '🌾', color: '#f59e0b' },
    { name: 'Cooking Essentials',icon: '🧂', color: '#7c3aed' },
    { name: 'Dairy',             icon: '🥛', color: '#12b76a' },
    { name: 'Beverages',         icon: '🥤', color: '#3b82f6' },
    { name: 'Household',         icon: '🏠', color: '#155dfc' },
    { name: 'Personal Care',     icon: '🧴', color: '#ee46bc' },
    { name: 'Baby Care',         icon: '👶', color: '#ec4899' },
    { name: 'Kitchen & Dining',  icon: '🍽️', color: '#6366f1' },
    { name: 'Pet Care',          icon: '🐾', color: '#84cc16' },
    { name: 'Stationery',        icon: '✏️', color: '#64748b' },
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
    { name: 'Coca-Cola 500ml',                       sku: 'BEV-001', category: 'Beverages',     sellingPrice: 180,  costPrice: 130,  stock: 120, lowStockThreshold: 20, description: 'Classic Coca-Cola carbonated soft drink',      images: ['/uploads/products/seed-BEV-001.jpg'] },
    { name: 'Pepsi 500ml',                            sku: 'BEV-002', category: 'Beverages',     sellingPrice: 175,  costPrice: 125,  stock: 95,  lowStockThreshold: 20, description: 'Pepsi cola carbonated soft drink',              images: ['/uploads/products/seed-BEV-002.jpg'] },
    { name: 'Sprite 500ml',                           sku: 'BEV-003', category: 'Beverages',     sellingPrice: 175,  costPrice: 125,  stock: 8,   lowStockThreshold: 20, description: 'Sprite lemon-lime carbonated soft drink',       images: ['/uploads/products/seed-BEV-003.jpg'] },
    { name: 'Nestlé Milo 400g',                       sku: 'BEV-004', category: 'Beverages',     sellingPrice: 650,  costPrice: 500,  stock: 45,  lowStockThreshold: 10, description: 'Chocolate malt drink powder',                   images: ['/uploads/products/seed-BEV-004.jpg'] },
    { name: "Lay's Classic Chips 100g",               sku: 'SNK-001', category: 'Snacks',        sellingPrice: 250,  costPrice: 180,  stock: 60,  lowStockThreshold: 15, description: 'Classic salted potato chips',                   images: ['/uploads/products/seed-SNK-001.jpg'] },
    { name: 'Oreo Cookies 137g',                      sku: 'SNK-002', category: 'Snacks',        sellingPrice: 350,  costPrice: 260,  stock: 0,   lowStockThreshold: 10, description: 'Original chocolate sandwich cookies',           images: ['/uploads/products/seed-SNK-002.jpg'] },
    { name: 'Pringles Original 165g',                 sku: 'SNK-003', category: 'Snacks',        sellingPrice: 750,  costPrice: 580,  stock: 30,  lowStockThreshold: 10, description: 'Stackable potato crisps',                       images: ['/uploads/products/seed-SNK-003.jpg'] },
    { name: 'Munchee Cream Cracker 200g',             sku: 'SNK-004', category: 'Snacks',        sellingPrice: 120,  costPrice: 85,   stock: 5,   lowStockThreshold: 20, description: 'Light cream crackers',                          images: ['/uploads/products/seed-SNK-004.jpg'] },
    { name: 'Anchor Butter 200g',                     sku: 'DAI-001', category: 'Dairy',         sellingPrice: 490,  costPrice: 380,  stock: 25,  lowStockThreshold: 10, description: 'Pure New Zealand butter',                       images: ['/uploads/products/seed-DAI-001.jpg'] },
    { name: 'Elephant House Vanilla Ice Cream 500ml', sku: 'DAI-002', category: 'Dairy',         sellingPrice: 580,  costPrice: 430,  stock: 18,  lowStockThreshold: 10, description: 'Creamy vanilla ice cream',                      images: ['/uploads/products/seed-DAI-002.jpg'] },
    { name: 'Sunlight Dish Wash 500ml',               sku: 'CLN-001', category: 'Cleaning',      sellingPrice: 290,  costPrice: 210,  stock: 50,  lowStockThreshold: 15, description: 'Lemon dishwashing liquid',                      images: ['/uploads/products/seed-CLN-001.jpg'] },
    { name: 'Dove Soap Bar 100g',                     sku: 'CRE-001', category: 'Personal Care', sellingPrice: 220,  costPrice: 160,  stock: 40,  lowStockThreshold: 15, description: 'Moisturising beauty bar',                       images: ['/uploads/products/seed-CRE-001.jpg'] },
    { name: 'Colgate Toothpaste 150g',                sku: 'CRE-002', category: 'Personal Care', sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Strong teeth fluoride toothpaste',              images: ['/uploads/products/seed-CRE-002.jpg'] },
    { name: 'Araliya Basmati Rice 1kg',               sku: 'GRN-001', category: 'Grains',        sellingPrice: 380,  costPrice: 290,  stock: 80,  lowStockThreshold: 20, description: 'Premium long-grain basmati rice',               images: ['/uploads/products/seed-GRN-001.jpg'] },
    { name: 'Soya Meat 100g',                         sku: 'PAN-001', category: 'Pantry',        sellingPrice: 145,  costPrice: 100,  stock: 70,  lowStockThreshold: 20, description: 'Textured soy protein chunks',                   images: ['/uploads/products/seed-PAN-001.jpg'] },
  ];

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
        createdBy: admin._id,
      });
      console.log(`✓ Product created: ${p.name}${imageExists ? ' (with image)' : ' (no image)'}`);
    } else {
      // Back-fill image if product exists but has no image yet
      if (imageExists && exists.images.length === 0) {
        exists.images = p.images;
        await exists.save();
        console.log(`  Updated image for: ${p.name}`);
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
