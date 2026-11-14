const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Semua endpoint Analytics wajib melalui autentikasi.
router.use(authenticateToken);

// ============================================================
// HAK AKSES ANALYTICS
// ============================================================

// Owner, Admin Cabang, dan Auditor:
// Memiliki akses ke seluruh jenis laporan Analytics.
const analyticsFullAccess = ["owner", "admin_cabang", "auditor"];

// Gudang:
// Hanya memiliki akses ke laporan yang berkaitan dengan inventori.
const analyticsInventoryAccess = [...analyticsFullAccess, "gudang"];

// ============================================================
// 1. VEHICLE SERVICE HISTORY
// Akses: Owner, Admin Cabang, Auditor
// ============================================================

router.get(
  "/vehicle-history",
  authorizeRoles(...analyticsFullAccess),
  analyticsController.getVehicleHistory
);

// ============================================================
// 2. BRANCH REVENUE & DATE RANGE
// Akses: Owner, Admin Cabang, Auditor
// ============================================================

router.get(
  "/branch-revenue",
  authorizeRoles(...analyticsFullAccess),
  analyticsController.getBranchRevenue
);

// ============================================================
// 3. SPAREPART USAGE PER WORK ORDER
// Akses: Owner, Admin Cabang, Auditor, Gudang
// ============================================================

router.get(
  "/sparepart-usage",
  authorizeRoles(...analyticsInventoryAccess),
  analyticsController.getSparepartUsage
);

// ============================================================
// 4. LOW STOCK ALERT REPORT
// Akses: Owner, Admin Cabang, Auditor, Gudang
// ============================================================

router.get(
  "/low-stock",
  authorizeRoles(...analyticsInventoryAccess),
  analyticsController.getLowStock
);

module.exports = router;
