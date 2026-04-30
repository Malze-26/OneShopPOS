import { Router } from 'express';
import { getAllNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect, authorize('superadmin'));

router.get('/', getAllNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
