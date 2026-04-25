import { Router } from 'express';
import {
  getAllTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getAnalytics,
} from '../controllers/tenantController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/analytics', authorize('superadmin'), getAnalytics);

router
  .route('/')
  .get(authorize('superadmin'), getAllTenants)
  .post(authorize('superadmin'), createTenant);

router
  .route('/:id')
  .get(getTenant)
  .put(authorize('superadmin'), updateTenant)
  .delete(authorize('superadmin'), deleteTenant);

export default router;
