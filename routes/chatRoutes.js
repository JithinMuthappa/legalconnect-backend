const express = require('express');
const router = express.Router();
const { chat, getLegalTopics } = require('../controllers/chatController');

// No auth required for chatbot (as per PRD)
router.post('/message', chat);
router.get('/topics', getLegalTopics);

module.exports = router;