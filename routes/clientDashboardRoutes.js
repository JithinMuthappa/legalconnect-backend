const express = require('express');
const router = express.Router();
const { getDashboard, search, getAdvocateFullProfile } = require('../controllers/clientDashboardController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, authorizeRoles('client'), getDashboard);
router.get('/search', protect, search);
router.get('/advocate/:id', protect, getAdvocateFullProfile);

module.exports = router;