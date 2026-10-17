const express = require('express');
const overviewController = require('../controllers/overviewController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, overviewController.getOverview);

module.exports = router;

