import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  getCustomerStats,
} from '../controllers/customerController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats', asyncHandler(getCustomerStats));
router.get('/', asyncHandler(getCustomers));
router.get('/:id', asyncHandler(getCustomer));
router.post('/', asyncHandler(createCustomer));

export default router;
