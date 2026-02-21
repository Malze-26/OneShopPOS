import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import { getEmployees, deactivateEmployee } from '../controllers/employeeController';
import { register } from '../controllers/authController';
import { AuthRequest } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/', asyncHandler(getEmployees));

// Add employee = register new user (Manager only)
router.post('/', requireRole('Manager'), asyncHandler(register));

// Deactivate employee (Manager only)
router.put('/:id/deactivate', requireRole('Manager'), asyncHandler(deactivateEmployee));

export default router;
