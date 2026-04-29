import express from 'express';
import {
  getSalesSummary,
  getSalesByProductReport,
  getDailyZReport,
  getInventoryStatusReport,
  getEmployeeActivityReport,
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

// Employee Activity Report
router.get('/employee-details', getEmployeeActivityReport);

export default router;
