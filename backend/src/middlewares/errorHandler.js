/**
 * Global Defensive Error Handler Middleware (Aligned with Kelompok 1 Schema)
 * Menangani AppError dari Express Service/Controller dan Database Error dari PostgreSQL (pg)
 */
function errorHandler(err, req, res, _next) {
  // 1. Jika error berasal dari AppError (Operational Error yang sudah diformat)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.statusCode,
      code: err.code || 'OPERATIONAL_ERROR',
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Penanganan Kode Error Spesifik PostgreSQL (SQLSTATE)
  if (err.code) {
    // Skenario #3: Trigger PostgreSQL trg_kurangi_stok_suku_cadang mengurangi STOK_CABANG.stok_qty < 0
    // memicu constraint "chk_stok_qty" (23514) atau RAISE EXCEPTION (P0001)
    if (
      err.code === 'P0001' ||
      (err.code === '23514' && err.constraint === 'chk_stok_qty')
    ) {
      return res.status(422).json({
        success: false,
        status: 422,
        code: 'INSUFFICIENT_SPAREPART_STOCK',
        message:
          err.code === '23514'
            ? `Stok suku cadang pada tabel "STOK_CABANG" tidak mencukupi (melanggar constraint "${err.constraint}": stok_qty >= 0). Transaksi di-rollback otomatis oleh trigger trg_kurangi_stok_suku_cadang.`
            : err.message,
        details: {
          sqlState: err.code,
          table: err.table || 'STOK_CABANG',
          constraint: err.constraint || 'chk_stok_qty',
          trigger: 'trg_kurangi_stok_suku_cadang (trg_fn_kurangi_stok)',
          transactionAction: 'ROLLBACK',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validasi Plafon Kredit Korporat (P0004) oleh trg_kelola_plafon_wo_korporat
    if (err.code === 'P0004') {
      return res.status(422).json({
        success: false,
        status: 422,
        code: 'CORPORATE_CREDIT_LIMIT_EXCEEDED',
        message: err.message,
        details: {
          sqlState: err.code,
          trigger: 'trg_kelola_plafon_wo_korporat',
          transactionAction: 'ROLLBACK',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validasi Status Work Order / Double Payment Conflict (P0002)
    if (err.code === 'P0002') {
      return res.status(409).json({
        success: false,
        status: 409,
        code: 'DOUBLE_PAYMENT_CONFLICT',
        message: err.message,
        details: {
          sqlState: err.code,
          table: 'WORK_ORDER',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Record Tidak Ditemukan di Trigger (P0003)
    if (err.code === 'P0003') {
      return res.status(404).json({
        success: false,
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: err.message,
        details: { sqlState: err.code },
        timestamp: new Date().toISOString(),
      });
    }

    // Skenario #2 / Duplikat UNIQUE Constraint (23505)
    if (err.code === '23505') {
      const isDoublePayment =
        (err.constraint && err.constraint.includes('work_no')) ||
        (err.message && err.message.toLowerCase().includes('lunas'));
      return res.status(409).json({
        success: false,
        status: 409,
        code: isDoublePayment ? 'DOUBLE_PAYMENT_CONFLICT' : 'DUPLICATE_UNIQUE_VALUE',
        message: isDoublePayment
          ? 'Pembayaran ditolak (409 Conflict): Work Order ini sudah berstatus Lunas pada tabel "WORK_ORDER".'
          : `Data duplikat terdeteksi pada constraint '${err.constraint || 'UNIQUE'}': ${err.detail || err.message}`,
        details: {
          sqlState: err.code,
          table: err.table || 'WORK_ORDER',
          constraint: err.constraint || 'UNIQUE',
          detail: err.detail || err.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Skenario #1: Pelanggaran NOT NULL Constraint (23502) atau Foreign Key Constraint (23503)
    if (err.code === '23502' || err.code === '23503') {
      return res.status(400).json({
        success: false,
        status: 400,
        code: err.code === '23502' ? 'NOT_NULL_VIOLATION' : 'FOREIGN_KEY_VIOLATION',
        message:
          err.code === '23502'
            ? `Atribut wajib '${err.column || 'motor_nopol'}' tidak boleh bernilai NULL pada tabel '"${err.table || 'WORK_ORDER'}"'.`
            : `Referensi data tidak valid atau ID tidak terdaftar pada basis data (${err.constraint || 'Foreign Key Constraint'}).`,
        details: {
          sqlState: err.code,
          table: err.table || 'WORK_ORDER',
          column: err.column || 'motor_nopol',
          constraint: err.constraint || null,
          detail: err.detail || err.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Pelanggaran CHECK Constraint lainnya (23514)
    if (err.code === '23514') {
      return res.status(400).json({
        success: false,
        status: 400,
        code: 'CHECK_CONSTRAINT_VIOLATION',
        message: `Nilai melanggar aturan validasi tabel (${err.constraint}): ${err.message}`,
        details: {
          sqlState: err.code,
          table: err.table,
          constraint: err.constraint,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Fallback Unexpected Error
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
