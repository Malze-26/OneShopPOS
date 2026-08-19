import mongoose from 'mongoose';
import { configure } from '@codegenie/serverless-express';
import { app } from './index';

/**
 * Wraps the Tenant Factory API for Lambda, with the connection cached at
 * module scope so a warm container reuses it instead of opening a new pool.
 */
let connection: Promise<typeof mongoose> | undefined;

function connect(): Promise<typeof mongoose> {
  connection ??= mongoose.connect(process.env.MONGODB_URI as string, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
  });
  return connection;
}

const expressHandler = configure({ app });

export const handler = async (event: unknown, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connect();
  return expressHandler(event, context);
};
