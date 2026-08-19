import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { Connection } from 'mongoose';
import { TenantModels } from '../db/tenantModels';

/** All roles supported by the system. */
export type UserRole = 'Manager' | 'Cashier' | 'Sales Representative';

/**
 * Decoded JWT payload shape.
 * Every protected request has req.user populated with this.
 */
export interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  storeId: string;
  /**
   * Tenant database this token was issued for. `protect` refuses a token
   * presented against any other tenant — without it, one JWT_SECRET shared
   * across all tenants lets a session from one store drive another.
   */
  tenant?: string;
}

/**
 * Extended Express Request that carries the authenticated user,
 * the tenant-specific mongoose Connection, and the model registry for
 * that tenant's database.
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
  tenantDb?: Connection;
  /** Name of the tenant database, used to scope S3 object keys. */
  tenantDbName?: string;
  models?: TenantModels;
}
