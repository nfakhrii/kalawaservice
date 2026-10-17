const diagnosticsService = require('../services/diagnosticsService');

class DiagnosticsController {
  async getSystemStatus(req, res, next) {
    try {
      const data = await diagnosticsService.getSystemStatus();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async resetDatabase(req, res, next) {
    try {
      const data = await diagnosticsService.resetDatabaseToSeed();
      return res.status(200).json({
        success: true,
        message:
          'Basis data berhasil di-reset dan diisi ulang dengan 5 file SQL asli Kelompok 1 (Kelompok1_schema.sql s.d. Kelompok1_migration_tugas4.sql).',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getRoleToken(req, res, next) {
    try {
      const data = await diagnosticsService.getTestRoleToken(req.params.role || 'mekanik');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const data = await diagnosticsService.getAuditLogs({
        tabel_nama: req.query.tabel_nama,
        operasi: req.query.operasi,
        limit: req.query.limit,
      });
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new DiagnosticsController();
