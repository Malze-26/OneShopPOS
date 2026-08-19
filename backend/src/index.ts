import 'dotenv/config';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import app from './app';

const PORT = process.env.PORT ?? 5000;

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
