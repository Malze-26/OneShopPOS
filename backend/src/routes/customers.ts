import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  getCustomerStats,
} from '../controllers/customerController';
import { AuthRequest } from '../types';
import { updateCustomer, deleteCustomer } from '../controllers/customerController';


const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats', asyncHandler(getCustomerStats));
router.get('/', asyncHandler(getCustomers));
router.get('/:id', asyncHandler(getCustomer));
router.post('/', asyncHandler(createCustomer));
router.put('/:id', asyncHandler(updateCustomer));
router.delete('/:id', asyncHandler(deleteCustomer));

export default router;
