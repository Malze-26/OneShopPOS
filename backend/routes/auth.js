const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;