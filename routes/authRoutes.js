const express = require('express');
const router = express.Router();
const { register, login, getPending, approve } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Admin routes
router.get('/admin/pending', protect, getPending);
router.post('/admin/approve', protect, approve);

module.exports = router;