import express from 'express';
import {
  getSalesSummary,
  getSalesByProductReport,
  getDailyZReport,
  getInventoryStatusReport,
  getCustomerActivityReport,
} from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';
import { requireTenant } from '../middleware/tenantMiddleware';

const router = express.Router();

// All report routes require authentication and tenant context
router.use(protect);
router.use(requireTenant);

// Sales Summary Report
router.get('/sales-summary', getSalesSummary);

// Sales by Product Report
router.get('/sales-by-product', getSalesByProductReport);

// Inventory Status Report
router.get('/inventory-status', getInventoryStatusReport);

// Daily Z Report
router.get('/daily-z-report', getDailyZReport);

// Customer Activity Report
router.get('/customer-activity', getCustomerActivityReport);

export default router;
