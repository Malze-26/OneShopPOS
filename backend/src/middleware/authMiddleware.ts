import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, TokenPayload, UserRole } from '../types';

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches the decoded payload to req.user for downstream handlers.
 * Returns 401 if the token is missing, malformed, or expired.
 */
export function protect(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  // Every tenant shares one JWT_SECRET, so a signature check alone does not
  // prove the caller belongs to the tenant they are addressing. Bind the two.
  if (decoded.tenant && req.tenantDbName && decoded.tenant !== req.tenantDbName) {
    res.status(401).json({ message: 'This session belongs to a different store' });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * Role-based access guard. Pass one or more allowed roles.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * @example
 *   router.post('/register', protect, requireRole('Manager'), handler);
 *   router.get('/pos', protect, requireRole('Cashier', 'Sales Representative'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
