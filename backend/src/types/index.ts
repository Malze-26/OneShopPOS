import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

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
 * Extended Express Request that carries the authenticated user.
 * Used across all protected controllers and middleware.
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
}
