const registryService = require('../services/registryService');

class RegistryController {
  // Customers
  async getCustomers(req, res, next) {
    try {
      const data = await registryService.getCustomers(req.query.tipe);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  async createCustomer(req, res, next) {
    try {
      const data = await registryService.createCustomer(req.body);
      return res.status(201).json({
        success: true,
        message: 'Data pelanggan berhasil ditambahkan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateCustomer(req, res, next) {
    try {
      const data = await registryService.updateCustomer(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Data pelanggan berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteCustomer(req, res, next) {
    try {
      const data = await registryService.deleteCustomer(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Data pelanggan berhasil dihapus.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Vehicles
  async getVehicles(req, res, next) {
    try {
      const data = await registryService.getVehicles();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  async createVehicle(req, res, next) {
    try {
      const data = await registryService.createVehicle(req.body);
      return res.status(201).json({
        success: true,
        message: 'Data unit motor berhasil ditambahkan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateVehicle(req, res, next) {
    try {
      const data = await registryService.updateVehicle(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Data unit motor berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteVehicle(req, res, next) {
    try {
      const data = await registryService.deleteVehicle(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Data unit motor berhasil dihapus.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Services
  async getServices(req, res, next) {
    try {
      const data = await registryService.getServices();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  async createService(req, res, next) {
    try {
      const data = await registryService.createService(req.body);
      return res.status(201).json({
        success: true,
        message: 'Katalog jasa servis berhasil ditambahkan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateService(req, res, next) {
    try {
      const data = await registryService.updateService(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Katalog jasa servis berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteService(req, res, next) {
    try {
      const data = await registryService.deleteService(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Katalog jasa servis berhasil dihapus.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Spareparts
  async getSpareparts(req, res, next) {
    try {
      const data = await registryService.getSpareparts(req.query.cabang_kode);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  async createSparepart(req, res, next) {
    try {
      const data = await registryService.createSparepart(req.body);
      return res.status(201).json({
        success: true,
        message: 'Suku cadang berhasil ditambahkan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateSparepart(req, res, next) {
    try {
      const data = await registryService.updateSparepart(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Data suku cadang & stok berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteSparepart(req, res, next) {
    try {
      const data = await registryService.deleteSparepart(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Suku cadang berhasil dihapus.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Suppliers
  async getSuppliers(req, res, next) {
    try {
      const data = await registryService.getSuppliers();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  }

  async createSupplier(req, res, next) {
    try {
      const data = await registryService.createSupplier(req.body);
      return res.status(201).json({
        success: true,
        message: 'Data supplier berhasil ditambahkan.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateSupplier(req, res, next) {
    try {
      const data = await registryService.updateSupplier(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Data supplier berhasil diperbarui.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteSupplier(req, res, next) {
    try {
      const data = await registryService.deleteSupplier(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Data supplier berhasil dihapus.',
        data,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Lookups
  async getLookups(req, res, next) {
    try {
      const [branches, mechanics] = await Promise.all([
        registryService.getBranches(),
        registryService.getMechanics(),
      ]);
      return res.status(200).json({
        success: true,
        data: { branches, mechanics },
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new RegistryController();

