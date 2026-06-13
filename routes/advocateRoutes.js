const express = require('express');
const router = express.Router();
const {
  createProfile,
  getMyProfile,
  updateProfile,
  getAllAdvocatesList,
  getAdvocateDetails,
} = require('../controllers/advocateController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Advocate only routes
router.post('/profile', protect, authorizeRoles('advocate'), createProfile);
router.get('/profile', protect, authorizeRoles('advocate'), getMyProfile);
router.put('/profile', protect, authorizeRoles('advocate'), updateProfile);

// Public routes (clients can access)
router.get('/', protect, getAllAdvocatesList);
router.get('/:id', protect, getAdvocateDetails);

module.exports = router;