const overviewRepository = require('../repositories/overviewRepository');

class OverviewService {
  async getDashboardOverview() {
    return await overviewRepository.getDashboardMetrics();
  }
}

module.exports = new OverviewService();

