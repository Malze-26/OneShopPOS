import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  getTransactionStats,
} from '../controllers/transactionController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats', asyncHandler(getTransactionStats));
router.get('/', asyncHandler(getTransactions));
router.get('/:id', asyncHandler(getTransaction));
router.post('/', asyncHandler(createTransaction));

export default router;
