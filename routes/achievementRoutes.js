const express = require('express');
const router = express.Router();
const { add, getAll, update, remove } = require('../controllers/achievementController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Advocate only
router.post('/', protect, authorizeRoles('advocate'), add);
router.put('/:id', protect, authorizeRoles('advocate'), update);
router.delete('/:id', protect, authorizeRoles('advocate'), remove);

// Anyone logged in can view achievements
router.get('/:advocateId', protect, getAll);

module.exports = router;