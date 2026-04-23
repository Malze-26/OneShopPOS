const express = require('express');
const router = express.Router();
const {
  getAllTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getAnalytics,
} = require('../controllers/tenantController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Analytics route
router.get('/analytics', authorize('superadmin'), getAnalytics);

// CRUD routes
router
  .route('/')
  .get(authorize('superadmin'), getAllTenants)
  .post(authorize('superadmin'), createTenant);

router
  .route('/:id')
  .get(getTenant)
  .put(authorize('superadmin'), updateTenant)
  .delete(authorize('superadmin'), deleteTenant);

module.exports = router;