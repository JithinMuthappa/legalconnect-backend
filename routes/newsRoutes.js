const express = require('express');
const router = express.Router();
const { getLegalNews } = require('../controllers/newsController');

router.get('/', getLegalNews);

module.exports = router;
