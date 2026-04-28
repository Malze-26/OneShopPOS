import { Router } from 'express';
import { getCurrentShift, openShift, closeShift } from '../controllers/shiftController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.post('/close', closeShift);

export default router;
