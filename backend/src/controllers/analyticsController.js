const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  async getVehicleHistory(req, res, next) {
    try {
      const result = await analyticsService.getVehicleHistory({
        motorId: req.query.motorId,
        search: req.query.search,
        tipePelanggan: req.query.tipePelanggan,
      });
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Skenario Debugging #5: Query Laporan Rentang Tanggal Kosong
   * Mengembalikan HTTP 200 OK dengan data: [] dan total_pendapatan: 0
   */
  async getBranchRevenue(req, res, next) {
    try {
      const result = await analyticsService.getBranchRevenue({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        cabangId: req.query.cabangId,
      });
      return res.status(200).json({
        success: true,
        status: 200,
        data: result.data,
        total_pendapatan: result.total_pendapatan,
        summary: result.summary,
        branchBreakdown: result.branchBreakdown,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getSparepartUsage(req, res, next) {
    try {
      const result = await analyticsService.getSparepartUsage({
        workOrderId: req.query.workOrderId,
        kategori: req.query.kategori,
        search: req.query.search,
      });
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getLowStock(req, res, next) {
    try {
      const result = await analyticsService.getLowStock();
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AnalyticsController();

