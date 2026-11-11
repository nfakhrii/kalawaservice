const db = require('../config/db');
const { queryAsUser } = require('../config/db');
const AppError = require('../utils/AppError');

const UI_TO_DB_STATUS = {
  antre: ['Dibuat', 'Antre'],
  dikerjakan: ['Diproses', 'Dikerjakan'],
  selesai: ['Selesai'],
  dibayar: ['Dibayar'],
  dibatalkan: ['Dibatalkan'],
};

function mapUiStatusToSingleDbStatus(rawStatus) {
  if (!rawStatus) return null;
  const s = String(rawStatus).trim();
  const lower = s.toLowerCase();
  if (lower === 'antre' || lower === 'dibuat') return 'Antre';
  if (lower === 'dikerjakan' || lower === 'diproses') return 'Dikerjakan';
  if (lower === 'selesai') return 'Selesai';
  if (lower === 'dibayar' || lower === 'sudah dibayar' || lower === 'lunas') return 'Dibayar';
  if (lower === 'dibatalkan') return 'Dibatalkan';
  return s;
}

class OperationsRepository {
  getRoleFlags() {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError("User belum terautentikasi.", 401, "UNAUTHENTICATED");
    }

    const allowedRoles = [
      "owner",
      "auditor",
      "admin_cabang",
      "kasir",
      "mekanik",
      "gudang",
    ];

