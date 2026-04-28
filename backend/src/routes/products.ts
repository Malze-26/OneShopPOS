import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import {
  getProducts,
  getProduct,
  getProductStats,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  importCSV,
  uploadProductImages,
  deleteProductImage,
} from '../controllers/productController';
import { uploadMiddleware } from '../middleware/upload';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// All product routes require authentication
router.use(protect);

router.get('/', asyncHandler(getProducts));
router.get('/stats', asyncHandler(getProductStats));

// Manager-only write operations
router.post('/', requireRole('Manager'), asyncHandler(createProduct));
router.post('/bulk/import-csv', requireRole('Manager'), asyncHandler(importCSV));

// Parameterised routes below static ones
router.get('/:id', asyncHandler(getProduct));
router.put('/:id', requireRole('Manager'), asyncHandler(updateProduct));
router.delete('/:id', requireRole('Manager'), asyncHandler(deleteProduct));
router.post('/:id/adjust-stock', requireRole('Manager'), asyncHandler(adjustStock));

// Image upload / delete (Manager only)
router.post('/:id/images', requireRole('Manager'), uploadMiddleware.array('images', 10), asyncHandler(uploadProductImages));
router.delete('/:id/images/:filename', requireRole('Manager'), asyncHandler(deleteProductImage));

export default router;
