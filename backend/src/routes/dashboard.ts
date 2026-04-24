import express from 'express';
import {
  getDashboardSummary,
  getSalesTrend,
  getTopProducts,
  getEmployeePerformance,
  getRecentOrders,
} from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protect);

router.get('/summary',              getDashboardSummary);
router.get('/sales-trend',          getSalesTrend);
router.get('/top-products',         getTopProducts);
router.get('/employee-performance', getEmployeePerformance);
router.get('/recent-orders',        getRecentOrders);

export default router;
