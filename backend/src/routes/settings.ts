import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { getSettings, updateSettings, uploadLogo } from '../controllers/settingsController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get('/', asyncHandler(getSettings));
router.patch('/', protect, requireRole('Manager'), asyncHandler(updateSettings));
router.post('/logo', protect, requireRole('Manager'), asyncHandler(uploadLogo));

export default router;
