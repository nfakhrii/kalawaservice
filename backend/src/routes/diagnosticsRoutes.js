const express = require("express");
const diagnosticsController = require("../controllers/diagnosticsController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/status", diagnosticsController.getSystemStatus);

// Reset database lewat HTTP dinonaktifkan.
// Gunakan skrip reset internal hanya pada lingkungan pengujian.

router.post("/reset-db", (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Reset database melalui HTTP dinonaktifkan.",
  });
});

// Endpoint pembuat token role dihapus.

router.get(
  "/audit-logs",
  authorizeRoles("owner", "admin_cabang", "auditor"),
  diagnosticsController.getAuditLogs
);

router.post(
  "/privileged-audit-action",
  authorizeRoles("owner", "admin_cabang"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Pemeriksaan hak akses endpoint berhasil.",
    });
  }
);

module.exports = router;
