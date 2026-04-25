import mongoose from 'mongoose';

/**
 * Returns a mongoose Connection scoped to the given tenant database.
 * Uses mongoose's built-in useDb cache so the same Connection object is
 * reused across requests for the same tenant — no extra connection is opened.
 */
export function getTenantConnection(dbName: string): mongoose.Connection {
  return mongoose.connection.useDb(dbName, { useCache: true });
}
