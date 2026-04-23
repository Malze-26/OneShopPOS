import { Router, Request, Response, NextFunction } from 'express';
import { login, register, getMe, changePassword, updateProfile, uploadAvatar } from '../controllers/authController';
import { protect, requireRole } from '../middleware/authMiddleware';
import { uploadAvatarMiddleware } from '../middleware/uploadAvatar';
import { AuthRequest } from '../types';

const router = Router();

// Wrap async controllers to forward errors to Express error handler
function asyncHandler(
  fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Public routes
router.post('/login', asyncHandler(login));

// Protected routes
router.post('/register', protect, requireRole('Manager'), asyncHandler(register));
router.post('/change-password', protect, asyncHandler((req, res) => changePassword(req as AuthRequest, res)));
router.get('/me', protect, asyncHandler((req, res) => getMe(req as AuthRequest, res)));
router.patch('/profile', protect, asyncHandler((req, res) => updateProfile(req as AuthRequest, res)));
router.post('/profile/avatar', protect, uploadAvatarMiddleware.single('avatar'), asyncHandler((req, res) => uploadAvatar(req as AuthRequest, res)));

export default router;
