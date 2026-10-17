const corporateRepository = require('../repositories/corporateRepository');
const AppError = require('../utils/AppError');

class CorporateService {
  async getContractsAndFleets() {
    return await corporateRepository.getCorporateContractsAndFleets();
  }

  async createContract(data) {
    if (!data.nomor_kontrak || !data.pelanggan_id || !data.tanggal_mulai || !data.tanggal_berakhir) {
      throw new AppError(
        'Nomor kontrak, pelanggan korporat (pelanggan_id), tanggal mulai, dan tanggal berakhir wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await corporateRepository.createCorporateContract(data);
  }

  async updateCreditLimit(pelangganId, data) {
    if (data.plafon_kredit === undefined || Number(data.plafon_kredit) < 0) {
      throw new AppError('Plafon kredit harus bernilai positif (>= 0).', 400, 'VALIDATION_ERROR');
    }
    const updated = await corporateRepository.updateCorporateCreditLimit(
      pelangganId,
      data.plafon_kredit,
      data.sisa_plafon
    );
    if (!updated) {
      throw new AppError('Pelanggan korporat tidak ditemukan.', 404, 'NOT_FOUND');
    }
    return updated;
  }

  async getCollectiveBillings() {
    return await corporateRepository.getCollectiveBillings();
  }

  async generateCollectiveInvoice(data, user) {
    if (!data.pelanggan_id) {
      throw new AppError('pelanggan_id korporat wajib dipilih.', 400, 'VALIDATION_ERROR');
    }
    return await corporateRepository.createCollectiveInvoice(data, user);
  }

  async settleCollectiveInvoice(tagihanId, data) {
    return await corporateRepository.settleCollectiveInvoice(tagihanId, data);
  }
}

module.exports = new CorporateService();