    const role = String(user.role || "").toLowerCase();

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Role pengguna tidak dikenali atau tidak memiliki akses.",
        403,
        "INVALID_ROLE"
      );
    }

    return {
      role,
      isOwner: role === "owner",
      isAuditor: role === "auditor",
      isGlobal: ["owner", "auditor"].includes(role),
      isMekanik: role === "mekanik",
      isRestrictedCustomer: ["kasir", "mekanik", "gudang", "auditor"].includes(
        role
      ),
      isRestrictedWo: ["mekanik", "gudang", "auditor"].includes(role),
    };
  }

  // Tambahan
  getAuthorizedCabangKode() {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError("User belum terautentikasi.", 401, "UNAUTHENTICATED");
    }

    // Owner dan auditor memiliki akses baca lintas cabang.
    if (["owner", "auditor"].includes(user.role)) {
      return null;
    }

    // Role operasional lainnya wajib memiliki cabang.
    const cabangKode = user.kode_cabang;

    if (!cabangKode) {
      throw new AppError(
        "Cabang user tidak ditemukan.",
        403,
        "USER_BRANCH_NOT_FOUND"
      );
    }

    return String(cabangKode).trim().toUpperCase();
  }

  // Tambahan
  getCurrentMekanikId() {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError("User belum terautentikasi.", 401, "UNAUTHENTICATED");
    }

    if (user.role !== "mekanik") {
      return null;
    }

    const pegawaiId = String(user.pegawai_id || "")
      .trim()
      .toUpperCase();

    if (!pegawaiId) {
      throw new AppError(
        "Identitas pegawai mekanik tidak ditemukan.",
        403,
        "MECHANIC_ID_NOT_FOUND"
      );
    }

    return pegawaiId;
  }

  async assertWorkOrderReadAccess(workNo) {
    const { role } = this.getRoleFlags();

    // Owner dan auditor dapat membaca WO lintas cabang.
    if (["owner", "auditor"].includes(role)) {
      return true;
    }

    const normalizedWorkNo = String(workNo || "")
      .trim()
      .toUpperCase();

    if (role === "mekanik") {
      const mekanikId = this.getCurrentMekanikId();

      const result = await db.query(
        `
      SELECT wo.work_no
      FROM "VW_WORK_ORDER_AMAN" wo
      WHERE UPPER(wo.work_no) = $1
        AND (
          UPPER(wo.mekanik_id) = $2
          OR EXISTS (
            SELECT 1
            FROM "WO_MEKANIK" wm
            WHERE UPPER(wm.work_no) = UPPER(wo.work_no)
              AND UPPER(wm.mekanik_id) = $2
          )
        )
      LIMIT 1;
      `,
        [normalizedWorkNo, mekanikId]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          "Work Order tidak ditemukan atau tidak ditugaskan kepada Anda.",
          404,
          "WORK_ORDER_NOT_FOUND"
        );
      }

      return true;
    }

    // Admin cabang, kasir, dan gudang tetap dibatasi cabang.
    const cabangKode = this.getAuthorizedCabangKode();

    const result = await db.query(
      `
    SELECT work_no
    FROM "VW_WORK_ORDER_AMAN"
    WHERE UPPER(work_no) = $1
      AND cabang_kode = $2
    LIMIT 1;
    `,
      [normalizedWorkNo, cabangKode]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "Work Order tidak ditemukan atau tidak dapat diakses.",
        404,
        "WORK_ORDER_NOT_FOUND"
      );
    }

    return true;
  }

  assertWritePermission(allowedRoles) {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError("User belum terautentikasi.", 401, "UNAUTHENTICATED");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki izin untuk melakukan perubahan ini.",
        403,
        "FORBIDDEN"
      );
    }

    return user;
  }

  async assertWorkOrderBranchAccess(workNo, user) {
    if (user.role === "owner") {
      return;
    }

    const cabangKode = user.kode_cabang;

    if (!cabangKode) {
      throw new AppError(
        "Cabang pengguna tidak ditemukan.",
        403,
        "USER_BRANCH_NOT_FOUND"
      );
    }

    const result = await db.query(
      `
      SELECT work_no
      FROM "WORK_ORDER"
      WHERE work_no = $1
        AND cabang_kode = $2
      LIMIT 1
    `,
      [workNo, cabangKode]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "Work Order tidak ditemukan atau tidak dapat diakses.",
        404,
        "WORK_ORDER_NOT_FOUND"
      );
    }
  }

  // ==========================================================================
  // 1. WORK ORDER ("WORK_ORDER" / "VW_WORK_ORDER_AMAN", "WO_JASA", "WO_SUKU_CADANG", "WO_MEKANIK", "GARANSI")
  // ==========================================================================
  async getAllWorkOrders(statusFilter = null, cabangKode = null) {
    const { role, isRestrictedCustomer, isRestrictedWo, isMekanik } =
      this.getRoleFlags();
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';
    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    const params = [];
    const conditions = [];

    const authorizedCabang = this.getAuthorizedCabangKode();

    // Filter status tetap dipertahankan.
    if (statusFilter && statusFilter !== "all") {
      const lower = String(statusFilter).toLowerCase();

      if (lower === "dibayar" && !isRestrictedWo) {
        conditions.push(
          `(wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar')`
        );
      } else if (UI_TO_DB_STATUS[lower]) {
        const list = UI_TO_DB_STATUS[lower];

        params.push(list);

        if (lower === "selesai" && !isRestrictedWo) {
          conditions.push(
            `(wo.work_status = ANY($${params.length}) AND wo.pembayaran_status = 'Belum Lunas')`
          );
        } else {
          conditions.push(`wo.work_status = ANY($${params.length})`);
        }
      } else {
        params.push(statusFilter);
        conditions.push(`wo.work_status = $${params.length}`);
      }
    }

    // Pembatasan akses berdasarkan role.
    if (isMekanik) {
      const mekanikId = this.getCurrentMekanikId();

      params.push(mekanikId);
      const mekanikParam = `$${params.length}`;

      conditions.push(`
    (
      UPPER(wo.mekanik_id) = ${mekanikParam}
      OR EXISTS (
        SELECT 1
        FROM "WO_MEKANIK" wm
        WHERE UPPER(wm.work_no) = UPPER(wo.work_no)
          AND UPPER(wm.mekanik_id) = ${mekanikParam}
      )
    )
  `);
    } else if (authorizedCabang) {
      params.push(authorizedCabang);
      conditions.push(`wo.cabang_kode = $${params.length}`);
    } else if (cabangKode && role === "owner") {
      // Owner dapat memilih cabang yang ingin dilihat.
      params.push(String(cabangKode).trim().toUpperCase());
      conditions.push(`wo.cabang_kode = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const paymentColumnsSql = isRestrictedWo
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
        0::INT AS diskon,
        wo.tagihan_id,
        CASE
          WHEN p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
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
        wo.pembayaran_diskon AS diskon,
        wo.tagihan_id,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
      `;

    const sql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        ${paymentColumnsSql}
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_masuk,
        wo.work_tgl_selesai AS waktu_selesai,
        wo.work_tgl_selesai,
        m.motor_kilometer AS kilometer_masuk,
        wo.work_keluhan AS keluhan,
        wo.work_keluhan,
        NULL::TEXT AS catatan_mekanik,
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
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        fn_status_garansi_by_wo(wo.work_no) AS status_garansi,
        m.motor_nopol AS motor_id,
        m.motor_nopol,
        m.motor_nopol AS plat_nomor,
        m.motor_merek AS merk,
        m.motor_merek AS motor_merk,
        m.motor_merek,
        m.motor_tipe AS tipe_motor,
        m.motor_tipe,
        m.motor_tahun AS tahun_motor,
        m.motor_warna AS warna_motor,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(COALESCE(p.pelanggan_tipe, 'Individu')) AS tipe_pelanggan,
        COALESCE(p.pelanggan_tipe, 'Individu') AS pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        COALESCE(p.plafon_kredit, 0) AS plafon_kredit,
        COALESCE(p.sisa_plafon, 0) AS sisa_plafon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak,
        c.cabang_kode AS cabang_id,
        c.cabang_kode,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        wo.mekanik_id,
        COALESCE(pg_mek.pegawai_nama, '-') AS nama_mekanik,
        mk.mekanik_keahlian AS spesialisasi_mekanik,
        (
          SELECT COUNT(*) FROM "WO_JASA" wj WHERE wj.work_no = wo.work_no
        ) AS jumlah_item_jasa,
        (
          SELECT COUNT(*) FROM "WO_SUKU_CADANG" wsc WHERE wsc.work_no = wo.work_no
        ) AS jumlah_item_part
      FROM ${woSource} wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "MEKANIK" mk ON mk.mekanik_id = wo.mekanik_id
      LEFT JOIN "PEGAWAI" pg_mek ON pg_mek.pegawai_id = wo.mekanik_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      ${whereClause}
      ORDER BY wo.work_tgl_masuk DESC, wo.work_no DESC;
    `;

    const countParams = [];
    const countConditions = [];

    let countsSql;

    if (isRestrictedWo) {
      countsSql = `
    SELECT
      COUNT(*)::INT AS all,
      COUNT(*) FILTER (
        WHERE work_status IN ('Dibuat', 'Antre')
      )::INT AS antre,
      COUNT(*) FILTER (
        WHERE work_status IN ('Diproses', 'Dikerjakan')
      )::INT AS dikerjakan,
      COUNT(*) FILTER (
        WHERE work_status = 'Selesai'
      )::INT AS selesai,
      COUNT(*) FILTER (
        WHERE work_status = 'Dibayar'
      )::INT AS dibayar,
      COUNT(*) FILTER (
        WHERE work_status = 'Dibatalkan'
      )::INT AS dibatalkan
    FROM "VW_WORK_ORDER_AMAN" wo
  `;
    } else {
      countsSql = `
    SELECT
      COUNT(*)::INT AS all,
      COUNT(*) FILTER (
        WHERE work_status IN ('Dibuat', 'Antre')
      )::INT AS antre,
      COUNT(*) FILTER (
        WHERE work_status IN ('Diproses', 'Dikerjakan')
      )::INT AS dikerjakan,
      COUNT(*) FILTER (
        WHERE work_status = 'Selesai'
          AND pembayaran_status = 'Belum Lunas'
      )::INT AS selesai,
      COUNT(*) FILTER (
        WHERE pembayaran_status = 'Lunas'
          OR work_status = 'Dibayar'
      )::INT AS dibayar,
      COUNT(*) FILTER (
        WHERE work_status = 'Dibatalkan'
      )::INT AS dibatalkan
    FROM "WORK_ORDER" wo
  `;
    }

    if (isMekanik) {
      const mekanikId = this.getCurrentMekanikId();

      countParams.push(mekanikId);
      const mekanikParam = `$${countParams.length}`;

      countConditions.push(`
        (
          UPPER(wo.mekanik_id) = ${mekanikParam}
          OR EXISTS (
            SELECT 1
            FROM "WO_MEKANIK" wm
            WHERE UPPER(wm.work_no) = UPPER(wo.work_no)
              AND UPPER(wm.mekanik_id) = ${mekanikParam}
          )
        )
      `);
    } else if (authorizedCabang) {
      countParams.push(authorizedCabang);
      countConditions.push(`cabang_kode = $${countParams.length}`);
    } else if (cabangKode && role === "owner") {
      countParams.push(String(cabangKode).trim().toUpperCase());
      countConditions.push(`cabang_kode = $${countParams.length}`);
    }

    if (countConditions.length > 0) {
      countsSql += ` WHERE ${countConditions.join(" AND ")}`;
    }

    countsSql += ";";

    const [{ rows }, countsRes] = await Promise.all([
      db.query(sql, params),
      db.query(countsSql, countParams),
    ]);

    return {
      workOrders: rows,
      counts: countsRes.rows[0] || {
        all: rows.length,
        antre: 0,
        dikerjakan: 0,
        selesai: 0,
        dibayar: 0,
        dibatalkan: 0,
      },
    };
  }

  async getWorkOrderById(workNo) {
    const normalizedWorkNo = String(workNo || "")
      .trim()
      .toUpperCase();

    if (!normalizedWorkNo) {
      throw new AppError(
        "Nomor Work Order tidak valid.",
        400,
        "INVALID_WORK_ORDER"
      );
    }

    const { role, isRestrictedWo } = this.getRoleFlags();

    // Periksa hak akses sebelum mengambil detail.
    await this.assertWorkOrderReadAccess(normalizedWorkNo);

    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    const result = await db.query(
      `
    SELECT *
    FROM ${woSource}
    WHERE UPPER(work_no) = $1
    LIMIT 1;
    `,
      [normalizedWorkNo]
    );

    if (!result.rows[0]) {
      return null;
    }

    const detail = await this.getWorkOrderDetail(normalizedWorkNo);

    return detail ? { ...result.rows[0], ...detail } : result.rows[0];
  }

  async getWorkOrderDetail(woId) {
    const workNo = String(woId || "")
      .trim()
      .toUpperCase();

    if (!workNo) {
      throw new AppError(
        "Nomor Work Order tidak valid.",
        400,
        "INVALID_WORK_ORDER"
      );
    }

    // Wajib dilakukan sebelum query header, jasa, suku cadang,
    // dan mekanik agar detail tidak bisa diakses melalui IDOR.
    await this.assertWorkOrderReadAccess(workNo);

    const { isRestrictedCustomer, isRestrictedWo } = this.getRoleFlags();
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';
    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    const paymentFieldsSql = isRestrictedWo
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
        0::INT AS diskon,
        wo.tagihan_id,
        CASE
          WHEN p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
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
        wo.pembayaran_diskon AS diskon,
        wo.tagihan_id,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
      `;

    const alamatSelectSql = isRestrictedCustomer
      ? `'***REDACTED***'::TEXT AS alamat_pelanggan`
      : `p.pelanggan_alamat AS alamat_pelanggan`;

    const headerSql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        ${paymentFieldsSql}
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_masuk,
        wo.work_tgl_selesai AS waktu_selesai,
        wo.work_tgl_selesai,
        m.motor_kilometer AS kilometer_masuk,
        wo.work_keluhan AS keluhan,
        wo.work_keluhan,
        NULL::TEXT AS catatan_mekanik,
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
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        fn_status_garansi_by_wo(wo.work_no) AS status_garansi,
        g.garansi_id,
        g.garansi_jumlah_hari,
        g.garansi_keterangan,
        m.motor_nopol AS motor_id,
        m.motor_nopol,
        m.motor_nopol AS plat_nomor,
        m.motor_merek AS merk,
        m.motor_merek AS motor_merk,
        m.motor_merek,
        m.motor_tipe AS tipe_motor,
        m.motor_tipe,
        m.motor_tahun AS tahun_motor,
        m.motor_warna AS warna_motor,
        m.motor_no_rangka AS nomor_rangka,
        m.motor_no_mesin AS nomor_mesin,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(COALESCE(p.pelanggan_tipe, 'Individu')) AS tipe_pelanggan,
        COALESCE(p.pelanggan_tipe, 'Individu') AS pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        p.pelanggan_telp AS telepon_pelanggan,
        p.pelanggan_telp AS pelanggan_no_hp,
        '-'::VARCHAR AS email_pelanggan,
        ${alamatSelectSql},
        COALESCE(p.plafon_kredit, 0) AS plafon_kredit,
        COALESCE(p.sisa_plafon, 0) AS sisa_plafon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak,
        kk.diskon_kontrak_persen,
        c.cabang_kode AS cabang_id,
        c.cabang_kode,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_alamat AS alamat_cabang,
        c.cabang_telp AS telepon_cabang,
        wo.mekanik_id,
        COALESCE(pg_mek.pegawai_nama, '-') AS nama_mekanik,
        mk.mekanik_keahlian AS spesialisasi_mekanik
      FROM ${woSource} wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "MEKANIK" mk ON mk.mekanik_id = wo.mekanik_id
      LEFT JOIN "PEGAWAI" pg_mek ON pg_mek.pegawai_id = wo.mekanik_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      LEFT JOIN "GARANSI" g ON g.work_no = wo.work_no
      WHERE UPPER(wo.work_no) = $1;
    `;

    const servicesSql = `
      SELECT
        wj.jasa_kode AS id,
        wj.work_no,
        wj.jasa_kode AS jasa_servis_id,
        wj.jasa_kode,
        wj.jasa_kode AS kode_jasa,
        js.jasa_uraian AS nama_jasa,
        js.jasa_uraian AS jasa_nama,
        js.jasa_uraian,
        'SERVIS BENGKEL'::VARCHAR AS kategori_jasa,
        'SERVIS BENGKEL'::VARCHAR AS jasa_kategori,
        1 AS jumlah,
        js.jasa_biaya AS harga_satuan,
        js.jasa_biaya AS subtotal,
        js.jasa_biaya AS jasa_harga,
        js.jasa_biaya,
        NULL::TEXT AS catatan
      FROM "WO_JASA" wj
      JOIN "JASA_SERVIS" js ON js.jasa_kode = wj.jasa_kode
      WHERE UPPER(wj.work_no) = $1
      ORDER BY wj.jasa_kode ASC;
    `;

    const partsSql = `
      SELECT
        wsc.suku_cadang_kode AS id,
        wsc.work_no,
        wsc.suku_cadang_kode AS suku_cadang_id,
        wsc.suku_cadang_kode,
        wsc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        'SUKU CADANG'::VARCHAR AS kategori,
        'SUKU CADANG'::VARCHAR AS suku_cadang_kategori,
        'PCS'::VARCHAR AS satuan,
        wsc.suku_cadang_qty AS jumlah,
        wsc.suku_cadang_qty,
        sc.suku_cadang_harga_satuan AS harga_satuan,
        sc.suku_cadang_harga_satuan,
        wsc.suku_cadang_jumlah AS subtotal,
        wsc.suku_cadang_jumlah
      FROM "WO_SUKU_CADANG" wsc
      JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = wsc.suku_cadang_kode
      WHERE UPPER(wsc.work_no) = $1
      ORDER BY wsc.suku_cadang_kode ASC;
    `;

    const mechanicsSql = `
      SELECT
        wm.mekanik_id AS pegawai_id,
        wm.mekanik_id,
        pg.pegawai_nama,
        wm.peran_mekanik,
        wm.peran_mekanik AS peran_pengerjaan,
        mk.mekanik_keahlian AS spesialisasi,
        mk.mekanik_keahlian AS mekanik_spesialisasi,
        mk.mekanik_keahlian
      FROM "WO_MEKANIK" wm
      JOIN "PEGAWAI" pg ON pg.pegawai_id = wm.mekanik_id
      LEFT JOIN "MEKANIK" mk ON mk.mekanik_id = wm.mekanik_id
      WHERE UPPER(wm.work_no) = $1;
    `;

    const [headerRes, srvRes, partRes, mekRes] = await Promise.all([
      db.query(headerSql, [workNo]),
      db.query(servicesSql, [workNo]),
      db.query(partsSql, [workNo]),
      db.query(mechanicsSql, [workNo]),
    ]);

    if (!headerRes.rows[0]) return null;

    const header = headerRes.rows[0];
    const isPaid =
      !isRestrictedWo &&
      (header.pembayaran_status === "Lunas" ||
        header.work_status === "Dibayar");

    const paymentObj = isPaid
      ? {
          id: header.work_no,
          work_no: header.work_no,
          nomor_kwitansi: `KWT-${header.work_no}`,
          work_order_id: header.work_no,
          metode_pembayaran: (
            header.pembayaran_metode || "Tunai"
          ).toUpperCase(),
          pembayaran_metode: header.pembayaran_metode,
          jumlah_bayar: header.total_tagihan,
          status_pembayaran: "LUNAS",
          pembayaran_status: header.pembayaran_status,
          tanggal_bayar: header.work_tgl_selesai || header.work_tgl_masuk,
          catatan: `Pelunasan Work Order #${header.work_no}`,
        }
      : null;

    return {
      ...header,
      services: srvRes.rows,
      spareparts: partRes.rows,
      mechanics: mekRes.rows,
      payment: paymentObj,
    };
  }

  /**
   * Membuat Work Order baru di tabel "WORK_ORDER"
   * Skenario Debugging #1: Jika motor_nopol / motor_id kosong, gagal dengan HTTP 400.
   */
  async createWorkOrder(data, user) {
    return await db
      .withTransaction(async (client) => {
        let workNo = data.work_no || data.nomor_wo;
        if (!workNo) {
          const seqRes = await client.query(`
          SELECT COALESCE(
            MAX(NULLIF(REGEXP_REPLACE(work_no, '[^0-9]', '', 'g'), '')::INT),
            13
          ) + 1 AS next_seq
          FROM "WORK_ORDER";
        `);
          workNo = `WO${String(seqRes.rows[0].next_seq).padStart(3, "0")}`;
        } else {
          workNo = String(workNo).trim().toUpperCase();
        }

        const authorizedCabang = this.getAuthorizedCabangKode();
        const cabangKode = authorizedCabang
          ? authorizedCabang
          : String(data.cabang_kode || data.cabang_id || "")
              .trim()
              .toUpperCase();

        if (!cabangKode) {
          throw new Error("Cabang Work Order wajib ditentukan.");
        }

        // const cabangKode = String(
        //   data.cabang_kode || data.cabang_id || user?.kode_cabang || "CB001"
        // )
        //   .trim()
        //   .toUpperCase();

        const motorNopol =
          data.motor_nopol !== undefined
            ? data.motor_nopol
            : data.motor_id !== undefined
            ? data.motor_id
            : null;

        let pelangganTipe = "Individu";
        let diskonKontrakRp = 0;

        const { isRestrictedCustomer } = this.getRoleFlags();
        const customerSource = isRestrictedCustomer
          ? '"VW_PELANGGAN_AMAN"'
          : '"PELANGGAN"';

        if (motorNopol) {
          const motorRes = await client.query(
            `
            SELECT
              m.motor_nopol,
              m.pelanggan_id,
              p.pelanggan_tipe,
              p.mekanik_id_pilihan,
              kk.diskon_kontrak_persen
            FROM "MOTOR" m
            JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
            LEFT JOIN "KONTRAK_KORPORAT" kk
              ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
            WHERE UPPER(m.motor_nopol) = UPPER($1)
          `,
            [String(motorNopol).trim()]
          );

          if (!motorRes.rows[0]) {
            throw new AppError(
              `Data motor dengan nomor polisi '${motorNopol}' tidak ditemukan di tabel "MOTOR".`,
              400,
              "VEHICLE_NOT_FOUND"
            );
          }

          pelangganTipe = motorRes.rows[0].pelanggan_tipe || "Individu";
          if (!data.mekanik_id && motorRes.rows[0].mekanik_id_pilihan) {
            data.mekanik_id = motorRes.rows[0].mekanik_id_pilihan;
          }
        }

        const mekanikId = data.mekanik_id || "PG003";
        const keluhan = data.work_keluhan || data.keluhan;

        let pembayaranMetode = data.pembayaran_metode || "Tunai";
        if (
          pelangganTipe === "Korporat" ||
          String(data.skema_pembayaran || "").toUpperCase() ===
            "PLAFON_KORPORAT"
        ) {
          pembayaranMetode = "Tagihan Kolektif";
        }

        const diskonNominal = Math.round(
          Number(
            data.pembayaran_diskon !== undefined
              ? data.pembayaran_diskon
              : data.diskon || diskonKontrakRp || 0
          )
        );

        const insertWoSql = `
        INSERT INTO "WORK_ORDER" (
          work_no, work_tgl_masuk, work_tgl_selesai,
          work_status, work_keluhan, cabang_kode,
          motor_nopol, mekanik_id, pembayaran_diskon,
          pembayaran_metode, pembayaran_status, tagihan_id
        ) VALUES (
          $1, CURRENT_TIMESTAMP, NULL,
          'Antre', $2, $3,
          $4, $5, $6,
          $7, 'Belum Lunas', NULL
        )
        RETURNING work_no;
      `;

        const { rows } = await client.query(insertWoSql, [
          workNo,
          keluhan,
          cabangKode,
          motorNopol ? String(motorNopol).trim().toUpperCase() : null,
          mekanikId,
          diskonNominal,
          pembayaranMetode,
        ]);

        const createdWorkNo = rows[0].work_no;

        if (mekanikId) {
          await client.query(
            `
            INSERT INTO "WO_MEKANIK" (work_no, mekanik_id, peran_mekanik)
            VALUES ($1, $2, 'Penanggung Jawab')
            ON CONFLICT (work_no, mekanik_id) DO NOTHING;
          `,
            [createdWorkNo, mekanikId]
          );
        }

        if (Array.isArray(data.jasa_ids) && data.jasa_ids.length > 0) {
          for (const rawJasaKode of data.jasa_ids) {
            await client.query(
              `
              INSERT INTO "WO_JASA" (work_no, jasa_kode)
              VALUES ($1, $2)
              ON CONFLICT (work_no, jasa_kode) DO NOTHING;
            `,
              [createdWorkNo, String(rawJasaKode).trim().toUpperCase()]
            );
          }
        }

        if (data.kilometer_masuk && motorNopol) {
          await client.query(
            `
            UPDATE "MOTOR"
            SET motor_kilometer = GREATEST(motor_kilometer, $1)
            WHERE UPPER(motor_nopol) = UPPER($2);
          `,
            [Number(data.kilometer_masuk), String(motorNopol).trim()]
          );
        }

        return createdWorkNo;
      })
      .then((createdWorkNo) => this.getWorkOrderDetail(createdWorkNo));
  }

  /**
   * Mengubah status / mekanik / keluhan pada "WORK_ORDER".
   * Khusus role 'mekanik' (role_mekanik), HANYA melakukan UPDATE pada 3 kolom
   * yang di-GRANT di Kelompok1_admin_security.sql:
   * ("work_status", "work_tgl_selesai", "work_keluhan")
   */
  async updateWorkOrder(woId, data) {
    const workNo = String(woId || "")
      .trim()
      .toUpperCase();

    const { role, isRestrictedWo, isMekanik } = this.getRoleFlags();

    // Auditor hanya boleh membaca.
    if (role === "auditor") {
      throw new AppError(
        "Auditor hanya memiliki hak akses baca.",
        403,
        "READ_ONLY_ROLE"
      );
    }

    // Pastikan WO memang ditugaskan kepada mekanik
    // atau berada dalam cakupan cabang pengguna.
    await this.assertWorkOrderReadAccess(workNo);

    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    const currentRes = await db.query(
      `
    SELECT *
    FROM ${woSource}
    WHERE UPPER(work_no) = $1
    LIMIT 1;
    `,
      [workNo]
    );

    if (!currentRes.rows[0]) {
      throw new AppError(
        "Work Order tidak ditemukan.",
        404,
        "WORK_ORDER_NOT_FOUND"
      );
    }

    const current = currentRes.rows[0];

    const mappedStatus = mapUiStatusToSingleDbStatus(
      data.work_status || data.status
    );

    const nextStatus = mappedStatus || current.work_status;

    const nextKeluhan =
      data.work_keluhan || data.keluhan || current.work_keluhan;

    if (isMekanik) {
      // Mekanik tidak boleh mengubah penanggung jawab,
      // diskon, cabang, ataupun kolom pembayaran.
      const nextTglSelesai =
        ["Selesai", "Dibayar"].includes(nextStatus) && !current.work_tgl_selesai
          ? new Date()
          : current.work_tgl_selesai;

      const mekUpdateSql = `
      UPDATE "WORK_ORDER"
      SET
        "work_status" = $1,
        "work_tgl_selesai" = $2,
        "work_keluhan" = $3
      WHERE "work_no" = $4;
    `;

      await db.query(mekUpdateSql, [
        nextStatus,
        nextTglSelesai,
        nextKeluhan,
        current.work_no,
      ]);

      return await this.getWorkOrderDetail(current.work_no);
    }

    // Lanjutkan kode update untuk role selain mekanik
    // mulai dari deklarasi nextMekanik pada kode lama.

    const nextMekanik =
      data.mekanik_id !== undefined ? data.mekanik_id : current.mekanik_id;
    const nextDiskon =
      data.pembayaran_diskon !== undefined
        ? Math.round(Number(data.pembayaran_diskon))
        : data.diskon !== undefined
        ? Math.round(Number(data.diskon))
        : current.pembayaran_diskon || 0;

    let setTglSelesaiSql = "work_tgl_selesai";
    if (
      ["Selesai", "Dibayar"].includes(nextStatus) &&
      !current.work_tgl_selesai
    ) {
      setTglSelesaiSql = "COALESCE(work_tgl_selesai, CURRENT_TIMESTAMP)";
    }

    const sql = `
      UPDATE "WORK_ORDER"
      SET
        work_status = $1,
        mekanik_id = $2,
        work_keluhan = $3,
        pembayaran_diskon = $4,
        work_tgl_selesai = ${setTglSelesaiSql}
      WHERE work_no = $5;
    `;
    await db.query(sql, [
      nextStatus,
      nextMekanik,
      nextKeluhan,
      nextDiskon,
      current.work_no,
    ]);

    if (nextMekanik) {
      await db.query(
        `
          INSERT INTO "WO_MEKANIK" (work_no, mekanik_id, peran_mekanik)
          VALUES ($1, $2, 'Penanggung Jawab')
          ON CONFLICT (work_no, mekanik_id) DO NOTHING;
        `,
        [current.work_no, nextMekanik]
      );
    }

    return await this.getWorkOrderDetail(current.work_no);
  }

  async addServiceToWorkOrder(woId, jasaArg) {
    const workNo = String(woId).trim().toUpperCase();
    const { role } = this.getRoleFlags();

    if (role === "auditor") {
      throw new AppError(
        "Auditor hanya memiliki hak akses baca.",
        403,
        "READ_ONLY_ROLE"
      );
    }

    await this.assertWorkOrderReadAccess(workNo);

    const rawKode =
      typeof jasaArg === "object" && jasaArg !== null
        ? jasaArg.jasa_kode || jasaArg.jasa_servis_id
        : jasaArg;
    const kodeJasa = String(rawKode || "")
      .trim()
      .toUpperCase();

    const srvRes = await db.query(
      `SELECT * FROM "JASA_SERVIS" WHERE UPPER(jasa_kode) = $1`,
      [kodeJasa]
    );
    if (!srvRes.rows[0]) {
      throw new AppError(
        `Jasa servis '${kodeJasa}' tidak ditemukan.`,
        404,
        "SERVICE_NOT_FOUND"
      );
    }

    await db.query(
      `
        INSERT INTO "WO_JASA" (work_no, jasa_kode)
        VALUES ($1, $2)
        ON CONFLICT (work_no, jasa_kode) DO NOTHING;
      `,
      [workNo, srvRes.rows[0].jasa_kode]
    );

    return await this.getWorkOrderDetail(workNo);
  }

  async removeServiceFromWorkOrder(woId, itemId) {
    const workNo = String(woId).trim().toUpperCase();
    const { role } = this.getRoleFlags();

    if (role === "auditor") {
      throw new AppError(
        "Auditor hanya memiliki hak akses baca.",
        403,
        "READ_ONLY_ROLE"
      );
    }

    await this.assertWorkOrderReadAccess(workNo);

    const kodeJasa = String(itemId).trim().toUpperCase();

    await db.query(
      `DELETE FROM "WO_JASA" WHERE UPPER(work_no) = $1 AND UPPER(jasa_kode) = $2`,
      [workNo, kodeJasa]
    );
    return await this.getWorkOrderDetail(workNo);
  }

  /**
   * Menambahkan pemakaian suku cadang ke tabel "WO_SUKU_CADANG"
   * Skenario Debugging #3:
   * Trigger asli Kelompok 1 (`trg_kurangi_stok_suku_cadang` -> `trg_fn_kurangi_stok`)
   * mengurangi `stok_qty` di `"STOK_CABANG"` dan memiliki constraint `"chk_stok_qty" CHECK ("stok_qty" >= 0)`.
   */
  async addSparepartToWorkOrder(woId, partArg, qtyArg) {
    const workNo = String(woId).trim().toUpperCase();
    const { role } = this.getRoleFlags();

    if (role === "auditor") {
      throw new AppError(
        "Auditor hanya memiliki hak akses baca.",
        403,
        "READ_ONLY_ROLE"
      );
    }

    await this.assertWorkOrderReadAccess(workNo);

    const rawKode =
      typeof partArg === "object" && partArg !== null
        ? partArg.suku_cadang_kode || partArg.suku_cadang_id
        : partArg;
    const rawQty =
      typeof partArg === "object" && partArg !== null
        ? partArg.suku_cadang_qty !== undefined
          ? partArg.suku_cadang_qty
          : partArg.jumlah
        : qtyArg;

    const kodePart = String(rawKode || "")
      .trim()
      .toUpperCase();
    const qty = Math.round(Number(rawQty || 1));

    const { isRestrictedWo } = this.getRoleFlags();
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    await db.withTransaction(async (client) => {
      const woRes = await client.query(
        `SELECT work_no, cabang_kode, work_status FROM ${woSource} WHERE UPPER(work_no) = $1`,
        [workNo]
      );
      if (!woRes.rows[0]) {
        throw new AppError(
          `Work Order '${workNo}' tidak ditemukan.`,
          404,
          "WORK_ORDER_NOT_FOUND"
        );
      }

      const wo = woRes.rows[0];
      if (["Dibayar", "Dibatalkan"].includes(wo.work_status)) {
        throw new AppError(
          `Work Order #${wo.work_no} sudah berstatus '${wo.work_status}' sehingga tidak dapat diubah lagi.`,
          422,
          "WORK_ORDER_LOCKED"
        );
      }

      const partRes = await client.query(
        `
          SELECT
            sc.suku_cadang_kode,
            sc.suku_cadang_nama,
            sc.suku_cadang_harga_satuan,
            COALESCE(st.stok_qty, 0) AS stok_tersedia
          FROM "SUKU_CADANG" sc
          LEFT JOIN "STOK_CABANG" st
            ON st.suku_cadang_kode = sc.suku_cadang_kode AND st.cabang_kode = $2
          WHERE UPPER(sc.suku_cadang_kode) = $1;
        `,
        [kodePart, wo.cabang_kode]
      );

      if (!partRes.rows[0]) {
        throw new AppError(
          `Suku cadang '${kodePart}' tidak ditemukan.`,
          404,
          "SPAREPART_NOT_FOUND"
        );
      }

      const part = partRes.rows[0];
      const stokTersedia = Number(part.stok_tersedia);

      if (stokTersedia < qty) {
        throw new AppError(
          `Stok suku cadang "${part.suku_cadang_nama}" (${part.suku_cadang_kode}) di cabang ${wo.cabang_kode} tidak mencukupi! Stok tersedia: ${stokTersedia} PCS, jumlah diminta: ${qty} PCS.`,
          422,
          "INSUFFICIENT_SPAREPART_STOCK",
          {
            pgCode: "P0001",
            constraint: "chk_stok_qty",
            cabang_kode: wo.cabang_kode,
            suku_cadang_kode: part.suku_cadang_kode,
            suku_cadang_nama: part.suku_cadang_nama,
            stok_tersedia: stokTersedia,
            jumlah_diminta: qty,
          }
        );
      }

      const subtotal = qty * Number(part.suku_cadang_harga_satuan);

      const existRes = await client.query(
        `SELECT * FROM "WO_SUKU_CADANG" WHERE work_no = $1 AND suku_cadang_kode = $2`,
        [wo.work_no, part.suku_cadang_kode]
      );

      if (existRes.rows[0]) {
        await client.query(
          `DELETE FROM "WO_SUKU_CADANG" WHERE work_no = $1 AND suku_cadang_kode = $2`,
          [wo.work_no, part.suku_cadang_kode]
        );
        const newQty = Number(existRes.rows[0].suku_cadang_qty) + qty;
        const newSub = newQty * Number(part.suku_cadang_harga_satuan);
        await client.query(
          `
            INSERT INTO "WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah)
            VALUES ($1, $2, $3, $4);
          `,
          [wo.work_no, part.suku_cadang_kode, newQty, newSub]
        );
      } else {
        await client.query(
          `
            INSERT INTO "WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah)
            VALUES ($1, $2, $3, $4);
          `,
          [wo.work_no, part.suku_cadang_kode, qty, subtotal]
        );
      }
    });

    return await this.getWorkOrderDetail(workNo);
  }

  async removeSparepartFromWorkOrder(woId, itemId) {
    const workNo = String(woId).trim().toUpperCase();
    const { role } = this.getRoleFlags();

    if (role === "auditor") {
      throw new AppError(
        "Auditor hanya memiliki hak akses baca.",
        403,
        "READ_ONLY_ROLE"
      );
    }

    await this.assertWorkOrderReadAccess(workNo);
    const kodePart = String(itemId).trim().toUpperCase();

    await db.query(
      `DELETE FROM "WO_SUKU_CADANG" WHERE UPPER(work_no) = $1 AND UPPER(suku_cadang_kode) = $2`,
      [workNo, kodePart]
    );
    return await this.getWorkOrderDetail(workNo);
  }

  // ==========================================================================
  // 2. PEMBAYARAN KASIR (Kolom pembayaran_* pada "WORK_ORDER")
  //    Skenario Debugging #2: Pembayaran Dobel -> HTTP 409 Conflict
  // ==========================================================================
  async getAllPayments() {
    const { isRestrictedCustomer, isRestrictedWo } = this.getRoleFlags();
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';
    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    const paymentColumnsSql = isRestrictedWo
      ? `
        'REDACTED'::VARCHAR AS metode_pembayaran,
        'REDACTED'::VARCHAR AS pembayaran_metode,
        fn_hitung_total_tagihan(wo.work_no) AS jumlah_bayar,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        'LUNAS'::VARCHAR AS status_pembayaran,
        'REDACTED'::VARCHAR AS pembayaran_status,
        COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) AS tanggal_bayar,
        ('Pelunasan servis Work Order #' || wo.work_no) AS catatan,
        CASE
          WHEN p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
      `
      : `
        UPPER(COALESCE(wo.pembayaran_metode, 'Tunai')) AS metode_pembayaran,
        wo.pembayaran_metode,
        fn_hitung_total_tagihan(wo.work_no) AS jumlah_bayar,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        'LUNAS'::VARCHAR AS status_pembayaran,
        wo.pembayaran_status,
        COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) AS tanggal_bayar,
        ('Pelunasan servis Work Order #' || wo.work_no) AS catatan,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
      `;

    const wherePaidSql = isRestrictedWo
      ? `WHERE wo.work_status = 'Dibayar'`
      : `WHERE wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar'`;

    const sql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        ('KWT-' || wo.work_no) AS nomor_kwitansi,
        wo.work_no AS work_order_id,
        wo.work_no AS nomor_wo,
        ${paymentColumnsSql}
        m.motor_nopol AS plat_nomor,
        m.motor_merek AS merk,
        m.motor_merek AS motor_merk,
        m.motor_tipe AS tipe_motor,
        p.pelanggan_id,
        p.pelanggan_nama AS nama_pelanggan,
        UPPER(COALESCE(p.pelanggan_tipe, 'Individu')) AS tipe_pelanggan,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        'Budi Santoso'::VARCHAR AS nama_kasir
      FROM ${woSource} wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN ${customerSource} p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      ${wherePaidSql}
      ORDER BY COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) DESC, wo.work_no DESC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createPayment(data, _user) {
    const user = db.getCurrentUserContext();

    // Hanya role berikut yang boleh melakukan pembayaran.
    const allowedRoles = ["owner", "admin_cabang", "kasir"];

    if (!user || !allowedRoles.includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki izin untuk melakukan pembayaran.",
        403,
        "PAYMENT_FORBIDDEN"
      );
    }

    // Owner dapat mengakses seluruh cabang.
    // Admin cabang dan kasir hanya boleh mengakses cabangnya sendiri.
    const isBranchScoped = ["admin_cabang", "kasir"].includes(user.role);

    const cabangKode = user.kode_cabang || user.cabang_id;

    if (isBranchScoped && !cabangKode) {
      throw new AppError(
        "Cabang pengguna tidak ditemukan.",
        403,
        "USER_BRANCH_NOT_FOUND"
      );
    }

    const workNo = String(data?.work_no || data?.work_order_id || "")
      .trim()
      .toUpperCase();

    if (!workNo) {
      throw new AppError(
        "Nomor Work Order wajib diisi.",
        400,
        "WORK_ORDER_REQUIRED"
      );
    }

    return await db.withTransaction(async (client) => {
      // Pemeriksaan cabang dan penguncian WO berada
      // dalam transaksi yang sama.
      const woRes = await client.query(
        `
        SELECT
          wo.*,
          fn_hitung_total_tagihan(wo.work_no) AS tagihan_terhitung
        FROM "WORK_ORDER" wo
        WHERE UPPER(wo.work_no) = $1
          AND ($2::VARCHAR IS NULL OR wo.cabang_kode = $2)
        FOR UPDATE OF wo;
      `,
        [workNo, isBranchScoped ? cabangKode : null]
      );

      const wo = woRes.rows[0];

      if (!wo) {
        // Respons 404 juga digunakan untuk WO cabang lain
        // agar keberadaan WO tersebut tidak dibocorkan.
        throw new AppError(
          `Work Order '${workNo}' tidak ditemukan atau tidak dapat diakses.`,
          404,
          "WORK_ORDER_NOT_FOUND"
        );
      }

      // Skenario Debugging #2:
      // Tolak pembayaran ganda dengan HTTP 409 Conflict.
      if (wo.pembayaran_status === "Lunas" || wo.work_status === "Dibayar") {
        throw new AppError(
          `Penolakan Pembayaran Ganda (Double Payment): Work Order #${wo.work_no} sudah berstatus Lunas ('${wo.pembayaran_status}' / '${wo.work_status}') melalui metode ${wo.pembayaran_metode}.`,
          409,
          "DOUBLE_PAYMENT_CONFLICT",
          {
            pgCode: "P0002",
            work_no: wo.work_no,
            nomor_wo: wo.work_no,
            existing_receipt: `KWT-${wo.work_no}`,
            pembayaran_status: wo.pembayaran_status,
            work_status: wo.work_status,
            paid_at: wo.work_tgl_selesai || wo.work_tgl_masuk,
          }
        );
      }

      if (wo.work_status === "Dibatalkan") {
        throw new AppError(
          `Work Order #${wo.work_no} telah dibatalkan dan tidak dapat dibayar.`,
          400,
          "CANCELLED_WORK_ORDER"
        );
      }

      const rawMethod = String(
        data.pembayaran_metode ||
          data.metode_pembayaran ||
          wo.pembayaran_metode ||
          "Tunai"
      ).toUpperCase();

      let dbMetode = "Tunai";

      if (rawMethod.includes("QRIS")) {
        dbMetode = "QRIS";
      } else if (rawMethod.includes("TRANSFER")) {
        dbMetode = "Transfer";
      } else if (rawMethod.includes("DEBIT")) {
        dbMetode = "Debit";
      } else if (rawMethod.includes("KREDIT")) {
        dbMetode = "Kredit";
      } else if (
        rawMethod.includes("PLAFON") ||
        rawMethod.includes("KOLEKTIF")
      ) {
        dbMetode = "Tagihan Kolektif";
      }

      const isKolektif = dbMetode === "Tagihan Kolektif";

      const newPembayaranStatus = isKolektif ? "Belum Lunas" : "Lunas";

      const newWorkStatus = isKolektif ? "Selesai" : "Dibayar";

      const updateSql = `
      UPDATE "WORK_ORDER"
      SET
        pembayaran_metode = $1,
        pembayaran_status = $2,
        work_status = $3,
        work_tgl_selesai = COALESCE(
          work_tgl_selesai,
          CURRENT_TIMESTAMP
        )
      WHERE work_no = $4
        AND ($5::VARCHAR IS NULL OR cabang_kode = $5)
      RETURNING
        work_no,
        pembayaran_metode,
        pembayaran_status,
        work_status,
        work_tgl_selesai;
    `;

      const { rows } = await client.query(updateSql, [
        dbMetode,
        newPembayaranStatus,
        newWorkStatus,
        wo.work_no,
        isBranchScoped ? cabangKode : null,
      ]);

      const updated = rows[0];

      if (!updated) {
        throw new AppError(
          "Pembayaran gagal karena Work Order tidak dapat diakses.",
          404,
          "WORK_ORDER_NOT_FOUND"
        );
      }

      return {
        id: updated.work_no,
        work_no: updated.work_no,
        work_order_id: updated.work_no,
        nomor_wo: updated.work_no,
        nomor_kwitansi: `KWT-${updated.work_no}`,
        metode_pembayaran: updated.pembayaran_metode.toUpperCase(),
        pembayaran_metode: updated.pembayaran_metode,
        jumlah_bayar: Number(wo.tagihan_terhitung),
        status_pembayaran: updated.pembayaran_status.toUpperCase(),
        pembayaran_status: updated.pembayaran_status,
        tanggal_bayar: updated.work_tgl_selesai,
      };
    });
  }
}

