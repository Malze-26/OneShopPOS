import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategory));

router.post('/', requireRole('Manager'), asyncHandler(createCategory));
router.put('/:id', requireRole('Manager'), asyncHandler(updateCategory));
router.delete('/:id', requireRole('Manager'), asyncHandler(deleteCategory));

export default router;
