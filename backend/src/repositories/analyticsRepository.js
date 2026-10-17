const db = require('../config/db');

class AnalyticsRepository {
  // ==========================================================================
  // 1. LAPORAN JOIN RIWAYAT SERVIS PER MOTOR (/app/analytics/vehicle-history)
  //    Menggunakan Stored Function asli Kelompok 1: sp_riwayat_servis(motor_nopol)
  //    JOIN "WORK_ORDER", "MOTOR", "PELANGGAN", "CABANG", "MEKANIK", "WO_JASA", "WO_SUKU_CADANG"
  // ==========================================================================
  async getVehicleHistoryReport(filters = {}) {
    const params = [];
    const conditions = [];

    if (filters.motorId) {
      params.push(String(filters.motorId).trim().toUpperCase());
      conditions.push(`UPPER(m.motor_nopol) = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search.trim()}%`);
      conditions.push(
        `(m.motor_nopol ILIKE $${params.length} OR p.pelanggan_nama ILIKE $${params.length} OR sr.work_no ILIKE $${params.length})`
      );
    }
    if (
      filters.tipePelanggan &&
      ['INDIVIDU', 'KORPORAT'].includes(String(filters.tipePelanggan).toUpperCase())
    ) {
      const normalized =
        String(filters.tipePelanggan).toUpperCase() === 'KORPORAT' ? 'Korporat' : 'Individu';
      params.push(normalized);
      conditions.push(`p.pelanggan_tipe = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseCte = `
      WITH riwayat_cte AS (
        SELECT
          sr.work_no AS work_order_id,
          sr.work_no,
          sr.work_no AS nomor_wo,
          CASE
            WHEN sr.status = 'Dibatalkan' THEN 'dibatalkan'
            WHEN wo.pembayaran_status = 'Lunas' OR sr.status = 'Dibayar' THEN 'dibayar'
            WHEN sr.status = 'Selesai' THEN 'selesai'
            WHEN sr.status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
            ELSE 'antre'
          END AS status_wo,
          sr.status AS work_status,
          wo.pembayaran_status,
          CASE
            WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
            ELSE 'LANGSUNG'
          END AS skema_pembayaran,
          sr.tgl_masuk AS waktu_masuk,
          sr.tgl_selesai AS waktu_selesai,
          m.motor_kilometer AS kilometer_masuk,
          sr.keluhan,
          NULL::TEXT AS catatan_mekanik,
          COALESCE(
            (
              SELECT SUM(js.jasa_biaya)
              FROM "WO_JASA" wj
              JOIN "JASA_SERVIS" js ON js.jasa_kode = wj.jasa_kode
              WHERE wj.work_no = sr.work_no
            ),
            0
          ) AS total_biaya_jasa,
          COALESCE(
            (
              SELECT SUM(wsc.suku_cadang_jumlah)
              FROM "WO_SUKU_CADANG" wsc
              WHERE wsc.work_no = sr.work_no
            ),
            0
          ) AS total_biaya_part,
          wo.pembayaran_diskon AS diskon,
          fn_hitung_total_tagihan(sr.work_no) AS total_tagihan,
          fn_status_garansi_by_wo(sr.work_no) AS status_garansi,
          m.motor_nopol AS motor_id,
          m.motor_nopol,
          m.motor_nopol AS plat_nomor,
          m.motor_merek AS merk_motor,
          m.motor_tipe AS tipe_motor,
          m.motor_tahun AS tahun_motor,
          m.motor_no_rangka AS nomor_rangka,
          p.pelanggan_id,
          p.pelanggan_id AS kode_pelanggan,
          p.pelanggan_nama AS nama_pelanggan,
          UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
          p.pelanggan_tipe,
          CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
          c.cabang_kode AS kode_cabang,
          c.cabang_nama AS nama_cabang,
          COALESCE(pg_mek.pegawai_nama, '-') AS nama_mekanik,
          COALESCE(
            (
              SELECT STRING_AGG(js.jasa_uraian, ', ')
              FROM "WO_JASA" wj
              JOIN "JASA_SERVIS" js ON js.jasa_kode = wj.jasa_kode
              WHERE wj.work_no = sr.work_no
            ),
            '-'
          ) AS daftar_jasa,
          COALESCE(
            (
              SELECT STRING_AGG(sc.suku_cadang_nama || ' (x' || wsc.suku_cadang_qty || ')', ', ')
              FROM "WO_SUKU_CADANG" wsc
              JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = wsc.suku_cadang_kode
              WHERE wsc.work_no = sr.work_no
            ),
            '-'
          ) AS daftar_part
        FROM "MOTOR" m
        CROSS JOIN LATERAL sp_riwayat_servis(m.motor_nopol) sr
        JOIN "WORK_ORDER" wo ON wo.work_no = sr.work_no
        JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
        JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
        LEFT JOIN "MEKANIK" mk ON mk.mekanik_id = wo.mekanik_id
        LEFT JOIN "PEGAWAI" pg_mek ON pg_mek.pegawai_id = mk.mekanik_id
        ${whereClause}
      )
    `;

    const sql = `
      ${baseCte}
      SELECT *
      FROM riwayat_cte
      ORDER BY waktu_masuk DESC, work_no DESC;
    `;

    const summarySql = `
      ${baseCte}
      SELECT
        COUNT(*) AS total_kunjungan,
        COUNT(DISTINCT motor_nopol) AS unit_motor_unik,
        COALESCE(SUM(total_biaya_jasa), 0) AS akumulasi_biaya_jasa,
        COALESCE(SUM(total_biaya_part), 0) AS akumulasi_biaya_part,
        COALESCE(SUM(total_tagihan), 0) AS akumulasi_total_servis
      FROM riwayat_cte;
    `;

    const [rowsRes, sumRes] = await Promise.all([
      db.query(sql, params),
      db.query(summarySql, params),
    ]);

    return {
      data: rowsRes.rows,
      summary: sumRes.rows[0],
    };
  }

  // ==========================================================================
  // 2. LAPORAN JOIN PENDAPATAN PER CABANG & RENTANG TANGGAL (/app/analytics/branch-revenue)
  //    JOIN "CABANG" & "WORK_ORDER" (+ sp_daftar_wo_cabang & fn_hitung_total_tagihan)
  //    Skenario Debugging #5: Wajib menggunakan COALESCE(SUM(...), 0) dan
  //    mengembalikan HTTP 200 OK dengan data: [] dan total_pendapatan: 0
  //    ketika rentang tanggal kosong!
  // ==========================================================================
  async getBranchRevenueReport({ startDate, endDate, cabangId }) {
    const params = [startDate, endDate];
    let branchFilter = '';
    if (cabangId) {
      params.push(String(cabangId).trim().toUpperCase());
      branchFilter = `AND wo.cabang_kode = $3`;
    }

    const baseTransactionsCte = `
      WITH tx_cte AS (
        SELECT
          wo.work_no AS pembayaran_id,
          wo.work_no,
          ('KWT-' || wo.work_no) AS nomor_kwitansi,
          COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) AS tanggal_bayar,
          DATE(wo.work_tgl_masuk) AS tanggal_transaksi,
          UPPER(COALESCE(wo.pembayaran_metode, 'TUNAI')) AS metode_pembayaran,
          wo.pembayaran_metode,
          UPPER(wo.pembayaran_status) AS status_pembayaran,
          wo.pembayaran_status,
          fn_hitung_total_tagihan(wo.work_no) AS jumlah_bayar,
          wo.work_no AS work_order_id,
          wo.work_no AS nomor_wo,
          CASE
            WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
            ELSE 'LANGSUNG'
          END AS skema_pembayaran,
          COALESCE(
            (
              SELECT SUM(js.jasa_biaya)
              FROM "WO_JASA" wj
              JOIN "JASA_SERVIS" js ON js.jasa_kode = wj.jasa_kode
              WHERE wj.work_no = wo.work_no
            ),
            0
          ) AS total_biaya_jasa,
          COALESCE(
            (
              SELECT SUM(wsc.suku_cadang_jumlah)
              FROM "WO_SUKU_CADANG" wsc
              WHERE wsc.work_no = wo.work_no
            ),
            0
          ) AS total_biaya_part,
          wo.pembayaran_diskon AS diskon,
          c.cabang_kode AS cabang_id,
          c.cabang_kode,
          c.cabang_kode AS kode_cabang,
          c.cabang_nama AS nama_cabang,
          'Palangka Raya'::VARCHAR AS kota,
          p.pelanggan_id,
          p.pelanggan_nama AS nama_pelanggan,
          UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
          CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
          m.motor_nopol AS plat_nomor
        FROM "WORK_ORDER" wo
        JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
        JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
        JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
        WHERE wo.work_status <> 'Dibatalkan'
          AND (wo.pembayaran_status = 'Lunas' OR wo.work_status IN ('Selesai', 'Dibayar'))
          AND DATE(wo.work_tgl_masuk) BETWEEN $1::DATE AND $2::DATE
          ${branchFilter}
      )
    `;

    const detailSql = `
      ${baseTransactionsCte}
      SELECT *
      FROM tx_cte
      ORDER BY tanggal_bayar DESC, work_no DESC;
    `;

    const grandTotalSql = `
      ${baseTransactionsCte}
      SELECT
        COUNT(pembayaran_id) AS total_transaksi,
        COALESCE(SUM(total_biaya_jasa), 0) AS total_pendapatan_jasa,
        COALESCE(SUM(total_biaya_part), 0) AS total_pendapatan_part,
        COALESCE(SUM(diskon), 0) AS total_diskon,
        COALESCE(SUM(jumlah_bayar), 0) AS total_pendapatan,
        COALESCE(SUM(CASE WHEN tipe_pelanggan = 'INDIVIDU' THEN jumlah_bayar ELSE 0 END), 0) AS pendapatan_b2c,
        COALESCE(SUM(CASE WHEN tipe_pelanggan = 'KORPORAT' THEN jumlah_bayar ELSE 0 END), 0) AS pendapatan_b2b
      FROM tx_cte;
    `;

    const perBranchSql = `
      ${baseTransactionsCte}
      SELECT
        c.cabang_kode AS cabang_id,
        c.cabang_kode,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        'Palangka Raya'::VARCHAR AS kota,
        COUNT(tx.pembayaran_id) AS jumlah_transaksi,
        COALESCE(SUM(tx.total_biaya_jasa), 0) AS pendapatan_jasa,
        COALESCE(SUM(tx.total_biaya_part), 0) AS pendapatan_part,
        COALESCE(SUM(tx.diskon), 0) AS total_diskon,
        COALESCE(SUM(tx.jumlah_bayar), 0) AS total_pendapatan,
        (
          SELECT COUNT(*)
          FROM sp_daftar_wo_cabang($1::TIMESTAMPTZ, ($2::DATE + INTERVAL '1 day - 1 second')::TIMESTAMPTZ, c.cabang_kode)
        ) AS total_wo_terdaftar_sp
      FROM "CABANG" c
      LEFT JOIN tx_cte tx ON tx.cabang_kode = c.cabang_kode
      ${cabangId ? 'WHERE c.cabang_kode = $3' : ''}
      GROUP BY c.cabang_kode, c.cabang_nama
      ORDER BY c.cabang_kode ASC;
    `;

    const [detailRes, grandRes, branchRes] = await Promise.all([
      db.query(detailSql, params),
      db.query(grandTotalSql, params),
      db.query(perBranchSql, params),
    ]);

    const summary = grandRes.rows[0];

    return {
      data: detailRes.rows,
      total_pendapatan: Number(summary.total_pendapatan || 0),
      summary: {
        ...summary,
        startDate,
        endDate,
        cabangId: cabangId || null,
      },
      branchBreakdown: branchRes.rows,
    };
  }

  // ==========================================================================
  // 3. LAPORAN JOIN PENGGUNAAN SUKU CADANG PER WORK ORDER (/app/analytics/sparepart-usage)
  //    JOIN "WO_SUKU_CADANG", "SUKU_CADANG", "WORK_ORDER", "MOTOR", "CABANG"
  // ==========================================================================
  async getSparepartUsageReport(filters = {}) {
    const params = [];
    const conditions = [];

    if (filters.workOrderId) {
      params.push(String(filters.workOrderId).trim().toUpperCase());
      conditions.push(`UPPER(wo.work_no) = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search.trim()}%`);
      conditions.push(
        `(wo.work_no ILIKE $${params.length} OR sc.suku_cadang_kode ILIKE $${params.length} OR sc.suku_cadang_nama ILIKE $${params.length} OR wo.motor_nopol ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseCte = `
      WITH usage_cte AS (
        SELECT
          (wsc.work_no || '-' || wsc.suku_cadang_kode) AS detail_id,
          wo.work_no AS work_order_id,
          wo.work_no,
          wo.work_no AS nomor_wo,
          wo.work_tgl_masuk AS waktu_masuk,
          CASE
            WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
            ELSE LOWER(wo.work_status)
          END AS status_wo,
          wo.work_status,
          c.cabang_kode AS kode_cabang,
          c.cabang_kode,
          c.cabang_nama AS nama_cabang,
          m.motor_nopol AS plat_nomor,
          m.motor_nopol,
          (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan,
          p.pelanggan_nama AS nama_pelanggan,
          UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
          CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
          sc.suku_cadang_kode AS suku_cadang_id,
          sc.suku_cadang_kode,
          sc.suku_cadang_kode AS kode_sku,
          sc.suku_cadang_nama AS nama_part,
          sc.suku_cadang_nama,
          'SUKU CADANG'::VARCHAR AS kategori_part,
          'PCS'::VARCHAR AS satuan,
          wsc.suku_cadang_qty AS jumlah_digunakan,
          wsc.suku_cadang_qty,
          sc.suku_cadang_harga_satuan AS harga_satuan,
          sc.suku_cadang_harga_satuan,
          wsc.suku_cadang_jumlah AS subtotal,
          wsc.suku_cadang_jumlah,
          COALESCE(st.stok_qty, 0) AS sisa_stok_gudang
        FROM "WO_SUKU_CADANG" wsc
        JOIN "WORK_ORDER" wo ON wo.work_no = wsc.work_no
        JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = wsc.suku_cadang_kode
        JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
        JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
        JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
        LEFT JOIN "STOK_CABANG" st
          ON st.suku_cadang_kode = wsc.suku_cadang_kode AND st.cabang_kode = wo.cabang_kode
        ${whereClause}
      )
    `;

    const sql = `
      ${baseCte}
      SELECT *
      FROM usage_cte
      ORDER BY waktu_masuk DESC, work_no DESC, suku_cadang_kode ASC;
    `;

    const summarySql = `
      ${baseCte}
      SELECT
        COUNT(*) AS total_baris_penggunaan,
        COALESCE(SUM(jumlah_digunakan), 0) AS total_unit_terpakai,
        COALESCE(SUM(subtotal), 0) AS total_nilai_part
      FROM usage_cte;
    `;

    const [rowsRes, sumRes] = await Promise.all([
      db.query(sql, params),
      db.query(summarySql, params),
    ]);

    return {
      data: rowsRes.rows,
      summary: sumRes.rows[0],
    };
  }

  // ==========================================================================
  // 4. LAPORAN JOIN STOK MINIMUM SUKU CADANG (/app/analytics/low-stock)
  //    JOIN "STOK_CABANG", "SUKU_CADANG", "CABANG" WHERE stok_qty < stok_minimum
  // ==========================================================================
  async getLowStockReport() {
    const baseCte = `
      WITH low_stock_cte AS (
        SELECT
          (st.cabang_kode || '-' || sc.suku_cadang_kode) AS id,
          sc.suku_cadang_kode,
          sc.suku_cadang_kode AS kode_sku,
          sc.suku_cadang_nama AS nama_part,
          sc.suku_cadang_nama,
          'SUKU CADANG'::VARCHAR AS kategori,
          'PCS'::VARCHAR AS satuan,
          st.cabang_kode,
          cb.cabang_nama,
          ('GUDANG-' || st.cabang_kode) AS lokasi_rak,
          st.stok_qty AS stok_saat_ini,
          st.stok_qty,
          st.stok_minimum,
          (st.stok_minimum - st.stok_qty) AS defisit_stok,
          GREATEST((st.stok_minimum * 2) - st.stok_qty, 5) AS rekomendasi_restock,
          ROUND(sc.suku_cadang_harga_satuan * 0.75, 0) AS harga_beli,
          sc.suku_cadang_harga_satuan AS harga_jual,
          CASE
            WHEN st.stok_qty = 0 THEN 'HABIS (OUT OF STOCK)'
            ELSE 'KRITIS (REORDER SEGERA)'
          END AS status_inventori,
          COALESCE(sup.supplier_id, 'SP001') AS kode_supplier,
          COALESCE(sup.supplier_nama, 'PT Sumber Motor Jaya') AS nama_supplier,
          'Account Manager'::VARCHAR AS kontak_person,
          COALESCE(sup.supplier_telp, '-') AS telepon_supplier,
          'Palangka Raya'::VARCHAR AS kota_supplier
        FROM "STOK_CABANG" st
        JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = st.suku_cadang_kode
        JOIN "CABANG" cb ON cb.cabang_kode = st.cabang_kode
        LEFT JOIN LATERAL (
          SELECT s1.supplier_id
          FROM "SUPPLIER_SUKU_CADANG" s1
          WHERE s1.suku_cadang_kode = sc.suku_cadang_kode
          ORDER BY s1.supplier_id ASC
          LIMIT 1
        ) ssc ON TRUE
        LEFT JOIN "SUPPLIER" sup ON sup.supplier_id = ssc.supplier_id
        WHERE st.stok_qty < st.stok_minimum
      )
    `;

    const sql = `
      ${baseCte}
      SELECT *
      FROM low_stock_cte
      ORDER BY stok_saat_ini ASC, cabang_kode ASC, kode_sku ASC;
    `;

    const summarySql = `
      ${baseCte}
      SELECT
        COUNT(*) AS jumlah_item_kritis,
        COUNT(*) FILTER (WHERE stok_saat_ini = 0) AS jumlah_item_habis,
        COALESCE(SUM(rekomendasi_restock * harga_beli), 0) AS estimasi_biaya_restock
      FROM low_stock_cte;
    `;

    const [rowsRes, sumRes] = await Promise.all([db.query(sql), db.query(summarySql)]);

    return {
      data: rowsRes.rows,
      summary: sumRes.rows[0],
    };
  }
}

module.exports = new AnalyticsRepository();
