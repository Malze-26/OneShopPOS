import mongoose from 'mongoose';
import { configure } from '@codegenie/serverless-express';
import app from './app';

/**
 * Wraps the POS Express app for Lambda.
 *
 * index.ts owns both the listener and the mongoose.connect() call, so neither
 * runs here. The connection is instead established once per container and
 * cached at module scope: Lambda reuses a warm container across invocations,
 * so only a cold start pays the Atlas handshake. Without this every request
 * would open a new pool and exhaust the cluster's connection limit.
 */
let connection: Promise<typeof mongoose> | undefined;

function connect(): Promise<typeof mongoose> {
  connection ??= mongoose.connect(process.env.MONGODB_URI as string, {
    // Each container serves one request at a time, so a large pool is waste.
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
  });
  return connection;
}

const expressHandler = configure({ app });

export const handler = async (event: unknown, context: any) => {
  // Let the response return without waiting for the event loop to drain,
  // so the cached connection survives into the next invocation.
  context.callbackWaitsForEmptyEventLoop = false;
  await connect();
  return expressHandler(event, context);
};
