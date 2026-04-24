import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import dotenv from "dotenv";
dotenv.config();
import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import customerRoutes from './routes/customers';
import transactionRoutes from './routes/transactions';
import employeeRoutes from './routes/employees';
import stockRoutes from './routes/stocks';
import promoRoutes from './routes/promos';
import orderRoutes from './routes/orders';
import settingsRoutes from './routes/settings';
import supplierRoutes from './routes/suppliers';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import alertsRoutes from './routes/alerts';
import tenantRoutes from './routes/tenants';
import { tenantMiddleware } from './middleware/tenantMiddleware';

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = new Set([
        'http://localhost:3000',
        'http://localhost:3001',
        ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      ]);
      if (!origin || allowed.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Tenant resolution ─────────────────────────────────────────────────────────
// Runs before every route; populates req.tenantDb and req.models when the
// OneShop-Tenant-ID header is present.
app.use(tenantMiddleware);

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public — no tenant or auth required
app.use('/api/tenants', tenantRoutes);

// All remaining routes require a valid OneShop-Tenant-ID header
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ message: err.message ?? 'Internal server error' });
});

// ── Database + Server start ───────────────────────────────────────────────────
async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('⚠ MONGODB_URI is not set in .env - running without database');
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB cluster');
    } catch (err) {
      console.warn('⚠ MongoDB connection error:', err instanceof Error ? err.message : err);
      console.warn('⚠ Continuing without database connection');
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
}

start();
