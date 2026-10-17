const express = require('express');
const operationsController = require('../controllers/operationsController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Work Orders
router.get('/work-orders', operationsController.getWorkOrders);
router.get('/work-orders/:woId', operationsController.getWorkOrderDetail);
router.post(
  '/work-orders',
  authorizeRoles('admin_cabang', 'kasir', 'mekanik'),
  operationsController.createWorkOrder
);
router.patch(
  '/work-orders/:woId',
  authorizeRoles('admin_cabang', 'mekanik', 'kasir'),
  operationsController.updateWorkOrder
);
router.put(
  '/work-orders/:woId',
  authorizeRoles('admin_cabang', 'mekanik', 'kasir'),
  operationsController.updateWorkOrder
);

// Work Order Services
router.post(
  '/work-orders/:woId/services',
  authorizeRoles('admin_cabang', 'mekanik', 'kasir'),
  operationsController.addService
);
router.delete(
  '/work-orders/:woId/services/:itemId',
  authorizeRoles('admin_cabang', 'mekanik', 'kasir'),
  operationsController.removeService
);

// Work Order Spareparts
router.post(
  '/work-orders/:woId/spareparts',
  authorizeRoles('admin_cabang', 'mekanik', 'gudang', 'kasir'),
  operationsController.addSparepart
);
router.delete(
  '/work-orders/:woId/spareparts/:itemId',
  authorizeRoles('admin_cabang', 'mekanik', 'gudang'),
  operationsController.removeSparepart
);

// Cashier Payments (Restricted to admin_cabang & kasir — Scenario #4 RBAC test target!)
router.get('/payments', operationsController.getPayments);
router.post(
  '/payments',
  authorizeRoles('admin_cabang', 'kasir'),
  operationsController.createPayment
);

module.exports = router;

