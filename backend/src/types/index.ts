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
}

/**
 * Extended Express Request that carries the authenticated user,
 * the tenant-specific mongoose Connection, and the model registry for
 * that tenant's database.
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
  tenantDb?: Connection;
  models?: TenantModels;
}
