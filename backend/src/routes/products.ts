import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  importCSV,
} from '../controllers/productController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// All product routes require authentication
router.use(protect);

router.get('/', asyncHandler(getProducts));

// Manager-only write operations
router.post('/', requireRole('Manager'), asyncHandler(createProduct));
router.post('/bulk/import-csv', requireRole('Manager'), asyncHandler(importCSV));

// Parameterised routes below static ones
router.get('/:id', asyncHandler(getProduct));
router.put('/:id', requireRole('Manager'), asyncHandler(updateProduct));
router.delete('/:id', requireRole('Manager'), asyncHandler(deleteProduct));
router.post('/:id/adjust-stock', requireRole('Manager'), asyncHandler(adjustStock));

export default router;
