const express = require('express');
const corporateController = require('../controllers/corporateController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Corporate Contracts & Credit Limit
router.get('/contracts', corporateController.getContractsAndFleets);
router.post(
  '/contracts',
  authorizeRoles('owner', 'role_owner', 'admin_cabang'),
  corporateController.createContract
);
router.patch(
  '/credit-limit/:pelangganId',
  authorizeRoles('owner', 'role_owner', 'admin_cabang'),
  corporateController.updateCreditLimit
);

// Collective Billing (Tagihan Kolektif Akhir Bulan)
router.get('/collective-billing', corporateController.getCollectiveBillings);
router.post(
  '/collective-billing',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'kasir'),
  corporateController.generateCollectiveInvoice
);
router.post(
  '/collective-billing/:id/settle',
  authorizeRoles('owner', 'role_owner', 'admin_cabang', 'kasir'),
  corporateController.settleCollectiveInvoice
);

module.exports = router;

