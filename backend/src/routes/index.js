const express = require('express');
const authRoutes = require('./authRoutes');
const overviewRoutes = require('./overviewRoutes');
const registryRoutes = require('./registryRoutes');
const operationsRoutes = require('./operationsRoutes');
const corporateRoutes = require('./corporateRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const diagnosticsRoutes = require('./diagnosticsRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'kalawa-service-backend',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/overview', overviewRoutes);
router.use('/registry', registryRoutes);
router.use('/operations', operationsRoutes);
router.use('/corporate', corporateRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/diagnostics', diagnosticsRoutes);

module.exports = router;

