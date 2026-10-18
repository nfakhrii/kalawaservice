const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', authController.login);
router.post('/quick-switch', authenticateToken, authController.quickSwitchRole);
router.get('/demo-users', authController.getDemoUsers);
router.get('/demo-accounts', authController.getDemoUsers);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
