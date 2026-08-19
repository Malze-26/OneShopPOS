import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { getTenantConnection } from '../db/connectionManager';
import { getModels } from '../db/tenantModels';
import { findTenantDbBySubdomain, subdomainFromHost } from '../db/tenantRegistry';

const TENANT_HEADER = 'oneshop-tenant-id';
const DB_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * The hostname the user actually typed. Behind CloudFront or a Lambda Function
 * URL, `Host` is rewritten to the origin's own name and the real hostname
 * arrives in `X-Forwarded-Host`.
 */
function originalHost(req: AuthRequest): string | undefined {
  if (process.env.TRUST_PROXY_HOST === 'true') {
    const forwarded = req.headers['x-forwarded-host'];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first = value?.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.host;
}

/**
 * Resolves the tenant for each request, in priority order:
 *
 *   1. Host subdomain    — keels.pos.allinoneshop.store -> oneshop_keels
 *   2. OneShop-Tenant-ID — the store picker on the login page
 *
 * The host wins so a till bookmarked at its own URL is always pinned to that
 * shop, regardless of what a stale localStorage value says. Requests with
 * neither pass through; requireTenant() rejects them where context is needed.
 */
export async function tenantMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let dbName: string | null = null;

    const subdomain = subdomainFromHost(originalHost(req));
    if (subdomain) {
      dbName = await findTenantDbBySubdomain(subdomain);
      if (!dbName) {
        res.status(404).json({ message: `Unknown store '${subdomain}'` });
        return;
      }
    }

    if (!dbName) {
      const header = req.headers[TENANT_HEADER] as string | undefined;
      if (!header) return next();

      if (!DB_NAME_PATTERN.test(header)) {
        res.status(400).json({ message: 'Invalid OneShop-Tenant-ID header value' });
        return;
      }
      dbName = header;
    }

    const conn = getTenantConnection(dbName);
    req.tenantDb = conn;
    req.tenantDbName = dbName;
    req.models = getModels(conn);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guards routes that require a valid tenant context.
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.tenantDb || !req.models) {
    res.status(400).json({ message: 'OneShop-Tenant-ID header is required' });
    return;
  }
  next();
}
