import { Router, Request, Response, NextFunction } from 'express';
import { login, register, getMe } from '../controllers/authController';
import { protect, requireRole } from '../middleware/authMiddleware';
import { AuthRequest } from '../types';

const router = Router();

// Wrap async controllers to forward errors to Express error handler
function asyncHandler(
  fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Public routes
router.post('/login', asyncHandler(login));

// Protected routes
router.post(
  '/register',
  protect,
  requireRole('Manager'),
  asyncHandler(register)
);

router.get('/me', protect, asyncHandler((req, res, next) => getMe(req as AuthRequest, res, next)));

export default router;
