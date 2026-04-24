import express from 'express';
import {
  getLowStockAlerts,
  getOutOfStockAlerts,
  getNoSalesAlerts,
  getInactiveStaffAlerts,
  getHighRefundAlerts,
} from '../controllers/alertsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protect);

router.get('/low-stock',       getLowStockAlerts);
router.get('/out-of-stock',    getOutOfStockAlerts);
router.get('/no-sales',        getNoSalesAlerts);
router.get('/inactive-staff',  getInactiveStaffAlerts);
router.get('/high-refunds',    getHighRefundAlerts);

export default router;
