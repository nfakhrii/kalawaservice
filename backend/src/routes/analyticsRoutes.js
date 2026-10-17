const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/vehicle-history', analyticsController.getVehicleHistory);
router.get('/branch-revenue', analyticsController.getBranchRevenue);
router.get('/sparepart-usage', analyticsController.getSparepartUsage);
router.get('/low-stock', analyticsController.getLowStock);

module.exports = router;

