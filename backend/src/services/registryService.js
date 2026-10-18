const registryRepository = require('../repositories/registryRepository');
const AppError = require('../utils/AppError');

class RegistryService {
  // Customers ("PELANGGAN")
  async getCustomers(tipeFilter) {
    return await registryRepository.getAllCustomers(tipeFilter);
  }

  async createCustomer(data) {
    const id = data.pelanggan_id || data.kode_pelanggan;
    const nama = data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan;
    const hp = data.pelanggan_telp || data.pelanggan_no_hp || data.telepon;
    if (!id || !nama || !hp) {
      throw new AppError(
        'ID/Kode pelanggan (pelanggan_id), nama pelanggan (pelanggan_nama), dan nomor telepon (pelanggan_telp) wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await registryRepository.createCustomer(data);
  }

  async updateCustomer(id, data) {
    const updated = await registryRepository.updateCustomer(id, data);
    if (!updated) throw new AppError('Pelanggan tidak ditemukan.', 404, 'NOT_FOUND');
    return updated;
  }

  async deleteCustomer(id) {
    const deleted = await registryRepository.deleteCustomer(id);
    if (!deleted) throw new AppError('Pelanggan tidak ditemukan.', 404, 'NOT_FOUND');
    return deleted;
  }

  // Vehicles ("MOTOR" & "RIWAYAT_KEPEMILIKAN")
  async getVehicles() {
    return await registryRepository.getAllVehicles();
  }

  async createVehicle(data) {
    const nopol = data.motor_nopol || data.plat_nomor;
    const merk = data.motor_merek || data.motor_merk || data.merk;
    const tipe = data.motor_tipe || data.tipe;
    const noRangka = data.motor_no_rangka || data.nomor_rangka;
    if (!data.pelanggan_id || !nopol || !merk || !tipe || !noRangka) {
      throw new AppError(
        'Pemilik (pelanggan_id), plat nomor (motor_nopol), merek (motor_merek), tipe, dan nomor rangka wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await registryRepository.createVehicle(data);
  }

  async updateVehicle(id, data) {
    const updated = await registryRepository.updateVehicle(id, data);
    if (!updated) throw new AppError('Data motor tidak ditemukan.', 404, 'NOT_FOUND');
    return updated;
  }

  async deleteVehicle(id) {
    const deleted = await registryRepository.deleteVehicle(id);
    if (!deleted) throw new AppError('Data motor tidak ditemukan.', 404, 'NOT_FOUND');
    return deleted;
  }

  // Services ("JASA_SERVIS")
  async getServices() {
    return await registryRepository.getAllServices();
  }

  async createService(data) {
    const kode = data.jasa_kode || data.kode_jasa;
    const nama = data.jasa_uraian || data.jasa_nama || data.nama_jasa;
    const harga =
      data.jasa_biaya !== undefined
        ? data.jasa_biaya
        : data.jasa_harga !== undefined
        ? data.jasa_harga
        : data.harga_jasa;
    if (!kode || !nama || harga === undefined) {
      throw new AppError(
        'Kode jasa (jasa_kode), uraian jasa (jasa_uraian), dan biaya jasa (jasa_biaya) wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await registryRepository.createService(data);
  }

  async updateService(id, data) {
    const updated = await registryRepository.updateService(id, data);
    if (!updated) throw new AppError('Jasa servis tidak ditemukan.', 404, 'NOT_FOUND');
    return updated;
  }

  async deleteService(id) {
    const deleted = await registryRepository.deleteService(id);
    if (!deleted) throw new AppError('Jasa servis tidak ditemukan.', 404, 'NOT_FOUND');
    return deleted;
  }

  // Spareparts ("SUKU_CADANG" & "STOK_CABANG")
  async getSpareparts(cabangKode) {
    return await registryRepository.getAllSpareparts(cabangKode);
  }

  async createSparepart(data) {
    const kode = data.suku_cadang_kode || data.kode_sku;
    const nama = data.suku_cadang_nama || data.nama_part;
    if (!kode || !nama) {
      throw new AppError(
        'Kode suku cadang (suku_cadang_kode) dan nama suku cadang (suku_cadang_nama) wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await registryRepository.createSparepart(data);
  }

  async updateSparepart(id, data) {
    const updated = await registryRepository.updateSparepart(id, data);
    if (!updated) throw new AppError('Suku cadang tidak ditemukan.', 404, 'NOT_FOUND');
    return updated;
  }

  async deleteSparepart(id) {
    const deleted = await registryRepository.deleteSparepart(id);
    if (!deleted) throw new AppError('Suku cadang tidak ditemukan.', 404, 'NOT_FOUND');
    return deleted;
  }

  // Suppliers ("SUPPLIER")
  async getSuppliers() {
    return await registryRepository.getAllSuppliers();
  }

  async createSupplier(data) {
    const kode = data.supplier_id || data.kode_supplier;
    const nama = data.supplier_nama || data.nama_supplier;
    const kontak = data.supplier_telp || data.supplier_kontak || data.telepon;
    if (!kode || !nama || !kontak) {
      throw new AppError(
        'ID supplier (supplier_id), nama supplier (supplier_nama), dan nomor telepon (supplier_telp) wajib diisi.',
        400,
        'VALIDATION_ERROR'
      );
    }
    return await registryRepository.createSupplier(data);
  }

  async updateSupplier(id, data) {
    const updated = await registryRepository.updateSupplier(id, data);
    if (!updated) throw new AppError('Supplier tidak ditemukan.', 404, 'NOT_FOUND');
    return updated;
  }

  async deleteSupplier(id) {
    const deleted = await registryRepository.deleteSupplier(id);
    if (!deleted) throw new AppError('Supplier tidak ditemukan.', 404, 'NOT_FOUND');
    return deleted;
  }

  // Lookups ("CABANG", "MEKANIK")
  async getBranches() {
    return await registryRepository.getAllBranches();
  }

  async getMechanics() {
    return await registryRepository.getAllMechanics();
  }
}

module.exports = new RegistryService();