const operationsRepositoryInstance = new OperationsRepository();
const getWorkOrderById = operationsRepositoryInstance.getWorkOrderById.bind(
  operationsRepositoryInstance
);

module.exports = Object.assign(operationsRepositoryInstance, {
  getWorkOrderById,
  getAllWorkOrders: operationsRepositoryInstance.getAllWorkOrders.bind(operationsRepositoryInstance),
  getWorkOrderDetail: operationsRepositoryInstance.getWorkOrderDetail.bind(operationsRepositoryInstance),
  createWorkOrder: operationsRepositoryInstance.createWorkOrder.bind(operationsRepositoryInstance),
  updateWorkOrder: operationsRepositoryInstance.updateWorkOrder.bind(operationsRepositoryInstance),
  addServiceToWorkOrder: operationsRepositoryInstance.addServiceToWorkOrder.bind(operationsRepositoryInstance),
  removeServiceFromWorkOrder: operationsRepositoryInstance.removeServiceFromWorkOrder.bind(operationsRepositoryInstance),
  addSparepartToWorkOrder: operationsRepositoryInstance.addSparepartToWorkOrder.bind(operationsRepositoryInstance),
  removeSparepartFromWorkOrder: operationsRepositoryInstance.removeSparepartFromWorkOrder.bind(operationsRepositoryInstance),
  getAllPayments: operationsRepositoryInstance.getAllPayments.bind(operationsRepositoryInstance),
  createPayment: operationsRepositoryInstance.createPayment.bind(operationsRepositoryInstance),
});
