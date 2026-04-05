import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { createPromo, getPromos, validatePromo, deletePromo, togglePromo } from '../controllers/promoController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// All routes require auth
router.use(protect);

// Validate promo — any logged in user
router.post('/validate', asyncHandler(validatePromo));

// Manager only
router.get('/', requireRole('Manager'), asyncHandler(getPromos));
router.post('/', asyncHandler(createPromo));
router.delete('/:id', requireRole('Manager'), asyncHandler(deletePromo));
router.patch('/:id/toggle', requireRole('Manager'), asyncHandler(togglePromo));

export default router;