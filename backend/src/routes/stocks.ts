import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { getGRNs, createGRN, getGRN, getStockHistory } from '../controllers/stockController';
import {
  getReturns,
  createReturn,
  getReturn,
  getReturnStats,
  getExpiringProducts,
} from '../controllers/supplierReturnController';
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

// Products whose stock has expired or is close to it — the return worklist.
router.get('/expiring', asyncHandler(getExpiringProducts));

// '/returns/stats' must precede '/returns/:id' or 'stats' is read as an id.
router.get('/returns/stats', asyncHandler(getReturnStats));
router.get('/returns', asyncHandler(getReturns));
router.post('/returns', requireRole('Manager'), asyncHandler(createReturn));
router.get('/returns/:id', asyncHandler(getReturn));

export default router;
