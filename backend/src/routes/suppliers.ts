import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import {
  getSuppliers,
  getSupplierStats,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats', asyncHandler(getSupplierStats));
router.get('/', asyncHandler(getSuppliers));
router.get('/:id', asyncHandler(getSupplier));
router.post('/', requireRole('Manager'), asyncHandler(createSupplier));
router.patch('/:id', requireRole('Manager'), asyncHandler(updateSupplier));
router.delete('/:id', requireRole('Manager'), asyncHandler(deleteSupplier));

export default router;
