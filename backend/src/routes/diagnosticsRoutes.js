const express = require("express");
const diagnosticsController = require("../controllers/diagnosticsController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// Hanya Owner dan Auditor yang dapat melihat informasi diagnostik.
const diagnosticsAccess = authorizeRoles("owner", "auditor");

// Hanya Owner yang dapat membuat backup database.
const backupAccess = authorizeRoles("owner");

router.get("/status", diagnosticsAccess, diagnosticsController.getSystemStatus);

// Membuat backup database secara manual (khusus Owner).
router.post(
  "/backup",
  backupAccess,
  diagnosticsController.createBackup
);

router.post(
  "/recovery",
  backupAccess,
  diagnosticsController.restoreBackup
);

// Reset database melalui HTTP tetap dinonaktifkan.
router.post("/reset-db", (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Reset database melalui HTTP dinonaktifkan.",
  });
});

// Audit log hanya dapat dibaca Owner dan Auditor.
router.get(
  "/audit-logs",
  diagnosticsAccess,
  diagnosticsController.getAuditLogs
);

module.exports = router;
