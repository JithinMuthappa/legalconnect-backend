const express = require('express');
const router = express.Router();
const { send, conversation, inbox, unreadCount } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send', protect, send);
router.get('/inbox', protect, inbox);
router.get('/unread', protect, unreadCount);
router.get('/conversation/:userId', protect, conversation);

module.exports = router;