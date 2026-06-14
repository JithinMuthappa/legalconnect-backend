const express = require('express');
const router = express.Router();
const { uploadProfileImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Both client and advocate can upload
router.post('/profile-image', protect, upload.single('image'), uploadProfileImage);

module.exports = router;