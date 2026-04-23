import express from 'express';
import {
  getSalesByProductReport,
  getDailyZReport,
  getInventoryStatusReport,
  getCustomerActivityReport,
} from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All report routes require authentication
router.use(protect);

// Sales by Product Report
router.get('/sales-by-product', getSalesByProductReport);

// Inventory Status Report
router.get('/inventory-status', getInventoryStatusReport);

// Daily Z Report
router.get('/daily-z-report', getDailyZReport);

// Customer Activity Report
router.get('/customer-activity', getCustomerActivityReport);

export default router;
