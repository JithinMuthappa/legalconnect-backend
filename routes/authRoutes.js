const express = require('express');
const router = express.Router();
const { register, verifyOTP, resendOTP, login, getPending, approve } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);

// Admin routes
router.get('/admin/pending', protect, getPending);
router.post('/admin/approve', protect, approve);

module.exports = router;