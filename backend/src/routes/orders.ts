import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { getOrders, getOrderStats, getOrder, createOrder, confirmOrder, updateOrderStatus, syncEcomOrders } from '../controllers/orderController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats',         asyncHandler(getOrderStats));
router.get('/',              asyncHandler(getOrders));
router.get('/:id',           asyncHandler(getOrder));
router.post('/',             asyncHandler(createOrder));
router.post('/sync',         requireRole('Manager'), asyncHandler(syncEcomOrders));
router.patch('/:id/confirm', asyncHandler(confirmOrder));
router.patch('/:id/status',  requireRole('Manager'), asyncHandler(updateOrderStatus));

export default router;
