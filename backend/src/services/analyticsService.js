const analyticsRepository = require('../repositories/analyticsRepository');
const AppError = require('../utils/AppError');

class AnalyticsService {
  async getVehicleHistory(filters) {
    return await analyticsRepository.getVehicleHistoryReport(filters);
  }

  async getBranchRevenue({ startDate, endDate, cabangId }) {
    const start = startDate || '2026-01-01';
    const end = endDate || '2026-12-31';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      throw new AppError(
        'Format parameter startDate dan endDate harus YYYY-MM-DD.',
        400,
        'INVALID_DATE_FORMAT'
      );
    }

    if (new Date(start) > new Date(end)) {
      throw new AppError(
        'Tanggal awal (startDate) tidak boleh lebih besar dari tanggal akhir (endDate).',
        400,
        'INVALID_DATE_RANGE'
      );
    }

    return await analyticsRepository.getBranchRevenueReport({
      startDate: start,
      endDate: end,
      cabangId,
    });
  }

  async getSparepartUsage(filters) {
    return await analyticsRepository.getSparepartUsageReport(filters);
  }

  async getLowStock() {
    return await analyticsRepository.getLowStockReport();
  }
}

module.exports = new AnalyticsService();

