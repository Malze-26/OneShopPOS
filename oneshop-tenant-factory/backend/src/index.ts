import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import notificationRoutes from './routes/notifications';

export const app = express();
const PORT = process.env.PORT ?? 6000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Tenant Factory running', timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose
    .connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err: Error) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      process.exit(1);
    });

  app.listen(Number(PORT), () => {
    console.log(`🚀 Tenant Factory running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  });
}

// Under Lambda the handler owns connection setup and the runtime owns the
// event loop, so no listener is started there.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  start();
}
