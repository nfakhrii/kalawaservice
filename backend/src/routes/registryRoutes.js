const express = require('express');
const registryController = require('../controllers/registryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// Lookups (Cabang & Mekanik)
router.get('/lookups', registryController.getLookups);

// Pelanggan (Customers)
const customerReadRoles = [
  'owner',
  'admin_cabang',
  'kasir',
];

const customerWriteRoles = [
  'owner',
  'admin_cabang',
  'kasir',
];

const customerDeleteRoles = [
  'owner',
  'admin_cabang',
];

router.get(
  '/customers',
  authorizeRoles(
    'owner',
    'admin_cabang',
    'kasir',
    'mekanik',
    'auditor'
  ),
  registryController.getCustomers
);

router.post(
  '/customers',
  authorizeRoles(...customerWriteRoles),
  registryController.createCustomer
);

router.put(
  '/customers/:id',
  authorizeRoles(...customerWriteRoles),
  registryController.updateCustomer
);

router.delete(
  '/customers/:id',
  authorizeRoles(...customerDeleteRoles),
  registryController.deleteCustomer
);

// Motor (Vehicles)
router.get('/vehicles', registryController.getVehicles);
router.post('/vehicles', authorizeRoles('owner', 'role_owner', 'admin_cabang', 'kasir'), registryController.createVehicle);
router.put('/vehicles/:id', authorizeRoles('owner', 'role_owner', 'admin_cabang', 'kasir'), registryController.updateVehicle);
router.delete('/vehicles/:id', authorizeRoles('owner', 'role_owner', 'admin_cabang'), registryController.deleteVehicle);

// Jasa Servis (Services)
router.get('/services', registryController.getServices);
router.post('/services', authorizeRoles('owner', 'role_owner', 'admin_cabang'), registryController.createService);
router.put('/services/:id', authorizeRoles('owner', 'role_owner', 'admin_cabang'), registryController.updateService);
router.delete('/services/:id', authorizeRoles('owner', 'role_owner', 'admin_cabang'), registryController.deleteService);

  // ==========================================================================
  // SUKU CADANG (SPAREPARTS)
  // ==========================================================================

  const sparepartReadRoles = [
    'owner',
    'admin_cabang',
    'kasir',
    'mekanik',
    'gudang',
    'auditor'
  ];

  const sparepartCreateRoles = [
    'owner',
    'role_owner'
  ];

  const sparepartUpdateRoles = [
    'owner',
    'role_owner',
    'gudang',
    'role_petugas_gudang'
  ];

  const sparepartDeleteRoles = [
    'owner',
    'role_owner'
  ];

  // Melihat sparepart sesuai batasan cabang masing-masing.
  router.get(
    '/spareparts',
    authorizeRoles(...sparepartReadRoles),
    registryController.getSpareparts
  );

  // Membuat master sparepart dan stok awal.
  // Khusus owner.
  router.post(
    '/spareparts',
    authorizeRoles(...sparepartCreateRoles),
    registryController.createSparepart
  );

  // Memperbarui master (owner) atau stok cabang (gudang).
  router.put(
    '/spareparts/:id',
    authorizeRoles(...sparepartUpdateRoles),
    registryController.updateSparepart
  );

  // Menghapus master sparepart dan seluruh stok cabangnya.
  // Khusus owner.
  router.delete(
    '/spareparts/:id',
    authorizeRoles(...sparepartDeleteRoles),
    registryController.deleteSparepart
  );


 // Supplier
 const supplierWriteRoles = ['owner', 'role_owner', 'gudang'];

 router.get(
   '/suppliers',
   authorizeRoles(
     'owner',
     'role_owner',
     'admin_cabang',
     'gudang',
     'kasir',
     'mekanik',
     'auditor'
   ),
   registryController.getSuppliers
 );
 
 router.post(
   '/suppliers',
   authorizeRoles(...supplierWriteRoles),
   registryController.createSupplier
 );
 
 router.put(
   '/suppliers/:id',
   authorizeRoles(...supplierWriteRoles),
   registryController.updateSupplier
 );
 
 router.delete(
   '/suppliers/:id',
   authorizeRoles(...supplierWriteRoles),
   registryController.deleteSupplier
 ); 

module.exports = router;

