const overviewService = require('../services/overviewService');

class OverviewController {
  async getOverview(req, res, next) {
    try {
      const data = await overviewService.getDashboardOverview();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OverviewController();

