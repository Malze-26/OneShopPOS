import mongoose from 'mongoose';

/**
 * Read-only view of the tenant-factory `tenants` collection — enough to map a
 * hostname to a tenant database. The factory owns this schema.
 */
const tenantReadSchema = new mongoose.Schema(
  {
    businessName: String,
    databaseName: String,
    status: String,
  },
  { collection: 'tenants' }
);

const FACTORY_DB = process.env.TENANT_FACTORY_DB || 'oneshop-tenant-factory';
const CACHE_TTL_MS = Number(process.env.TENANT_CACHE_TTL_MS ?? 60_000);

const cache = new Map<string, { value: string | null; expiresAt: number }>();

/** `oneshop_open_door` -> `opendoor`, `Open-Door` -> `opendoor`. */
export function normalizeTenantKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/^oneshop[-_]/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts the tenant label from a POS hostname.
 *
 * The tenant is the FIRST label — `keels.pos.allinoneshop.store` — because a
 * wildcard certificate matches exactly one label. `*.pos.allinoneshop.store`
 * therefore covers every tenant, and onboarding needs no certificate work.
 */
export function subdomainFromHost(host: string | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(':')[0].toLowerCase();
  if (/^[\d.]+$/.test(hostname) || hostname === 'localhost') return null;

  const labels = hostname.split('.');
  if (labels.length < 3) return null;

  const sub = labels[0];
  // `pos.allinoneshop.store` itself carries no tenant — fall through so the
  // login page can offer the store picker.
  if (sub === 'www' || sub === 'api' || sub === 'pos') return null;

  return sub;
}

/** Resolves a subdomain to its tenant database name, or null if unknown. */
export async function findTenantDbBySubdomain(subdomain: string): Promise<string | null> {
  const key = normalizeTenantKey(subdomain);

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const factoryConn = mongoose.connection.useDb(FACTORY_DB, { useCache: true });
  const Tenant =
    factoryConn.models['Tenant'] ?? factoryConn.model('Tenant', tenantReadSchema);

  const rows = await Tenant.find({ status: 'active', databaseName: { $ne: null } })
    .select('businessName databaseName')
    .lean<Array<{ businessName: string; databaseName: string }>>();

  const match =
    rows.find((t) => normalizeTenantKey(t.databaseName) === key) ??
    rows.find((t) => normalizeTenantKey(t.businessName) === key) ??
    null;

  const value = match?.databaseName ?? null;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function clearTenantCache(): void {
  cache.clear();
}
