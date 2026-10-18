const db = require('../config/db');

class OverviewRepository {
  getRoleFlags() {
    const user = db.getCurrentUserContext();
    const role = user?.role || 'admin_cabang';
    return {
      role,
      isRestrictedCustomer: ['kasir', 'mekanik', 'gudang', 'auditor'].includes(role),
      isRestrictedWo: ['mekanik', 'gudang', 'auditor'].includes(role),
      canReadAuditLog: ['owner', 'admin_cabang', 'auditor'].includes(role),
    };
  }

  async getDashboardMetrics() {
    const { isRestrictedCustomer, isRestrictedWo, canReadAuditLog } = this.getRoleFlags();
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';
    const customerSource = isRestrictedCustomer ? '"VW_PELANGGAN_AMAN"' : '"PELANGGAN"';

    const kpiSql = isRestrictedWo
      ? `
        SELECT
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN") AS total_work_orders,
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN" WHERE work_status IN ('Dibuat', 'Antre')) AS wo_antre,
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN" WHERE work_status IN ('Diproses', 'Dikerjakan')) AS wo_dikerjakan,
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN" WHERE work_status = 'Selesai') AS wo_selesai,
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN" WHERE work_status = 'Dibayar') AS wo_dibayar,
          (SELECT COUNT(*) FROM "VW_WORK_ORDER_AMAN" WHERE work_status = 'Dibatalkan') AS wo_dibatalkan,
          (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM "VW_WORK_ORDER_AMAN" WHERE work_status <> 'Dibatalkan') AS total_pendapatan,
          (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM "VW_WORK_ORDER_AMAN" WHERE work_status = 'Dibayar') AS pendapatan_tunai_lunas,
          (SELECT COALESCE(SUM(total_tagihan), 0) FROM "TAGIHAN_KOLEKTIF" WHERE status_tagihan IN ('Belum Dibayar', 'Belum Lunas')) AS piutang_plafon_korporat,
          (SELECT COUNT(*) FROM ${customerSource}) AS total_pelanggan,
          (SELECT COUNT(*) FROM ${customerSource} WHERE pelanggan_tipe = 'Individu') AS pelanggan_individu,
          (SELECT COUNT(*) FROM ${customerSource} WHERE pelanggan_tipe = 'Korporat') AS pelanggan_korporat,
          (SELECT COUNT(*) FROM "MOTOR") AS total_motor,
          (SELECT COUNT(*) FROM "STOK_CABANG" WHERE stok_qty <= stok_minimum) AS jumlah_stok_kritis,
          (SELECT COUNT(*) FROM "KONTRAK_KORPORAT" WHERE status_kontrak = 'Aktif') AS kontrak_aktif,
          (SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF" WHERE status_tagihan IN ('Belum Dibayar', 'Belum Lunas')) AS invoice_kolektif_outstanding,
          (SELECT COUNT(*) FROM "GARANSI") AS garansi_aktif,
          ${canReadAuditLog ? '(SELECT COUNT(*) FROM "AUDIT_LOG")' : '0'} AS total_audit_logs;
      `
      : `
        SELECT
          (SELECT COUNT(*) FROM "WORK_ORDER") AS total_work_orders,
          (SELECT COUNT(*) FROM "WORK_ORDER" WHERE work_status IN ('Dibuat', 'Antre')) AS wo_antre,
          (SELECT COUNT(*) FROM "WORK_ORDER" WHERE work_status IN ('Diproses', 'Dikerjakan')) AS wo_dikerjakan,
          (SELECT COUNT(*) FROM "WORK_ORDER" WHERE work_status = 'Selesai' AND pembayaran_status = 'Belum Lunas') AS wo_selesai,
          (SELECT COUNT(*) FROM "WORK_ORDER" WHERE pembayaran_status = 'Lunas' OR work_status = 'Dibayar') AS wo_dibayar,
          (SELECT COUNT(*) FROM "WORK_ORDER" WHERE work_status = 'Dibatalkan') AS wo_dibatalkan,
          (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM "WORK_ORDER" WHERE work_status <> 'Dibatalkan') AS total_pendapatan,
          (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM "WORK_ORDER" WHERE pembayaran_status = 'Lunas') AS pendapatan_tunai_lunas,
          (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM "WORK_ORDER" WHERE pembayaran_metode = 'Tagihan Kolektif' AND pembayaran_status = 'Belum Lunas') AS piutang_plafon_korporat,
          (SELECT COUNT(*) FROM ${customerSource}) AS total_pelanggan,
          (SELECT COUNT(*) FROM ${customerSource} WHERE pelanggan_tipe = 'Individu') AS pelanggan_individu,
          (SELECT COUNT(*) FROM ${customerSource} WHERE pelanggan_tipe = 'Korporat') AS pelanggan_korporat,
          (SELECT COUNT(*) FROM "MOTOR") AS total_motor,
          (SELECT COUNT(*) FROM "STOK_CABANG" WHERE stok_qty <= stok_minimum) AS jumlah_stok_kritis,
          (SELECT COUNT(*) FROM "KONTRAK_KORPORAT" WHERE status_kontrak = 'Aktif') AS kontrak_aktif,
          (SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF" WHERE status_tagihan IN ('Belum Dibayar', 'Belum Lunas')) AS invoice_kolektif_outstanding,
          (SELECT COUNT(*) FROM "GARANSI") AS garansi_aktif,
          ${canReadAuditLog ? '(SELECT COUNT(*) FROM "AUDIT_LOG")' : '0'} AS total_audit_logs;
      `;

    const recentWoPaymentSelect = isRestrictedWo
      ? `
        CASE
          WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
          WHEN wo.work_status = 'Dibayar' THEN 'dibayar'
          WHEN wo.work_status = 'Selesai' THEN 'selesai'
          WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
          ELSE 'antre'
        END AS status,
        wo.work_status,
        'REDACTED'::VARCHAR AS pembayaran_status,
        'REDACTED'::VARCHAR AS pembayaran_metode,
        0::INT AS pembayaran_diskon,
        CASE
          WHEN p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'TUNAI'
        END AS skema_pembayaran,
      `
      : `
        CASE
          WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
          WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
          WHEN wo.work_status = 'Selesai' THEN 'selesai'
          WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
          ELSE 'antre'
        END AS status,
        wo.work_status,
        wo.pembayaran_status,
        wo.pembayaran_metode,
        wo.pembayaran_diskon,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'TUNAI'
        END AS skema_pembayaran,
      `;

    const recentWoSql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        ${recentWoPaymentSelect}
        wo.work_keluhan AS keluhan,
        wo.work_keluhan,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_masuk,
        wo.work_tgl_selesai,
        m.motor_nopol AS plat_nomor,
        m.motor_nopol,
        m.motor_merek AS merk,
        m.motor_merek,
        m.motor_tipe AS tipe_motor,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        c.cabang_kode AS kode_cabang,
        c.cabang_kode,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        COALESCE(pg.pegawai_nama, '-') AS nama_mekanik,
        fn_status_garansi_by_wo(wo.work_no) AS status_garansi
      FROM ${woSource} wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "PEGAWAI" pg ON pg.pegawai_id = wo.mekanik_id
      ORDER BY wo.work_tgl_masuk DESC, wo.work_no DESC
      LIMIT 8;
    `;

    const branchSummarySql = `
      SELECT
        c.cabang_kode AS id,
        c.cabang_kode,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        c.cabang_alamat,
        c.cabang_telp,
        (c.jam_buka::TEXT || ' - ' || c.jam_tutup::TEXT) AS cabang_jam_operasional,
        c.kapasitas_slot,
        'Palangka Raya'::VARCHAR AS kota,
        COUNT(DISTINCT wo.work_no) AS total_wo,
        COUNT(DISTINCT CASE WHEN wo.work_status IN ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan') THEN wo.work_no END) AS wo_aktif,
        COALESCE(SUM(CASE WHEN wo.work_status <> 'Dibatalkan' THEN fn_hitung_total_tagihan(wo.work_no) ELSE 0 END), 0) AS total_pendapatan
      FROM "CABANG" c
      LEFT JOIN ${woSource} wo ON wo.cabang_kode = c.cabang_kode
      GROUP BY c.cabang_kode, c.cabang_nama, c.cabang_alamat, c.cabang_telp, c.jam_buka, c.jam_tutup, c.kapasitas_slot
      ORDER BY c.cabang_kode ASC;
    `;

    const lowStockSql = `
      SELECT
        sc.suku_cadang_kode AS id,
        sc.suku_cadang_kode,
        sc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        'SUKU CADANG'::VARCHAR AS kategori,
        sc.suku_cadang_harga_satuan AS harga_jual,
        st.cabang_kode,
        cb.cabang_nama,
        st.stok_qty AS stok_saat_ini,
        st.stok_qty,
        st.stok_minimum,
        (st.stok_minimum - st.stok_qty) AS defisit_stok,
        CASE
          WHEN st.stok_qty = 0 THEN 'HABIS (OUT OF STOCK)'
          ELSE 'KRITIS (REORDER SEGERA)'
        END AS status_inventori,
        COALESCE(sup.supplier_nama, '-') AS nama_supplier,
        COALESCE(sup.supplier_telp, '-') AS telepon_supplier
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
      WHERE st.stok_qty <= st.stok_minimum
      ORDER BY st.stok_qty ASC, st.cabang_kode ASC
      LIMIT 8;
    `;

    const npwpSelect = isRestrictedCustomer
      ? `'***REDACTED***'::VARCHAR AS npwp`
      : `p.pelanggan_no_identitas AS npwp`;
    const npwpGroupBy = isRestrictedCustomer ? '' : ', p.pelanggan_no_identitas';

    const corporateSummarySql = `
      SELECT
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama,
        p.pelanggan_nama AS nama_perusahaan,
        ${npwpSelect},
        p.pelanggan_nama AS pic_nama,
        p.pelanggan_telp AS telepon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak,
        UPPER(kk.status_kontrak) AS status_kontrak,
        kk.diskon_kontrak_persen,
        kk.kuota_motor,
        p.plafon_kredit,
        p.sisa_plafon,
        (p.plafon_kredit - p.sisa_plafon) AS plafon_terpakai,
        CASE
          WHEN p.plafon_kredit > 0 THEN ROUND(((p.plafon_kredit - p.sisa_plafon)::NUMERIC / p.plafon_kredit) * 100, 2)
          ELSE 0
        END AS persentase_utilisasi,
        COUNT(DISTINCT m.motor_nopol) AS jumlah_unit_armada,
        COUNT(DISTINCT tk.tagihan_id) FILTER (WHERE tk.status_tagihan IN ('Belum Dibayar', 'Belum Lunas')) AS tagihan_outstanding_count
      FROM ${customerSource} p
      LEFT JOIN "KONTRAK_KORPORAT" kk ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      LEFT JOIN "MOTOR" m ON m.pelanggan_id = p.pelanggan_id
      LEFT JOIN "TAGIHAN_KOLEKTIF" tk ON tk.pelanggan_id = p.pelanggan_id
      WHERE p.pelanggan_tipe = 'Korporat'
      GROUP BY
        p.pelanggan_id, p.pelanggan_nama${npwpGroupBy},
        p.pelanggan_telp, kk.kontrak_id, kk.status_kontrak,
        kk.diskon_kontrak_persen, kk.kuota_motor, p.plafon_kredit, p.sisa_plafon
      ORDER BY p.pelanggan_id ASC;
    `;

    const [kpiRes, recentWoRes, branchRes, lowStockRes, corpRes] = await Promise.all([
      db.query(kpiSql),
      db.query(recentWoSql),
      db.query(branchSummarySql),
      db.query(lowStockSql),
      db.query(corporateSummarySql),
    ]);

    return {
      metrics: kpiRes.rows[0],
      recentWorkOrders: recentWoRes.rows,
      branchSummary: branchRes.rows,
      lowStockAlerts: lowStockRes.rows,
      corporateFleetSummary: corpRes.rows,
    };
  }
}

module.exports = new OverviewRepository();
