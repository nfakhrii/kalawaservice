const AppError = require('../utils/AppError');

/**
 * Global Error Handling Middleware
 * Menerjemahkan error aplikasi & PostgreSQL Constraint/Trigger Errors ke HTTP Status Code yang akurat:
 * - 400 Bad Request: Input kosong, NOT NULL violation (23502), Check constraint umum, Format salah (22P02)
 * - 401 Unauthorized: Kredensial PostgreSQL salah (28P01) / JWT tidak valid
 * - 403 Forbidden: Pelanggaran RBAC / PostgreSQL insufficient_privilege (42501)
 * - 404 Not Found: Data tidak ditemukan
 * - 409 Conflict: Duplikasi data (23505) / Pembayaran Dobel (P0002)
 * - 422 Unprocessable Entity: Pelanggaran aturan bisnis stok tidak cukup (P0001 / chk_stok_qty) atau plafon kredit korporat tidak cukup (P0004)
 */
function errorHandler(err, req, res, _next) {
  // 1. Jika sudah berupa instance AppError dari Service/Controller/Middleware
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      code: err.errorCode,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Pemetaan Error Native PostgreSQL (pg error codes)
  if (err && err.code) {
    switch (err.code) {
      // Invalid Password / Authentication failed pada PostgreSQL
      case '28P01':
      case '28000':
        return res.status(401).json({
          success: false,
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Autentikasi database gagal: Username atau password PostgreSQL tidak valid.',
          details: { pgCode: err.code },
          timestamp: new Date().toISOString(),
        });

      // Skenario #4: PostgreSQL Native RBAC Violation (insufficient_privilege dari GRANT/REVOKE)
      case '42501':
        return res.status(403).json({
          success: false,
          status: 403,
          code: 'INSUFFICIENT_PRIVILEGE',
          message: `Akses ditolak oleh PostgreSQL RBAC (SQLSTATE 42501): Role database saat ini tidak memiliki hak akses (GRANT) untuk operasi ini (${err.message}).`,
          details: { pgCode: err.code, routine: err.routine },
          timestamp: new Date().toISOString(),
        });

      // Custom Trigger Exception: Stok Suku Cadang Tidak Cukup (Skenario #3)
      case 'P0001':
        return res.status(422).json({
          success: false,
          status: 422,
          code: 'INSUFFICIENT_SPAREPART_STOCK',
          message: err.message,
          details: {
            pgCode: err.code,
            hint: err.hint || 'Periksa stok gudang suku cadang terlebih dahulu.',
            where: err.where || 'PostgreSQL Trigger trg_kurangi_stok',
          },
          timestamp: new Date().toISOString(),
        });

      // Custom Trigger Exception: Pembayaran Dobel (Skenario #2)
      case 'P0002':
        return res.status(409).json({
          success: false,
          status: 409,
          code: 'DOUBLE_PAYMENT_CONFLICT',
          message: err.message,
          details: { pgCode: err.code },
          timestamp: new Date().toISOString(),
        });

      // Custom Trigger Exception: Work Order sudah final / Plafon Korporat tidak cukup
      case 'P0003':
      case 'P0004':
        return res.status(422).json({
          success: false,
          status: 422,
          code: err.code === 'P0004' ? 'CORPORATE_CREDIT_LIMIT_EXCEEDED' : 'WORK_ORDER_LOCKED',
          message: err.message,
          details: { pgCode: err.code },
          timestamp: new Date().toISOString(),
        });

      // Unique Constraint Violation (misal duplikasi plat_nomor, kode_sku, atau work_order_id di pembayaran)
      case '23505': {
        const isPaymentDuplicate =
          (err.constraint && err.constraint.includes('pembayaran_work_order_id')) ||
          (err.detail && err.detail.includes('work_order_id'));

        return res.status(409).json({
          success: false,
          status: 409,
          code: isPaymentDuplicate ? 'DOUBLE_PAYMENT_CONFLICT' : 'DUPLICATE_ENTITY_CONFLICT',
          message: isPaymentDuplicate
            ? 'Penolakan Pembayaran Ganda: Work Order ini sudah memiliki transaksi pembayaran lunas.'
            : `Data duplikat terdeteksi pada kolom unik (${err.constraint}).`,
          details: {
            pgCode: err.code,
            constraint: err.constraint,
            detail: err.detail,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // NOT NULL Violation (misal Skenario #1: motor_nopol kosong pada WORK_ORDER)
      case '23502':
        return res.status(400).json({
          success: false,
          status: 400,
          code: 'NOT_NULL_VIOLATION',
          message: `Atribut wajib '${err.column}' pada tabel '${err.table}' tidak boleh bernilai NULL atau kosong.`,
          details: {
            pgCode: err.code,
            table: err.table,
            column: err.column,
          },
          timestamp: new Date().toISOString(),
        });

      // Foreign Key Violation (misal motor_nopol tidak terdaftar atau referensi masih digunakan)
      case '23503':
        return res.status(400).json({
          success: false,
          status: 400,
          code: 'FOREIGN_KEY_VIOLATION',
          message: `Referensi data tidak valid atau data masih digunakan oleh transaksi lain (${err.constraint}).`,
          details: {
            pgCode: err.code,
            constraint: err.constraint,
            detail: err.detail,
          },
          timestamp: new Date().toISOString(),
        });

      // CHECK Constraint Violation (23514)
      case '23514': {
        const isStockConstraint =
          err.constraint &&
          (err.constraint.includes('stok') || err.constraint === 'chk_stok_qty');
        return res.status(isStockConstraint ? 422 : 400).json({
          success: false,
          status: isStockConstraint ? 422 : 400,
          code: isStockConstraint ? 'INSUFFICIENT_SPAREPART_STOCK' : 'CHECK_CONSTRAINT_VIOLATION',
          message: isStockConstraint
            ? 'Stok suku cadang di cabang tidak mencukupi (pelanggaran constraint chk_stok_qty >= 0).'
            : `Pelanggaran batasan nilai (CHECK constraint: ${err.constraint}).`,
          details: {
            pgCode: err.code,
            constraint: err.constraint,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Invalid Text Representation / Format
      case '22P02':
      case '22007':
      case '22008':
        return res.status(400).json({
          success: false,
          status: 400,
          code: 'INVALID_DATA_FORMAT',
          message: 'Format parameter input atau tipe data (angka/tanggal) tidak valid.',
          details: { pgCode: err.code, routine: err.routine },
          timestamp: new Date().toISOString(),
        });

      default:
        break;
    }
  }

  console.error('[Unhandled Server Error]:', err);
  return res.status(500).json({
    success: false,
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Terjadi kesalahan internal pada server.',
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandler;
