const operationsRepository = require('../repositories/operationsRepository');
const AppError = require('../utils/AppError');

class OperationsService {
  async getWorkOrders(statusFilter) {
    return await operationsRepository.getAllWorkOrders(statusFilter);
  }

  async getWorkOrderDetail(idOrNomor) {
    const wo = await operationsRepository.getWorkOrderById(idOrNomor);
    if (!wo) {
      throw new AppError(`Work Order '${idOrNomor}' tidak ditemukan.`, 404, 'WO_NOT_FOUND');
    }
    return wo;
  }

  /**
   * Pembuatan Work Order Baru
   * Skenario Debugging #1: Validasi input di Express + Validasi NOT NULL & Foreign Key di PostgreSQL
   */
  async createWorkOrder(data, user) {
    const rawMotor = data.motor_nopol !== undefined ? data.motor_nopol : data.motor_id;
    // Validasi Express Layer (kecuali mode forceDbConstraint dikirim untuk menguji langsung NOT NULL di PostgreSQL)
    if (
      !data.forceDbConstraint &&
      (rawMotor === undefined || rawMotor === null || String(rawMotor).trim() === '')
    ) {
      throw new AppError(
        'Pembuatan Work Order ditolak (400 Bad Request): Atribut motor_nopol tidak boleh kosong (wajib memilih unit motor terdaftar pada tabel "MOTOR").',
        400,
        'INVALID_VEHICLE_REFERENCE',
        {
          layer: 'Express Controller/Service + PostgreSQL NOT NULL Constraint',
          field: 'motor_nopol',
          receivedValue: rawMotor ?? null,
          dbConstraint: '"WORK_ORDER".motor_nopol NOT NULL REFERENCES "MOTOR"(motor_nopol)',
        }
      );
    }

    const keluhan = data.work_keluhan || data.keluhan;
    if (!keluhan || !String(keluhan).trim()) {
      throw new AppError('Keluhan servis motor (work_keluhan) wajib diisi.', 400, 'VALIDATION_ERROR');
    }

    return await operationsRepository.createWorkOrder(data, user);
  }

  async updateWorkOrder(id, data) {
    return await operationsRepository.updateWorkOrder(id, data);
  }

  async addServiceToWorkOrder(workOrderId, data) {
    const jasaKode = data.jasa_kode || data.jasa_servis_id;
    if (!jasaKode) {
      throw new AppError('jasa_kode / jasa_servis_id wajib dipilih.', 400, 'VALIDATION_ERROR');
    }
    const qty = data.wo_jasa_qty || data.jumlah || 1;
    return await operationsRepository.addServiceToWorkOrder(workOrderId, jasaKode, qty);
  }

  async removeServiceFromWorkOrder(workOrderId, itemId) {
    return await operationsRepository.removeServiceFromWorkOrder(workOrderId, itemId);
  }

  async addSparepartToWorkOrder(workOrderId, data) {
    const scKode = data.suku_cadang_kode || data.suku_cadang_id;
    const qty =
      data.suku_cadang_qty !== undefined
        ? data.suku_cadang_qty
        : data.wo_sc_qty !== undefined
        ? data.wo_sc_qty
        : data.jumlah;
    if (!scKode || !qty || Number(qty) <= 0) {
      throw new AppError(
        'suku_cadang_kode dan suku_cadang_qty / jumlah (> 0) wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await operationsRepository.addSparepartToWorkOrder(workOrderId, scKode, qty);
  }

  async removeSparepartFromWorkOrder(workOrderId, itemId) {
    return await operationsRepository.removeSparepartFromWorkOrder(workOrderId, itemId);
  }

  async getPayments() {
    return await operationsRepository.getAllPayments();
  }

  async createPayment(data, user) {
    const workNo = data.work_no || data.work_order_id;
    if (!workNo) {
      throw new AppError(
        'work_no / work_order_id wajib diisi untuk memproses pembayaran.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await operationsRepository.createPayment(data, user);
  }
}

module.exports = new OperationsService();
