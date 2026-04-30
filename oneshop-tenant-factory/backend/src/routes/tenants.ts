import { Router } from 'express';
import {
  getAllTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getAnalytics,
  getStoreSettings,
  getManager,
  setManager,
} from '../controllers/tenantController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/analytics', authorize('superadmin'), getAnalytics);

router
  .route('/')
  .get(authorize('superadmin'), getAllTenants)
  .post(authorize('superadmin'), createTenant);

router.get('/:id/store-settings', getStoreSettings);
router.get('/:id/manager', authorize('superadmin'), getManager);
router.post('/:id/manager', authorize('superadmin'), setManager);

router
  .route('/:id')
  .get(getTenant)
  .put(authorize('superadmin'), updateTenant)
  .delete(authorize('superadmin'), deleteTenant);

export default router;
