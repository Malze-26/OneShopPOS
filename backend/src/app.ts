import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
import shiftRoutes from './routes/shifts';
import uploadRoutes from './routes/uploads';
import { tenantMiddleware } from './middleware/tenantMiddleware';

const app = express();

/**
 * Every tenant lives on its own subdomain, so the set of valid origins is not
 * a fixed list — it grows each time a shop is provisioned. Accept the platform
 * domain and anything below it (keels.pos.allinoneshop.store included), plus
 * localhost for development.
 *
 * This is not the tenant boundary: tenantMiddleware still resolves the tenant
 * from the hostname and 404s unknown shops. This only decides whose browser
 * may call the API.
 */
function isAllowedOrigin(origin: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  const platform = (process.env.PLATFORM_DOMAIN ?? '').toLowerCase();
  if (!platform) return false;

  return hostname === platform || hostname.endsWith(`.${platform}`);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin navigations, curl, server-to-server.
      if (!origin || isAllowedOrigin(origin)) {
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

app.use(tenantMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/tenants', tenantRoutes);
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
app.use('/api/shifts', shiftRoutes);
app.use('/api/uploads', uploadRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);

  if (err?.code === 11000 || err?.errorResponse?.code === 11000 || err?.message?.includes('E11000')) {
    const isPhone = err.message?.includes('phone') || err?.keyPattern?.phone || err?.errorResponse?.keyPattern?.phone;
    const isEmail = err.message?.includes('email') || err?.keyPattern?.email || err?.errorResponse?.keyPattern?.email;
    const msg = isPhone
      ? 'A customer with this phone number already exists.'
      : isEmail
      ? 'A customer with this email address already exists.'
      : 'A record with this information already exists.';
    res.status(400).json({ message: msg });
    return;
  }

  res.status(err.status || 500).json({ message: err.message ?? 'Internal server error' });
});

export default app;
