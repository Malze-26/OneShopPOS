import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { getGRNs, createGRN, getGRN, getStockHistory } from '../controllers/stockController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/history', asyncHandler(getStockHistory));

router.get('/grns', asyncHandler(getGRNs));
router.post('/grns', requireRole('Manager'), asyncHandler(createGRN));
router.get('/grns/:id', asyncHandler(getGRN));

export default router;
