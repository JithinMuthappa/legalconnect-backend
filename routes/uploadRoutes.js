const express = require('express');
const router = express.Router();
const { uploadProfileImage } = require('../controllers/uploadController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/profile-image', protect, authorizeRoles('advocate'), upload.single('image'), uploadProfileImage);

module.exports = router;