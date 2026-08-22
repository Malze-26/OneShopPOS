import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireTenant } from '../middleware/tenantMiddleware';
import { presign } from '../controllers/uploadController';

const router = Router();

router.post('/presign', protect, requireTenant, presign);

export default router;
