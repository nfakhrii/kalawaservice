const corporateService = require('../services/corporateService');

class CorporateController {
  async getContractsAndFleets(req, res, next) {
    try {
      const data = await corporateService.getContractsAndFleets();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async createContract(req, res, next) {
    try {
      const data = await corporateService.createContract(req.body);
      return res.status(201).json({
        success: true,
        message: `Kontrak korporat ${data.nomor_kontrak} berhasil dibuat.`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateCreditLimit(req, res, next) {
    try {
      const data = await corporateService.updateCreditLimit(req.params.pelangganId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Plafon kredit pelanggan korporat berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getCollectiveBillings(req, res, next) {
    try {
      const data = await corporateService.getCollectiveBillings();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async generateCollectiveInvoice(req, res, next) {
    try {
      const data = await corporateService.generateCollectiveInvoice(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: `Tagihan kolektif ${data.nomor_invoice} berhasil diterbitkan.`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async settleCollectiveInvoice(req, res, next) {
    try {
      const data = await corporateService.settleCollectiveInvoice(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: `Tagihan kolektif ${data.nomor_invoice} berhasil dilunasi dan sisa plafon dipulihkan.`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new CorporateController();

