const express = require('express');
const registryController = require('../controllers/registryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Lookups (Cabang & Mekanik)
router.get('/lookups', registryController.getLookups);

// Pelanggan (Customers)
router.get('/customers', registryController.getCustomers);
router.post('/customers', authorizeRoles('admin_cabang', 'kasir'), registryController.createCustomer);
router.put('/customers/:id', authorizeRoles('admin_cabang', 'kasir'), registryController.updateCustomer);
router.delete('/customers/:id', authorizeRoles('admin_cabang'), registryController.deleteCustomer);

// Motor (Vehicles)
router.get('/vehicles', registryController.getVehicles);
router.post('/vehicles', authorizeRoles('admin_cabang', 'kasir'), registryController.createVehicle);
router.put('/vehicles/:id', authorizeRoles('admin_cabang', 'kasir'), registryController.updateVehicle);
router.delete('/vehicles/:id', authorizeRoles('admin_cabang'), registryController.deleteVehicle);

// Jasa Servis (Services)
router.get('/services', registryController.getServices);
router.post('/services', authorizeRoles('admin_cabang'), registryController.createService);
router.put('/services/:id', authorizeRoles('admin_cabang'), registryController.updateService);
router.delete('/services/:id', authorizeRoles('admin_cabang'), registryController.deleteService);

// Suku Cadang (Spareparts)
router.get('/spareparts', registryController.getSpareparts);
router.post('/spareparts', authorizeRoles('admin_cabang', 'gudang'), registryController.createSparepart);
router.put('/spareparts/:id', authorizeRoles('admin_cabang', 'gudang'), registryController.updateSparepart);
router.delete('/spareparts/:id', authorizeRoles('owner', 'admin_cabang'), registryController.deleteSparepart);

// Supplier
router.get('/suppliers', registryController.getSuppliers);
router.post('/suppliers', authorizeRoles('admin_cabang', 'gudang'), registryController.createSupplier);
router.put('/suppliers/:id', authorizeRoles('admin_cabang', 'gudang'), registryController.updateSupplier);
router.delete('/suppliers/:id', authorizeRoles('admin_cabang', 'gudang'), registryController.deleteSupplier);

module.exports = router;

