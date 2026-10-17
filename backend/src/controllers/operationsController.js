const operationsService = require('../services/operationsService');

class OperationsController {
  async getWorkOrders(req, res, next) {
    try {
      const result = await operationsService.getWorkOrders(req.query.status);
      return res.status(200).json({
        success: true,
        data: result.workOrders,
        counts: result.counts,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getWorkOrderDetail(req, res, next) {
    try {
      const data = await operationsService.getWorkOrderDetail(req.params.woId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async createWorkOrder(req, res, next) {
    try {
      const data = await operationsService.createWorkOrder(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: `Work Order ${data.nomor_wo} berhasil dibuat.`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateWorkOrder(req, res, next) {
    try {
      const data = await operationsService.updateWorkOrder(req.params.woId, req.body);
      return res.status(200).json({
        success: true,
        message: `Work Order ${data.nomor_wo} berhasil diperbarui (Status: ${data.status}).`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async addService(req, res, next) {
    try {
      const data = await operationsService.addServiceToWorkOrder(req.params.woId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Jasa servis berhasil ditambahkan ke Work Order.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async removeService(req, res, next) {
    try {
      const data = await operationsService.removeServiceFromWorkOrder(
        req.params.woId,
        req.params.itemId
      );
      return res.status(200).json({
        success: true,
        message: 'Item jasa servis berhasil dihapus dari Work Order.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async addSparepart(req, res, next) {
    try {
      const data = await operationsService.addSparepartToWorkOrder(req.params.woId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Suku cadang berhasil ditambahkan ke Work Order dan stok telah dikurangi.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async removeSparepart(req, res, next) {
    try {
      const data = await operationsService.removeSparepartFromWorkOrder(
        req.params.woId,
        req.params.itemId
      );
      return res.status(200).json({
        success: true,
        message: 'Item suku cadang dihapus dan stok telah dikembalikan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getPayments(req, res, next) {
    try {
      const data = await operationsService.getPayments();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async createPayment(req, res, next) {
    try {
      const data = await operationsService.createPayment(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: `Pembayaran berhasil dicatat (${data.nomor_kwitansi}).`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OperationsController();

