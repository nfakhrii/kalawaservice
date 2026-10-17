const diagnosticsRepository = require('../repositories/diagnosticsRepository');
const { resetAndSeedDatabase } = require('../config/db');
const authService = require('./authService');

class DiagnosticsService {
  async getSystemStatus() {
    return await diagnosticsRepository.getSystemInspection();
  }

  async resetDatabaseToSeed() {
    const result = await resetAndSeedDatabase();
    const inspection = await diagnosticsRepository.getSystemInspection();
    return {
      ...result,
      inspection,
    };
  }

  async getTestRoleToken(role = 'mekanik') {
    return await authService.quickSwitchRole(role);
  }

  async getAuditLogs(filters) {
    return await diagnosticsRepository.getAuditLogs(filters);
  }
}

module.exports = new DiagnosticsService();
