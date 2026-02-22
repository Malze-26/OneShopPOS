/**
 * Seed script – creates initial Manager, cashier employees, categories, and sample products.
 * Run once: npx ts-node src/seed.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Category } from './models/Category';
import { Product } from './models/Product';
import { Customer } from './models/Customer';

const STORE_ID = 'STORE-2025-001';

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

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
    console.log('✓ Manager created: admin@oneshop.lk / Admin@1234');
  } else {
    console.log('  Manager already exists – skipping');
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
    { name: 'Beverages',     icon: '🥤', color: '#3b82f6' },
    { name: 'Snacks',        icon: '🍿', color: '#f79009' },
    { name: 'Dairy',         icon: '🥛', color: '#12b76a' },
    { name: 'Cleaning',      icon: '🧹', color: '#155dfc' },
    { name: 'Personal Care', icon: '🧴', color: '#ee46bc' },
    { name: 'Grains',        icon: '🌾', color: '#f59e0b' },
    { name: 'Pantry',        icon: '🥫', color: '#6366f1' },
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
    { name: 'Coca-Cola 500ml',                       sku: 'BEV-001', category: 'Beverages',     sellingPrice: 180,  costPrice: 130,  stock: 120, lowStockThreshold: 20, description: 'Classic Coca-Cola carbonated soft drink' },
    { name: 'Pepsi 500ml',                            sku: 'BEV-002', category: 'Beverages',     sellingPrice: 175,  costPrice: 125,  stock: 95,  lowStockThreshold: 20, description: 'Pepsi cola carbonated soft drink' },
    { name: 'Sprite 500ml',                           sku: 'BEV-003', category: 'Beverages',     sellingPrice: 175,  costPrice: 125,  stock: 8,   lowStockThreshold: 20, description: 'Sprite lemon-lime carbonated soft drink' },
    { name: 'Nestlé Milo 400g',                       sku: 'BEV-004', category: 'Beverages',     sellingPrice: 650,  costPrice: 500,  stock: 45,  lowStockThreshold: 10, description: 'Chocolate malt drink powder' },
    { name: "Lay's Classic Chips 100g",               sku: 'SNK-001', category: 'Snacks',        sellingPrice: 250,  costPrice: 180,  stock: 60,  lowStockThreshold: 15, description: 'Classic salted potato chips' },
    { name: 'Oreo Cookies 137g',                      sku: 'SNK-002', category: 'Snacks',        sellingPrice: 350,  costPrice: 260,  stock: 0,   lowStockThreshold: 10, description: 'Original chocolate sandwich cookies' },
    { name: 'Pringles Original 165g',                 sku: 'SNK-003', category: 'Snacks',        sellingPrice: 750,  costPrice: 580,  stock: 30,  lowStockThreshold: 10, description: 'Stackable potato crisps' },
    { name: 'Munchee Cream Cracker 200g',             sku: 'SNK-004', category: 'Snacks',        sellingPrice: 120,  costPrice: 85,   stock: 5,   lowStockThreshold: 20, description: 'Light cream crackers' },
    { name: 'Anchor Butter 200g',                     sku: 'DAI-001', category: 'Dairy',         sellingPrice: 490,  costPrice: 380,  stock: 25,  lowStockThreshold: 10, description: 'Pure New Zealand butter' },
    { name: 'Elephant House Vanilla Ice Cream 500ml', sku: 'DAI-002', category: 'Dairy',         sellingPrice: 580,  costPrice: 430,  stock: 18,  lowStockThreshold: 10, description: 'Creamy vanilla ice cream' },
    { name: 'Sunlight Dish Wash 500ml',               sku: 'CLN-001', category: 'Cleaning',      sellingPrice: 290,  costPrice: 210,  stock: 50,  lowStockThreshold: 15, description: 'Lemon dishwashing liquid' },
    { name: 'Dove Soap Bar 100g',                     sku: 'CRE-001', category: 'Personal Care', sellingPrice: 220,  costPrice: 160,  stock: 40,  lowStockThreshold: 15, description: 'Moisturising beauty bar' },
    { name: 'Colgate Toothpaste 150g',                sku: 'CRE-002', category: 'Personal Care', sellingPrice: 350,  costPrice: 260,  stock: 35,  lowStockThreshold: 10, description: 'Strong teeth fluoride toothpaste' },
    { name: 'Araliya Basmati Rice 1kg',               sku: 'GRN-001', category: 'Grains',        sellingPrice: 380,  costPrice: 290,  stock: 80,  lowStockThreshold: 20, description: 'Premium long-grain basmati rice' },
    { name: 'Soya Meat 100g',                         sku: 'PAN-001', category: 'Pantry',        sellingPrice: 145,  costPrice: 100,  stock: 70,  lowStockThreshold: 20, description: 'Textured soy protein chunks' },
  ];

  for (const p of products) {
    const exists = await Product.findOne({ sku: p.sku });
    if (!exists) {
      await Product.create({ ...p, storeId: STORE_ID, createdBy: admin._id });
      console.log(`✓ Product created: ${p.name}`);
    } else {
      console.log(`  Product ${p.sku} already exists – skipping`);
    }
  }

  // ── 5. Seed Customers ──────────────────────────────────────────────────────
  const customers = [
    { name: 'Amal Perera',        email: 'amal.perera@gmail.com',    phone: '+94 71 234 5678', totalOrders: 24, totalSpent: 234000, lastPurchase: new Date('2026-02-20') },
    { name: 'Nimali Fernando',    email: 'nimali.f@yahoo.com',        phone: '+94 76 345 6789', totalOrders: 18, totalSpent: 189500, lastPurchase: new Date('2026-02-19') },
    { name: 'Kasun Rajapaksa',    email: 'kasun.r@gmail.com',         phone: '+94 77 456 7890', totalOrders: 32, totalSpent: 456200, lastPurchase: new Date('2026-02-20') },
    { name: 'Dilani Wickramasinghe', email: 'dilani.w@hotmail.com',   phone: '+94 78 567 8901', totalOrders: 12, totalSpent: 145000, lastPurchase: new Date('2026-02-18') },
    { name: 'Ruwan Silva',        email: 'ruwan.silva@gmail.com',     phone: '+94 71 678 9012', totalOrders: 28, totalSpent: 312800, lastPurchase: new Date('2026-02-20') },
    { name: 'Chamari Bandara',    email: 'chamari.b@gmail.com',       phone: '+94 76 789 0123', totalOrders: 15, totalSpent: 178400, lastPurchase: new Date('2026-02-17') },
    { name: 'Pradeep Jayawardena',email: 'pradeep.j@yahoo.com',       phone: '+94 77 890 1234', totalOrders: 21, totalSpent: 267300, lastPurchase: new Date('2026-02-19') },
    { name: 'Shalini Dissanayake',email: 'shalini.d@gmail.com',       phone: '+94 78 901 2345', totalOrders:  9, totalSpent:  98600, lastPurchase: new Date('2026-02-16') },
    { name: 'Tharaka Kumara',     email: 'tharaka.k@gmail.com',       phone: '+94 71 012 3456', totalOrders: 35, totalSpent: 498700, lastPurchase: new Date('2026-02-21') },
    { name: 'Sanduni Rathnayake', email: 'sanduni.r@outlook.com',     phone: '+94 76 123 4567', totalOrders:  7, totalSpent:  76200, lastPurchase: new Date('2026-02-15') },
  ];

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
