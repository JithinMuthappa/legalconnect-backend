const express = require('express');
const router = express.Router();
const { createProfile, getProfile, updateProfile } = require('../controllers/clientController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/profile', protect, authorizeRoles('client'), createProfile);
router.get('/profile', protect, authorizeRoles('client'), getProfile);
router.put('/profile', protect, authorizeRoles('client'), updateProfile);

module.exports = router;