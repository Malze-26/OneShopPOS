import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { getTenantConnection } from '../db/connectionManager';
import { getModels } from '../db/tenantModels';

const TENANT_HEADER = 'oneshop-tenant-id';

/**
 * Reads the OneShop-Tenant-ID header and attaches the tenant's mongoose
 * Connection and pre-built Model map to the request.
 * If the header is absent the request passes through without tenant context
 * (route handlers that need it should call requireTenant() afterwards).
 */
export function tenantMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const tenantId = req.headers[TENANT_HEADER] as string | undefined;

  if (!tenantId) {
    return next();
  }

  if (!tenantId.startsWith('oneshop_')) {
    res.status(400).json({ message: 'Invalid OneShop-Tenant-ID header value' });
    return;
  }

  const conn = getTenantConnection(tenantId);
  req.tenantDb = conn;
  req.models = getModels(conn);
  next();
}

/**
 * Guards routes that require a valid tenant context.
 * Returns 400 if the OneShop-Tenant-ID header was missing or invalid.
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.tenantDb || !req.models) {
    res.status(400).json({ message: 'OneShop-Tenant-ID header is required' });
    return;
  }
  next();
}
