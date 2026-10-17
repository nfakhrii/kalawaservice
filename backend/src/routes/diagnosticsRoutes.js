const express = require('express');
const diagnosticsController = require('../controllers/diagnosticsController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/status', diagnosticsController.getSystemStatus);
router.post('/reset-db', diagnosticsController.resetDatabase);
router.get('/role-token/:role', diagnosticsController.getRoleToken);

// Viewer tabel "AUDIT_LOG" (Owner, Admin Cabang, & Auditor Internal sesuai Kelompok1_admin_security.sql)
router.get(
  '/audit-logs',
  authorizeRoles('owner', 'admin_cabang', 'auditor'),
  diagnosticsController.getAuditLogs
);

// Dedicated restricted endpoint to demonstrate Scenario #4 (403 Forbidden) if called by non-admin_cabang/owner
router.post(
  '/privileged-audit-action',
  authorizeRoles('owner', 'admin_cabang'),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Aksi konfigurasi sensitif berhasil dieksekusi oleh role_owner / role_admin_cabang.',
    });
  }
);

module.exports = router;
