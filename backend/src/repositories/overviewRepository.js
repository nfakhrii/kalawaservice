const db = require("../config/db");

class OverviewRepository {
  getRoleFlags() {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new Error("User belum terautentikasi.");
    }

    const role = String(user.role || "")
      .trim()
      .toLowerCase();

    return {
      role,
      isRestrictedCustomer: ["kasir", "mekanik", "gudang", "auditor"].includes(
        role
      ),
      isRestrictedWo: ["mekanik", "gudang", "auditor"].includes(role),
      isMekanik: role === "mekanik",
    };
  }

  getOverviewScope() {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new Error("User belum terautentikasi.");
    }

    const role = String(user.role || "")
      .trim()
      .toLowerCase();

    const allowedRoles = [
      "owner",
      "auditor",
      "admin_cabang",
      "kasir",
      "mekanik",
      "gudang",
    ];

    if (!allowedRoles.includes(role)) {
      throw new Error(`Role '${role}' tidak memiliki akses Overview.`);
    }

    const isGlobal = ["owner", "auditor"].includes(role);
    const isMekanik = role === "mekanik";
    const cabangKode = isGlobal
      ? null
      : String(user.kode_cabang || "")
          .trim()
          .toUpperCase();

    if (!isGlobal && !cabangKode) {
      throw new Error("Cabang pengguna tidak ditemukan.");
    }

    let pegawaiId = null;

    if (isMekanik) {
      pegawaiId = String(user.pegawai_id || "")
        .trim()
        .toUpperCase();

      if (!pegawaiId) {
        throw new Error(
          "Identitas pegawai mekanik tidak ditemukan pada sesi pengguna."
        );
      }
    }

    return {
      role,
      cabangKode,
      isGlobal,
      isMekanik,
      pegawaiId,
    };
  }

  async getDashboardMetrics() {
    const { isRestrictedCustomer, isRestrictedWo, isMekanik } =
      this.getRoleFlags();

    const { role, cabangKode, isGlobal, pegawaiId } = this.getOverviewScope();

    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    // Parameter untuk query yang menggunakan CTE scoped_wo.
    const params = cabangKode ? [cabangKode] : [];

    // Parameter kedua khusus untuk identitas mekanik.
    if (isMekanik) {
      params.push(pegawaiId);
    }

    // Parameter terpisah untuk query inventori yang hanya membutuhkan cabang.
    const branchParams = cabangKode ? [cabangKode] : [];

    let woPredicate = "";

    if (isMekanik) {
      woPredicate = `
    WHERE (
      UPPER(wo_base.mekanik_id) = $2
      OR EXISTS (
        SELECT 1
        FROM "WO_MEKANIK" wm
        WHERE UPPER(wm.work_no) = UPPER(wo_base.work_no)
          AND UPPER(wm.mekanik_id) = $2
      )
    )
  `;
    } else if (cabangKode) {
      woPredicate = "WHERE wo_base.cabang_kode = $1";
    }

    // Pembatasan stok tetap berdasarkan cabang akun.
    const stockPredicate = cabangKode ? "AND st.cabang_kode = $1" : "";

    const customerPredicate = cabangKode
      ? `AND EXISTS (
      SELECT 1
      FROM scoped_customers sc
      WHERE sc.pelanggan_id = p.pelanggan_id
    )`
      : "";

    const contractPredicate = cabangKode
      ? `AND EXISTS (
      SELECT 1
      FROM scoped_customers sc
      WHERE sc.pelanggan_id = kk.pelanggan_id
    )`
      : "";

    const motorPredicate = cabangKode
      ? `WHERE EXISTS (
      SELECT 1
      FROM scoped_motors sm
      WHERE sm.motor_nopol = m.motor_nopol
    )`
      : "";

    const cte = `
      WITH scoped_wo AS (
        SELECT wo_base.*
        FROM ${woSource} wo_base
        ${woPredicate}
      ),
      scoped_motors AS (
        SELECT DISTINCT motor_nopol
        FROM scoped_wo
      ),
      scoped_customers AS (
        SELECT DISTINCT m.pelanggan_id
        FROM "MOTOR" m
        JOIN scoped_motors sm
          ON sm.motor_nopol = m.motor_nopol
      )
    `;

    // The safe WO view may omit payment columns. Keep the restricted
    // dashboard's existing status-based counts and do not expose invoice totals.
    const woDoneSql = isRestrictedWo
      ? "(SELECT COUNT(*) FROM scoped_wo WHERE work_status = 'Selesai')"
      : "(SELECT COUNT(*) FROM scoped_wo WHERE work_status = 'Selesai' AND pembayaran_status = 'Belum Lunas')";
    const woPaidSql = isRestrictedWo
      ? "(SELECT COUNT(*) FROM scoped_wo WHERE work_status = 'Dibayar')"
      : "(SELECT COUNT(*) FROM scoped_wo WHERE pembayaran_status = 'Lunas' OR work_status = 'Dibayar')";
    const paidRevenueSql = isRestrictedWo
      ? "(SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM scoped_wo WHERE work_status = 'Dibayar')"
      : "(SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0) FROM scoped_wo WHERE pembayaran_status = 'Lunas')";
    // This is the value of all non-cancelled WOs, not recognized cash revenue.
    const invoiceValueSql = isRestrictedWo
      ? "NULL::NUMERIC"
      : `(SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0)
          FROM scoped_wo
          WHERE pembayaran_metode = 'Tagihan Kolektif'
            AND pembayaran_status = 'Belum Lunas')`;
    const auditCountSql = ["owner", "auditor"].includes(role)
      ? '(SELECT COUNT(*) FROM "AUDIT_LOG")'
      : "0::BIGINT";

    const canViewCorporate = !["mekanik", "gudang"].includes(role);

    const kontrakAktifSql = canViewCorporate
      ? `(SELECT COUNT(*) FROM "KONTRAK_KORPORAT" kk
      WHERE kk.status_kontrak = 'Aktif' ${contractPredicate})`
      : "0::BIGINT";

    const invoiceOutstandingSql = canViewCorporate
      ? `(SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF" tk
          WHERE tk.status_tagihan IN ('Belum Dibayar', 'Belum Lunas')
          ${
            cabangKode
              ? `AND EXISTS (
                  SELECT 1
                  FROM scoped_wo wo
                  WHERE wo.tagihan_id = tk.tagihan_id
                )`
              : ""
          })`
      : "0::BIGINT";

    const kpiSql = `${cte}
      SELECT
        (SELECT COUNT(*) FROM scoped_wo) AS total_work_orders,
        (SELECT COUNT(*) FROM scoped_wo WHERE work_status IN ('Dibuat', 'Antre')) AS wo_antre,
        (SELECT COUNT(*) FROM scoped_wo WHERE work_status IN ('Diproses', 'Dikerjakan')) AS wo_dikerjakan,
        ${woDoneSql} AS wo_selesai,
        ${woPaidSql} AS wo_dibayar,
        (SELECT COUNT(*) FROM scoped_wo WHERE work_status = 'Dibatalkan') AS wo_dibatalkan,
        (SELECT COALESCE(SUM(fn_hitung_total_tagihan(work_no)), 0)
         FROM scoped_wo WHERE work_status <> 'Dibatalkan') AS total_pendapatan,
        ${paidRevenueSql} AS pendapatan_tunai_lunas,
        ${invoiceValueSql} AS piutang_plafon_korporat,
        (SELECT COUNT(*) FROM ${customerSource} p WHERE TRUE ${customerPredicate}) AS total_pelanggan,
        (SELECT COUNT(*) FROM ${customerSource} p
         WHERE p.pelanggan_tipe = 'Individu' ${customerPredicate}) AS pelanggan_individu,
        (SELECT COUNT(*) FROM ${customerSource} p
         WHERE p.pelanggan_tipe = 'Korporat' ${customerPredicate}) AS pelanggan_korporat,
        (SELECT COUNT(*) FROM "MOTOR" m ${motorPredicate}) AS total_motor,
        (SELECT COUNT(*) FROM "STOK_CABANG" st
         WHERE st.stok_qty <= st.stok_minimum ${stockPredicate}) AS jumlah_stok_kritis,
        ${kontrakAktifSql} AS kontrak_aktif,
        ${invoiceOutstandingSql} AS invoice_kolektif_outstanding,
        (SELECT COUNT(*) FROM "GARANSI" g
         ${
           cabangKode ? "JOIN scoped_wo wo ON wo.work_no = g.work_no" : ""
         }) AS garansi_aktif,
        ${auditCountSql} AS total_audit_logs
    `;

    const recentWoPaymentSelect = isRestrictedWo
      ? `CASE
           WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
           WHEN wo.work_status = 'Dibayar' THEN 'dibayar'
           WHEN wo.work_status = 'Selesai' THEN 'selesai'
           WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
           ELSE 'antre' END AS status,
         wo.work_status,
         'REDACTED'::VARCHAR AS pembayaran_status,
         'REDACTED'::VARCHAR AS pembayaran_metode,
         0::INT AS pembayaran_diskon,
         CASE WHEN p.pelanggan_tipe = 'Korporat'
           THEN 'PLAFON_KORPORAT' ELSE 'TUNAI' END AS skema_pembayaran,`
      : `CASE
           WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
           WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
           WHEN wo.work_status = 'Selesai' THEN 'selesai'
           WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
           ELSE 'antre' END AS status,
         wo.work_status, wo.pembayaran_status, wo.pembayaran_metode,
         wo.pembayaran_diskon,
         CASE WHEN wo.pembayaran_metode = 'Tagihan Kolektif'
                   OR p.pelanggan_tipe = 'Korporat'
           THEN 'PLAFON_KORPORAT' ELSE 'TUNAI' END AS skema_pembayaran,`;

    // Query yang hanya menggunakan cakupan penugasan mekanik
    // tidak memerlukan parameter kode cabang.
    const mechanicScopedCte = isMekanik ? cte.replace(/\$2/g, "$1") : cte;

    const mechanicScopedParams = isMekanik ? [pegawaiId] : params;

    const recentWoSql = `${mechanicScopedCte}
      SELECT
        wo.work_no AS id, wo.work_no, wo.work_no AS nomor_wo,
        ${recentWoPaymentSelect}
        wo.work_keluhan AS keluhan, wo.work_keluhan,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        wo.work_tgl_masuk AS waktu_masuk, wo.work_tgl_masuk, wo.work_tgl_selesai,
        m.motor_nopol AS plat_nomor, m.motor_nopol,
        m.motor_merek AS merk, m.motor_merek, m.motor_tipe AS tipe_motor,
        p.pelanggan_nama AS nama_pelanggan, p.pelanggan_nama,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan, p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama
             ELSE NULL END AS nama_perusahaan,
        c.cabang_kode AS kode_cabang, c.cabang_kode,
        c.cabang_nama AS nama_cabang, c.cabang_nama,
        COALESCE(pg.pegawai_nama, '-') AS nama_mekanik,
        fn_status_garansi_by_wo(wo.work_no) AS status_garansi
      FROM scoped_wo wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "PEGAWAI" pg ON pg.pegawai_id = wo.mekanik_id
      ORDER BY wo.work_tgl_masuk DESC, wo.work_no DESC
      LIMIT 8
    `;

    const branchSql = `${cte}
      SELECT
        c.cabang_kode AS id, c.cabang_kode, c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang, c.cabang_nama,
        c.cabang_alamat, c.cabang_telp,
        (c.jam_buka::TEXT || ' - ' || c.jam_tutup::TEXT) AS cabang_jam_operasional,
        c.kapasitas_slot, 'Palangka Raya'::VARCHAR AS kota,
        COUNT(DISTINCT wo.work_no) AS total_wo,
        COUNT(DISTINCT CASE WHEN wo.work_status IN
          ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan')
          THEN wo.work_no END) AS wo_aktif,
        COALESCE(SUM(CASE WHEN wo.work_status <> 'Dibatalkan'
          THEN fn_hitung_total_tagihan(wo.work_no) ELSE 0 END), 0) AS total_pendapatan
      FROM "CABANG" c
      LEFT JOIN scoped_wo wo ON wo.cabang_kode = c.cabang_kode
      ${cabangKode ? "WHERE c.cabang_kode = $1" : ""}
      GROUP BY c.cabang_kode, c.cabang_nama, c.cabang_alamat, c.cabang_telp,
               c.jam_buka, c.jam_tutup, c.kapasitas_slot
      ORDER BY c.cabang_kode ASC
    `;

    const lowStockSql = `
      SELECT
        (st.cabang_kode || '-' || sc.suku_cadang_kode) AS id,
        (st.cabang_kode || '-' || sc.suku_cadang_kode) AS suku_cadang_id,
        sc.suku_cadang_kode, sc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part, sc.suku_cadang_nama,
        'SUKU CADANG'::VARCHAR AS kategori, 'PCS'::VARCHAR AS satuan,
        sc.suku_cadang_harga_satuan AS harga_jual,
        st.cabang_kode, cb.cabang_nama,
        st.stok_qty AS stok_saat_ini, st.stok_qty, st.stok_minimum,
        (st.stok_minimum - st.stok_qty) AS defisit_stok,
        CASE WHEN st.stok_qty = 0 THEN 'HABIS (OUT OF STOCK)'
             ELSE 'KRITIS (REORDER SEGERA)' END AS status_inventori,
        COALESCE(sup.supplier_nama, '-') AS nama_supplier,
        COALESCE(sup.supplier_telp, '-') AS telepon_supplier
      FROM "STOK_CABANG" st
      JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = st.suku_cadang_kode
      JOIN "CABANG" cb ON cb.cabang_kode = st.cabang_kode
      LEFT JOIN LATERAL (
        SELECT s1.supplier_id FROM "SUPPLIER_SUKU_CADANG" s1
        WHERE s1.suku_cadang_kode = sc.suku_cadang_kode
        ORDER BY s1.supplier_id ASC LIMIT 1
      ) ssc ON TRUE
      LEFT JOIN "SUPPLIER" sup ON sup.supplier_id = ssc.supplier_id
      WHERE st.stok_qty <= st.stok_minimum ${stockPredicate}
      ORDER BY st.stok_qty ASC, st.cabang_kode ASC
      LIMIT 8
    `;

    // For branch users, only corporate customers with WO activity are shown.
    // Global credit and global invoice figures are NEVER returned to them.
    const creditSource =
      role === "auditor" ? '"VW_PELANGGAN_KORPORAT_AMAN"' : '"PELANGGAN"';

    const creditJoin = isGlobal
      ? `LEFT JOIN ${creditSource} cp
       ON cp.pelanggan_id = p.pelanggan_id`
      : "";

    const creditSelect = isGlobal
      ? `cp.plafon_kredit, cp.sisa_plafon,
     (cp.plafon_kredit - cp.sisa_plafon) AS plafon_terpakai,
     CASE WHEN cp.plafon_kredit > 0 THEN ROUND(
       ((cp.plafon_kredit - cp.sisa_plafon)::NUMERIC /
         cp.plafon_kredit) * 100, 2
     ) ELSE 0 END AS persentase_utilisasi,
     CASE WHEN cp.plafon_kredit > 0 THEN ROUND(
       ((cp.plafon_kredit - cp.sisa_plafon)::NUMERIC /
         cp.plafon_kredit) * 100, 2
     ) ELSE 0 END AS persentase_utilisasi_plafon,`
      : `NULL::INTEGER AS plafon_kredit,
     NULL::INTEGER AS sisa_plafon,
     NULL::INTEGER AS plafon_terpakai,
     NULL::NUMERIC AS persentase_utilisasi,
     NULL::NUMERIC AS persentase_utilisasi_plafon,`;
    const npwpSelect = isRestrictedCustomer
      ? "'***REDACTED***'::VARCHAR AS npwp"
      : "p.pelanggan_no_identitas AS npwp";
    const corporateSql = `${mechanicScopedCte}
      SELECT
        p.pelanggan_id, p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama, p.pelanggan_nama AS nama_perusahaan,
        ${npwpSelect},
        p.pelanggan_nama AS pic_nama, p.pelanggan_telp AS telepon,
        kk.kontrak_id, kk.kontrak_id AS nomor_kontrak,
        UPPER(kk.status_kontrak) AS status_kontrak,
        kk.diskon_kontrak_persen, kk.kuota_motor,
        ${creditSelect}
        COUNT(DISTINCT m.motor_nopol) AS jumlah_unit_armada,
        COUNT(DISTINCT m.motor_nopol) AS total_unit_armada,
        ${
          isGlobal
            ? `COUNT(DISTINCT tk.tagihan_id) FILTER (
               WHERE tk.status_tagihan IN ('Belum Dibayar', 'Belum Lunas')
             ) AS tagihan_outstanding_count`
            : `NULL::BIGINT AS tagihan_outstanding_count`
        }
      FROM ${customerSource} p
      ${creditJoin}
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      LEFT JOIN "MOTOR" m ON m.pelanggan_id = p.pelanggan_id
        ${
          cabangKode
            ? `AND EXISTS (
          SELECT 1 FROM scoped_motors sm WHERE sm.motor_nopol = m.motor_nopol
        )`
            : ""
        }
      ${
        isGlobal
          ? `LEFT JOIN "TAGIHAN_KOLEKTIF" tk ON tk.pelanggan_id = p.pelanggan_id`
          : ""
      }
      WHERE p.pelanggan_tipe = 'Korporat' ${customerPredicate}
      GROUP BY p.pelanggan_id, p.pelanggan_nama,
        ${isRestrictedCustomer ? "" : "p.pelanggan_no_identitas,"}
        p.pelanggan_telp, kk.kontrak_id, kk.status_kontrak,
        kk.diskon_kontrak_persen, kk.kuota_motor
        ${isGlobal ? ", cp.plafon_kredit, cp.sisa_plafon" : ""}
      ORDER BY p.pelanggan_id ASC
    `;

    const corporateQuery = canViewCorporate
      ? db.query(corporateSql, mechanicScopedParams)
      : Promise.resolve({ rows: [] });

    const [kpiRes, recentWoRes, branchRes, lowStockRes, corpRes] =
      await Promise.all([
        db.query(kpiSql, params),
        db.query(recentWoSql, mechanicScopedParams),
        db.query(branchSql, params),
        db.query(lowStockSql, branchParams),
        corporateQuery,
      ]);

    return {
      scope: { role, cabang_kode: cabangKode, is_global: isGlobal },
      metrics: kpiRes.rows[0],
      recentWorkOrders: recentWoRes.rows,
      branchSummary: branchRes.rows,
      lowStockAlerts: lowStockRes.rows,
      corporateFleetSummary: corpRes.rows,
    };
  }
}

module.exports = new OverviewRepository();
