const express = require('express');
const operationsController = require('../controllers/operationsController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Work Orders
router.get(
  '/work-orders',
  authorizeRoles(
    'owner',
    'role_owner',
    'admin_cabang',
    'role_admin_cabang',
    'kasir',
    'role_kasir',
    'mekanik',
    'role_mekanik',
    'gudang',
    'role_petugas_gudang',
    'auditor',
    'role_auditor'
  ),
  operationsController.getWorkOrders
);
router.get(
  '/work-orders/:woId',
  authorizeRoles(
    'owner',
    'role_owner',
    'admin_cabang',
    'role_admin_cabang',
    'kasir',
    'role_kasir',
    'mekanik',
    'role_mekanik',
    'gudang',
    'role_petugas_gudang',
    'auditor',
    'role_auditor'
  ),
  operationsController.getWorkOrderDetail
);
router.post(
  '/work-orders',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'role_admin_cabang'),
  operationsController.createWorkOrder
);
router.patch(
  '/work-orders/:woId',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'kasir'),
  operationsController.updateWorkOrder
);
router.put(
  '/work-orders/:woId',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'kasir'),
  operationsController.updateWorkOrder
);

// Work Order Services
router.post(
  '/work-orders/:woId/services',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'kasir'),
  operationsController.addService
);
router.delete(
  '/work-orders/:woId/services/:itemId',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'kasir'),
  operationsController.removeService
);

// Work Order Spareparts
router.post(
  '/work-orders/:woId/spareparts',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'gudang', 'kasir'),
  operationsController.addSparepart
);
router.delete(
  '/work-orders/:woId/spareparts/:itemId',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'mekanik', 'gudang'),
  operationsController.removeSparepart
);

// Cashier Payments (Restricted to owner, admin_cabang & kasir — Scenario #4 RBAC test target!)
router.get('/payments', operationsController.getPayments);
router.post(
  '/payments',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'kasir'),
  operationsController.createPayment
);

module.exports = router;

