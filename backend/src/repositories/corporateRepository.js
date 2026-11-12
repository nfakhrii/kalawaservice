const db = require('../config/db');
const AppError = require('../utils/AppError');

class CorporateRepository {
  getRoleFlags() {
    const user = db.getCurrentUserContext();

    if (!user?.username || !user?.sid || !user?.role) {
      throw new AppError(
        "Konteks pengguna tidak ditemukan. Silakan login kembali.",
        401,
        "USER_CONTEXT_NOT_FOUND"
      );
    }

    const role = String(user.role).toLowerCase();

    const allowedRoles = [
      "owner",
      "admin_cabang",
      "kasir",
      "mekanik",
      "gudang",
      "auditor",
    ];

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Role pengguna tidak dikenali atau tidak diizinkan.",
        403,
        "INVALID_USER_ROLE"
      );
    }

    const isGlobalRole = ["owner", "auditor"].includes(role);

    if (!isGlobalRole && !user.kode_cabang) {
      throw new AppError(
        "Informasi cabang pengguna tidak ditemukan.",
        403,
        "USER_BRANCH_NOT_FOUND"
      );
    }

    if (role === "mekanik" && !user.pegawai_id) {
      throw new AppError(
        "Identitas pegawai mekanik tidak ditemukan.",
        403,
        "MECHANIC_ID_NOT_FOUND"
      );
    }

    return {
      user,
      role,

      cabangKode: user.kode_cabang || null,
      pegawaiId: user.pegawai_id || null,

      isOwner: role === "owner",
      isAdminCabang: role === "admin_cabang",
      isKasir: role === "kasir",
      isMekanik: role === "mekanik",
      isGudang: role === "gudang",
      isAuditor: role === "auditor",

      isGlobalRole,

      canReadCorporate: ["owner", "admin_cabang", "kasir", "auditor"].includes(
        role
      ),

      canManageCorporate: ["owner", "admin_cabang"].includes(role),

      canCreateCollectiveInvoice: ["owner", "admin_cabang", "kasir"].includes(
        role
      ),

      canSettleCollectiveInvoice: ["owner", "admin_cabang", "kasir"].includes(
        role
      ),
    };
  }

  // ==========================================================================
  // 1. "KONTRAK_KORPORAT" & MONITORING PLAFON KREDIT "PELANGGAN"
  // ==========================================================================

  async getCorporateContractsAndFleets() {
    const { role, cabangKode, isGlobalRole, canReadCorporate } =
      this.getRoleFlags();

    // Tolak role yang tidak memiliki akses ke modul Corporate.
    if (!canReadCorporate) {
      throw new AppError(
        "Anda tidak memiliki akses ke modul Corporate.",
        403,
        "CORPORATE_ACCESS_DENIED"
      );
    }

    // Owner dan admin dapat membaca tabel PELANGGAN secara langsung.
    // Kasir dan auditor menggunakan view dengan kolom terbatas.
    const isRestrictedCustomer = ["kasir", "auditor"].includes(role);

    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    // Kasir dan auditor mengambil informasi kredit dari view khusus.
    const creditSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_KORPORAT_AMAN"'
      : '"PELANGGAN"';

    // Kasir dan auditor menggunakan view WO.
    const woSource = ["owner", "admin_cabang"].includes(role)
      ? '"WORK_ORDER"'
      : '"VW_WORK_ORDER_AMAN"';

    // NPWP tidak ditampilkan kepada kasir dan auditor.
    const npwpSelect = isRestrictedCustomer
      ? `'***REDACTED***'::VARCHAR AS npwp`
      : `p.pelanggan_no_identitas AS npwp`;

    const npwpGroupBy = isRestrictedCustomer
      ? ""
      : ", p.pelanggan_no_identitas";

    // Owner dan auditor dapat melihat seluruh pelanggan.
    // Admin dan kasir hanya melihat pelanggan yang dikelola cabangnya.
    const customerScope = isGlobalRole
      ? "TRUE"
      : "p.pelanggan_cab_favorit = $1";

    const queryParams = isGlobalRole ? [] : [cabangKode];

    // ========================================================================
    // A. MONITORING PLAFON KREDIT DAN AKTIVITAS ARMADA
    // ========================================================================

    const monitoringSql = `
    SELECT
      p.pelanggan_id,
      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_pelanggan,
      p.pelanggan_nama AS nama_perusahaan,
      ${npwpSelect},
      p.pelanggan_nama AS pic_nama,
      p.pelanggan_telp AS telepon,

      kk.kontrak_id,
      kk.kontrak_id AS nomor_kontrak,
      ('Kontrak Armada B2B ' || p.pelanggan_nama) AS nama_kontrak,
      'ARMADA_KORPORAT'::VARCHAR AS jenis_armada,

      UPPER(COALESCE(kk.status_kontrak, 'Aktif')) AS status_kontrak,
      kk.status_kontrak AS status_kontrak_asli,
      COALESCE(kk.diskon_kontrak_persen, 0) AS diskon_kontrak_persen,
      kk.kuota_motor,

      24 AS sla_jam_pengerjaan,

      pf.plafon_kredit,
      pf.sisa_plafon,
      (pf.plafon_kredit - pf.sisa_plafon) AS plafon_terpakai,

      CASE
        WHEN pf.plafon_kredit > 0 THEN
          ROUND(
            (
              (pf.plafon_kredit - pf.sisa_plafon)::NUMERIC
              / pf.plafon_kredit
            ) * 100,
            2
          )
        ELSE 0
      END AS persentase_utilisasi,

      COUNT(DISTINCT m.motor_nopol) AS jumlah_unit_armada,

      -- Ringkasan WO mencakup seluruh cabang.
      COUNT(DISTINCT wo.work_no) AS total_wo_korporat,

      COUNT(DISTINCT tk.tagihan_id)
        FILTER (
          WHERE tk.status_tagihan IN ('Belum Dibayar', 'Belum Lunas')
        ) AS tagihan_outstanding_count

    FROM ${customerSource} p

    LEFT JOIN ${creditSource} pf
      ON pf.pelanggan_id = p.pelanggan_id

    LEFT JOIN "KONTRAK_KORPORAT" kk
      ON kk.pelanggan_id = p.pelanggan_id
      AND kk.status_kontrak = 'Aktif'

    LEFT JOIN "MOTOR" m
      ON m.pelanggan_id = p.pelanggan_id

    LEFT JOIN ${woSource} wo
      ON wo.motor_nopol = m.motor_nopol

    LEFT JOIN "TAGIHAN_KOLEKTIF" tk
      ON tk.pelanggan_id = p.pelanggan_id

    WHERE p.pelanggan_tipe = 'Korporat'
      AND ${customerScope}

    GROUP BY
      p.pelanggan_id,
      p.pelanggan_nama${npwpGroupBy},
      p.pelanggan_telp,
      kk.kontrak_id,
      kk.status_kontrak,
      kk.diskon_kontrak_persen,
      kk.kuota_motor,
      pf.plafon_kredit,
      pf.sisa_plafon

    ORDER BY p.pelanggan_id ASC;
  `;

    // ========================================================================
    // B. DAFTAR KONTRAK KORPORAT
    // ========================================================================

    const allContractsSql = `
    SELECT
      kk.kontrak_id AS id,
      kk.kontrak_id,
      kk.pelanggan_id,
      kk.kontrak_id AS nomor_kontrak,

      ('Kontrak Servis Armada — ' || p.pelanggan_nama) AS nama_kontrak,
      'ARMADA_KORPORAT'::VARCHAR AS jenis_armada,

      kk.tgl_mulai AS tanggal_mulai,
      kk.tgl_mulai,

      kk.tgl_akhir AS tanggal_berakhir,
      kk.tgl_akhir,

      kk.kuota_motor AS kuota_servis_bulanan,
      kk.kuota_motor,
      kk.diskon_kontrak_persen,

      24 AS sla_jam_pengerjaan,

      UPPER(kk.status_kontrak) AS status_kontrak,
      kk.status_kontrak AS status_kontrak_asli,

      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_perusahaan,
      p.pelanggan_nama AS nama_pelanggan,

      ${npwpSelect},

      p.pelanggan_nama AS pic_nama,
      p.pelanggan_telp AS telepon,

      pf.plafon_kredit,
      pf.sisa_plafon,

      p.pelanggan_cab_favorit AS kode_cabang,
      c.cabang_nama AS nama_cabang,

      (
        SELECT COUNT(*)
        FROM "MOTOR" m
        WHERE m.pelanggan_id = p.pelanggan_id
      ) AS jumlah_armada,

      -- Menghitung aktivitas servis seluruh cabang.
      (
        SELECT COUNT(*)
        FROM ${woSource} wo
        JOIN "MOTOR" m2
          ON m2.motor_nopol = wo.motor_nopol
        WHERE m2.pelanggan_id = p.pelanggan_id
      ) AS total_wo_kontrak

    FROM "KONTRAK_KORPORAT" kk

    JOIN ${customerSource} p
      ON p.pelanggan_id = kk.pelanggan_id

    LEFT JOIN ${creditSource} pf
      ON pf.pelanggan_id = p.pelanggan_id

    LEFT JOIN "CABANG" c
      ON c.cabang_kode = p.pelanggan_cab_favorit

    WHERE ${customerScope}

    ORDER BY kk.kontrak_id ASC;
  `;

    // ========================================================================
    // C. DAFTAR ARMADA PELANGGAN KORPORAT
    // ========================================================================

    const fleetVehiclesSql = `
    SELECT
      m.motor_nopol AS id,
      m.motor_nopol,
      m.motor_nopol AS plat_nomor,

      m.motor_merek AS merk,
      m.motor_merek,
      m.motor_tipe AS tipe,
      m.motor_tahun AS tahun,
      m.motor_warna AS warna,
      m.motor_no_rangka AS nomor_rangka,
      m.motor_no_mesin AS nomor_mesin,
      m.motor_kilometer AS kilometer_terakhir,

      p.pelanggan_id,
      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_perusahaan,
      p.pelanggan_nama AS nama_pelanggan,

      kk.kontrak_id,
      kk.kontrak_id AS nomor_kontrak,

      'ARMADA_KORPORAT'::VARCHAR AS jenis_armada,

      -- Ringkasan servis mencakup seluruh cabang.
      (
        SELECT COUNT(*)
        FROM ${woSource} wo
        WHERE wo.motor_nopol = m.motor_nopol
      ) AS jumlah_servis,

      (
        SELECT MAX(wo.work_tgl_masuk)
        FROM ${woSource} wo
        WHERE wo.motor_nopol = m.motor_nopol
      ) AS servis_terakhir

    FROM "MOTOR" m

    JOIN ${customerSource} p
      ON p.pelanggan_id = m.pelanggan_id

    LEFT JOIN "KONTRAK_KORPORAT" kk
      ON kk.pelanggan_id = p.pelanggan_id
      AND kk.status_kontrak = 'Aktif'

    WHERE p.pelanggan_tipe = 'Korporat'
      AND ${customerScope}

    ORDER BY
      p.pelanggan_id ASC,
      m.motor_nopol ASC;
  `;

    // ========================================================================
    // D. EKSEKUSI QUERY
    // ========================================================================

    const [monRes, contractsRes, fleetRes] = await Promise.all([
      db.query(monitoringSql, queryParams),
      db.query(allContractsSql, queryParams),
      db.query(fleetVehiclesSql, queryParams),
    ]);

    return {
      creditMonitoring: monRes.rows,
      contracts: contractsRes.rows,
      fleetVehicles: fleetRes.rows,
    };
  }

  async createCorporateContract(data) {
    const { role, cabangKode, canManageCorporate, isOwner } =
      this.getRoleFlags();

    // Hanya Owner dan Admin Cabang yang boleh membuat kontrak.
    if (!canManageCorporate) {
      throw new AppError(
        "Anda tidak memiliki izin untuk membuat kontrak korporat.",
        403,
        "CORPORATE_CONTRACT_CREATE_DENIED"
      );
    }

    if (!data || typeof data !== "object") {
      throw new AppError(
        "Data kontrak tidak valid.",
        400,
        "INVALID_CONTRACT_DATA"
      );
    }

    const pelangganId = String(data.pelanggan_id || "").trim();

    if (!pelangganId) {
      throw new AppError(
        "Pelanggan korporat harus dipilih.",
        400,
        "CUSTOMER_ID_REQUIRED"
      );
    }

    // Pastikan pelanggan benar-benar korporat.
    // Admin hanya boleh membuat kontrak untuk pelanggan
    // yang cabang pengelolanya sama dengan cabang akun.
    const customerSql = `
    SELECT
      pelanggan_id,
      pelanggan_tipe,
      pelanggan_cab_favorit
    FROM "PELANGGAN"
    WHERE pelanggan_id = $1
      AND pelanggan_tipe = 'Korporat'
      ${isOwner ? "" : "AND pelanggan_cab_favorit = $2"}
    LIMIT 1;
  `;

    const customerParams = isOwner ? [pelangganId] : [pelangganId, cabangKode];

    const customerRes = await db.query(customerSql, customerParams);

    if (customerRes.rows.length === 0) {
      throw new AppError(
        "Pelanggan korporat tidak ditemukan atau berada di luar kewenangan cabang Anda.",
        404,
        "CORPORATE_CUSTOMER_NOT_FOUND"
      );
    }

    // Membuat ID kontrak berdasarkan nomor terbesar.
    const seqRes = await db.query(`
    SELECT COALESCE(
      MAX(
        NULLIF(
          REGEXP_REPLACE(kontrak_id, '[^0-9]', '', 'g'),
          ''
        )::INT
      ),
      2
    ) + 1 AS next_seq
    FROM "KONTRAK_KORPORAT";
  `);

    const rawId = data.kontrak_id || data.nomor_kontrak;

    const kontrakId = rawId
      ? String(rawId).trim().toUpperCase().slice(0, 15)
      : `KK${String(seqRes.rows[0].next_seq).padStart(3, "0")}`;

    const tglMulai = data.tgl_mulai || data.tanggal_mulai;
    const tglAkhir = data.tgl_akhir || data.tanggal_berakhir;

    const kuotaMotor = Math.round(
      Number(data.kuota_motor || data.kuota_servis_bulanan || 15)
    );

    const diskonPersen = Math.round(
      Number(
        data.diskon_kontrak_persen !== undefined
          ? data.diskon_kontrak_persen
          : data.diskon_persen || 10
      )
    );

    if (!Number.isFinite(kuotaMotor) || kuotaMotor <= 0) {
      throw new AppError(
        "Kuota motor harus berupa angka lebih dari nol.",
        400,
        "INVALID_CONTRACT_QUOTA"
      );
    }

    if (
      !Number.isFinite(diskonPersen) ||
      diskonPersen < 0 ||
      diskonPersen > 100
    ) {
      throw new AppError(
        "Diskon kontrak harus berada di antara 0 sampai 100 persen.",
        400,
        "INVALID_CONTRACT_DISCOUNT"
      );
    }

    const rawStatus = String(data.status_kontrak || "Aktif").toLowerCase();

    let statusKontrak = "Aktif";

    if (rawStatus.includes("berakhir")) {
      statusKontrak = "Berakhir";
    } else if (rawStatus.includes("beku")) {
      statusKontrak = "Dibekukan";
    }

    const sql = `
    INSERT INTO "KONTRAK_KORPORAT" (
      kontrak_id,
      pelanggan_id,
      tgl_mulai,
      tgl_akhir,
      kuota_motor,
      diskon_kontrak_persen,
      status_kontrak
    )
    SELECT
      $1,
      p.pelanggan_id,
      $3,
      $4,
      $5,
      $6,
      $7
    FROM "PELANGGAN" p
    WHERE p.pelanggan_id = $2
      AND p.pelanggan_tipe = 'Korporat'
      ${isOwner ? "" : "AND p.pelanggan_cab_favorit = $8"}
    RETURNING
      kontrak_id AS id,
      kontrak_id,
      kontrak_id AS nomor_kontrak,
      pelanggan_id,
      tgl_mulai AS tanggal_mulai,
      tgl_akhir AS tanggal_berakhir,
      kuota_motor,
      diskon_kontrak_persen,
      UPPER(status_kontrak) AS status_kontrak;
  `;

    const params = isOwner
      ? [
          kontrakId,
          pelangganId,
          tglMulai,
          tglAkhir,
          kuotaMotor,
          diskonPersen,
          statusKontrak,
        ]
      : [
          kontrakId,
          pelangganId,
          tglMulai,
          tglAkhir,
          kuotaMotor,
          diskonPersen,
          statusKontrak,
          cabangKode,
        ];

    const { rows } = await db.query(sql, params);

    if (rows.length === 0) {
      throw new AppError(
        "Pelanggan tidak lagi memenuhi kewenangan cabang untuk pembuatan kontrak.",
        403,
        "CORPORATE_CUSTOMER_SCOPE_DENIED"
      );
    }

    return rows[0];
  }

  async updateCorporateCreditLimit(pelangganId, plafonBaru, sisaPlafonBaru) {
    const { canManageCorporate, isOwner, cabangKode } = this.getRoleFlags();

    // Hanya Owner dan Admin Cabang yang boleh mengubah plafon.
    if (!canManageCorporate) {
      throw new AppError(
        "Anda tidak memiliki izin untuk mengubah plafon kredit.",
        403,
        "CORPORATE_CREDIT_UPDATE_DENIED"
      );
    }

    const customerId = String(pelangganId || "").trim();

    if (!customerId) {
      throw new AppError(
        "ID pelanggan korporat tidak valid.",
        400,
        "INVALID_CUSTOMER_ID"
      );
    }

    // =========================================================
    // 1. VALIDASI PLAFON BARU
    // =========================================================

    if (
      plafonBaru === undefined ||
      plafonBaru === null ||
      String(plafonBaru).trim() === ""
    ) {
      throw new AppError(
        "Plafon kredit baru harus diisi.",
        400,
        "CREDIT_LIMIT_REQUIRED"
      );
    }

    const plafon = Math.round(Number(plafonBaru));

    if (!Number.isFinite(plafon) || plafon < 0) {
      throw new AppError(
        "Plafon kredit harus berupa angka nol atau lebih.",
        400,
        "INVALID_CREDIT_LIMIT"
      );
    }

    // =========================================================
    // 2. VALIDASI SISA PLAFON JIKA DIKIRIM SECARA MANUAL
    // =========================================================

    const hasManualRemaining =
      sisaPlafonBaru !== undefined && sisaPlafonBaru !== null;

    let sisaManual = null;

    if (hasManualRemaining) {
      if (String(sisaPlafonBaru).trim() === "") {
        throw new AppError(
          "Sisa plafon kredit tidak valid.",
          400,
          "INVALID_REMAINING_CREDIT"
        );
      }

      const rawSisa = Number(sisaPlafonBaru);

      if (!Number.isFinite(rawSisa) || rawSisa < 0) {
        throw new AppError(
          "Sisa plafon kredit harus berupa angka nol atau lebih.",
          400,
          "INVALID_REMAINING_CREDIT"
        );
      }

      sisaManual = Math.min(plafon, Math.round(rawSisa));
    }

    // Owner dapat mengubah seluruh pelanggan korporat.
    // Admin hanya dapat mengubah pelanggan yang dikelola cabangnya.
    const branchCondition = isOwner ? "" : "AND pelanggan_cab_favorit = $2";

    const customerParams = isOwner ? [customerId] : [customerId, cabangKode];

    // =========================================================
    // 3. AMBIL DATA LAMA DAN HITUNG KREDIT TERPAKAI
    // =========================================================

    return await db.withTransaction(async (client) => {
      const currentSql = `
      SELECT
        plafon_kredit,
        sisa_plafon
      FROM "PELANGGAN"
      WHERE pelanggan_id = $1
        AND pelanggan_tipe = 'Korporat'
        ${branchCondition}
      FOR UPDATE;
    `;

      const currentRes = await client.query(currentSql, customerParams);

      // Pelanggan tidak ditemukan atau berada di luar kewenangan.
      if (currentRes.rows.length === 0) {
        return null;
      }

      const current = currentRes.rows[0];

      const plafonLama = Number(current.plafon_kredit || 0);
      const sisaLama = Number(current.sisa_plafon || 0);

      // Kredit yang sudah digunakan sebelum perubahan plafon.
      const kreditTerpakai = Math.max(0, plafonLama - sisaLama);

      // =========================================================
      // 4. TENTUKAN SISA PLAFON BARU
      // =========================================================

      let sisa;

      if (hasManualRemaining) {
        // Jika sisa plafon dikirim secara eksplisit,
        // gunakan nilai tersebut sesuai input (dibatasi plafon baru).
        sisa = sisaManual;
      } else {
        // Jika tidak dikirim, pertahankan kredit yang sudah terpakai.
        if (plafon < kreditTerpakai) {
          throw new AppError(
            "Plafon baru tidak boleh lebih kecil daripada kredit yang sudah terpakai.",
            400,
            "CREDIT_LIMIT_BELOW_USED"
          );
        }

        sisa = plafon - kreditTerpakai;
      }

      // =========================================================
      // 5. UPDATE PLAFON KREDIT
      // =========================================================

      const updateSql = `
      UPDATE "PELANGGAN"
      SET
        plafon_kredit = $1,
        sisa_plafon = $2
      WHERE pelanggan_id = $3
        AND pelanggan_tipe = 'Korporat'
        ${isOwner ? "" : "AND pelanggan_cab_favorit = $4"}
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama AS nama_perusahaan,
        plafon_kredit,
        sisa_plafon;
    `;

      const updateParams = isOwner
        ? [plafon, sisa, customerId]
        : [plafon, sisa, customerId, cabangKode];

      const { rows } = await client.query(updateSql, updateParams);

      return rows[0] || null;
    });
  }

  // ==========================================================================
  // 2. "TAGIHAN_KOLEKTIF" AKHIR BULAN (COLLECTIVE BILLING)
  // ==========================================================================

  async getCollectiveBillings() {
    const { role, cabangKode, isGlobalRole, canReadCorporate } =
      this.getRoleFlags();

    // Hanya role yang berwenang dapat mengakses Corporate.
    if (!canReadCorporate) {
      throw new AppError(
        "Anda tidak memiliki akses ke modul Corporate.",
        403,
        "CORPORATE_ACCESS_DENIED"
      );
    }

    const isRestrictedCustomer = ["kasir", "auditor"].includes(role);
    const isRestrictedWo = role === "auditor";

    // Sumber data pelanggan.
    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    // Sumber data khusus pelanggan korporat yang menyediakan informasi kredit.
    const creditSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_KORPORAT_AMAN"'
      : '"PELANGGAN"';

    // Auditor membaca WO melalui view aman.
    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    const npwpSelect = isRestrictedCustomer
      ? `'***REDACTED***'::VARCHAR AS npwp`
      : `p.pelanggan_no_identitas AS npwp`;

    const diskonSelect = isRestrictedWo
      ? `0::INT AS diskon`
      : `wo.pembayaran_diskon AS diskon`;

    const woPaymentSelect = isRestrictedWo
      ? `'REDACTED'::VARCHAR AS pembayaran_status,
       'Tagihan Kolektif'::VARCHAR AS skema_pembayaran`
      : `wo.pembayaran_status,
       wo.pembayaran_metode AS skema_pembayaran`;

    // Owner dan auditor dapat melihat seluruh pelanggan.
    // Admin dan kasir hanya melihat pelanggan yang dikelola cabangnya.
    const customerScope = isGlobalRole
      ? ""
      : `AND p.pelanggan_cab_favorit = $1`;

    const queryParams = cabangKode ? [cabangKode] : [];

    // ============================================================
    // 1. DAFTAR TAGIHAN KOLEKTIF
    // ============================================================

    const invoicesSql = `
    SELECT
      tk.tagihan_id AS id,
      tk.tagihan_id,
      tk.tagihan_id AS nomor_invoice,
      tk.pelanggan_id,
      kk.kontrak_id,
      tk.periode_bulan AS periode_tagihan,

      COALESCE(
        NULLIF(SPLIT_PART(tk.periode_bulan, '-', 2), '')::INT,
        9
      ) AS periode_bulan,

      COALESCE(
        NULLIF(SPLIT_PART(tk.periode_bulan, '-', 1), '')::INT,
        2026
      ) AS periode_tahun,

      tk.tgl_jatuh_tempo AS tanggal_terbit,
      tk.tgl_jatuh_tempo AS tanggal_jatuh_tempo,
      tk.tgl_jatuh_tempo,
      tk.total_tagihan,

      CASE
        WHEN tk.status_tagihan = 'Lunas' THEN 'LUNAS'
        ELSE 'BELUM_DIBAYAR'
      END AS status_tagihan,

      tk.status_tagihan AS status_tagihan_asli,
      tk.tgl_lunas AS tanggal_lunas,
      tk.tgl_lunas,

      'TRANSFER_BANK_KORPORAT'::VARCHAR AS metode_pelunasan,
      ('REF-' || tk.tagihan_id) AS referensi_pembayaran,

      (
        SELECT COUNT(*)
        FROM ${woSource} wo
        WHERE wo.tagihan_id = tk.tagihan_id
      ) AS total_wo,

      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_perusahaan,
      p.pelanggan_nama AS nama_pelanggan,
      ${npwpSelect},
      p.pelanggan_nama AS pic_nama,

      cp.plafon_kredit,
      cp.sisa_plafon,

      kk.kontrak_id AS nomor_kontrak,
      ('Kontrak Armada ' || p.pelanggan_nama) AS nama_kontrak

    FROM "TAGIHAN_KOLEKTIF" tk

    JOIN ${customerSource} p
      ON p.pelanggan_id = tk.pelanggan_id

    LEFT JOIN ${creditSource} cp
      ON cp.pelanggan_id = p.pelanggan_id

    LEFT JOIN "KONTRAK_KORPORAT" kk
      ON kk.pelanggan_id = p.pelanggan_id
      AND kk.status_kontrak = 'Aktif'

    WHERE TRUE
      ${customerScope}

    ORDER BY tk.tagihan_id DESC;
  `;

    // ============================================================
    // 2. DETAIL WO DALAM TAGIHAN KOLEKTIF
    // ============================================================

    // Detail WO mengikuti hak akses terhadap tagihannya.
    // WO dari cabang pelayanan lain tetap dapat muncul jika
    // termasuk tagihan pelanggan yang dikelola cabang pengguna.

    const detailsSql = `
    SELECT
      wo.work_no AS id,
      wo.tagihan_id AS tagihan_kolektif_id,
      wo.tagihan_id,
      wo.work_no AS work_order_id,
      wo.work_no,
      wo.work_no AS nomor_wo,

      wo.work_tgl_masuk AS waktu_masuk,
      wo.work_tgl_selesai AS waktu_selesai,
      wo.work_keluhan AS keluhan,

      COALESCE(
        (
          SELECT SUM(js.jasa_biaya)
          FROM "WO_JASA" wj
          JOIN "JASA_SERVIS" js
            ON js.jasa_kode = wj.jasa_kode
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

      ${diskonSelect},

      fn_hitung_total_tagihan(wo.work_no) AS nominal_wo,

      m.motor_nopol AS motor_id,
      m.motor_nopol AS plat_nomor,
      (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan

    FROM ${woSource} wo

    JOIN "TAGIHAN_KOLEKTIF" tk
      ON tk.tagihan_id = wo.tagihan_id

    JOIN ${customerSource} p
      ON p.pelanggan_id = tk.pelanggan_id

    JOIN "MOTOR" m
      ON m.motor_nopol = wo.motor_nopol

    WHERE wo.tagihan_id IS NOT NULL
      ${customerScope}

    ORDER BY wo.work_no ASC;
  `;

    // ============================================================
    // 3. WORK ORDER YANG BELUM DITAGIHKAN
    // ============================================================

    // Pengelolaan tagihan bersifat terpusat pada cabang pengelola
    // pelanggan. Karena itu, WO dari cabang pelayanan mana pun
    // dapat ditampilkan jika pelanggan dikelola cabang tersebut.

    const unbilledWoSql = `
    SELECT
      wo.work_no AS id,
      wo.work_no,
      wo.work_no AS nomor_wo,

      LOWER(wo.work_status) AS status,
      wo.work_status,

      ${woPaymentSelect},

      wo.work_tgl_masuk AS waktu_masuk,
      wo.work_tgl_selesai AS waktu_selesai,
      wo.work_keluhan AS keluhan,

      COALESCE(
        (
          SELECT SUM(js.jasa_biaya)
          FROM "WO_JASA" wj
          JOIN "JASA_SERVIS" js
            ON js.jasa_kode = wj.jasa_kode
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

      ${diskonSelect},

      fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,

      m.motor_nopol AS motor_id,
      m.motor_nopol AS plat_nomor,
      (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan,

      p.pelanggan_id,
      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_perusahaan,

      cp.sisa_plafon,

      kk.kontrak_id,
      kk.kontrak_id AS nomor_kontrak

    FROM ${woSource} wo

    JOIN "MOTOR" m
      ON m.motor_nopol = wo.motor_nopol

    JOIN ${customerSource} p
      ON p.pelanggan_id = m.pelanggan_id

    JOIN ${creditSource} cp
      ON cp.pelanggan_id = p.pelanggan_id

    LEFT JOIN "KONTRAK_KORPORAT" kk
      ON kk.pelanggan_id = p.pelanggan_id
      AND kk.status_kontrak = 'Aktif'

    WHERE p.pelanggan_tipe = 'Korporat'
      AND wo.work_status IN ('Selesai', 'Dibayar')
      AND wo.tagihan_id IS NULL
      ${customerScope}

    ORDER BY wo.work_no DESC;
  `;

    // ============================================================
    // 4. EKSEKUSI QUERY
    // ============================================================

    const [invRes, detRes, unbilledRes] = await Promise.all([
      db.query(invoicesSql, queryParams),
      db.query(detailsSql, queryParams),
      db.query(unbilledWoSql, queryParams),
    ]);

    // ============================================================
    // 5. PENGELOMPOKAN DETAIL BERDASARKAN INVOICE
    // ============================================================

    const detailsByInvoice = {};

    for (const detail of detRes.rows) {
      if (!detailsByInvoice[detail.tagihan_id]) {
        detailsByInvoice[detail.tagihan_id] = [];
      }

      detailsByInvoice[detail.tagihan_id].push(detail);
    }

    const invoices = invRes.rows.map((invoice) => ({
      ...invoice,
      details: detailsByInvoice[invoice.tagihan_id] || [],
    }));

    return {
      invoices,
      eligibleWorkOrders: unbilledRes.rows,
    };
  }

  /**
   * Menerbitkan Tagihan Kolektif Akhir Bulan pada tabel "TAGIHAN_KOLEKTIF"
   * dan mengaitkan Work Order korporat pada "WORK_ORDER".tagihan_id
   * (yang otomatis memicu trigger trg_potong_plafon_korporat untuk memotong sisa_plafon).
   */

  async createCollectiveInvoice(data, _user) {
    const { role, cabangKode, isOwner, canCreateCollectiveInvoice } =
      this.getRoleFlags();

    // Hanya Owner, Admin Cabang, dan Kasir yang boleh membuat invoice.
    if (!canCreateCollectiveInvoice) {
      throw new AppError(
        "Anda tidak memiliki izin untuk membuat tagihan kolektif.",
        403,
        "COLLECTIVE_INVOICE_CREATE_DENIED"
      );
    }

    if (!data || typeof data !== "object") {
      throw new AppError(
        "Data tagihan kolektif tidak valid.",
        400,
        "INVALID_INVOICE_DATA"
      );
    }

    const pelangganId = String(data.pelanggan_id || "").trim();

    if (!pelangganId) {
      throw new AppError(
        "Pelanggan korporat harus dipilih.",
        400,
        "CUSTOMER_ID_REQUIRED"
      );
    }

    // Kasir tidak memiliki SELECT langsung ke PELANGGAN.
    // Karena itu, gunakan view aman untuk pemeriksaan pelanggan.
    const customerSource =
      role === "kasir" ? '"VW_PELANGGAN_AMAN"' : '"PELANGGAN"';

    return await db.withTransaction(async (client) => {
      // =========================================================
      // 1. VALIDASI PELANGGAN DAN KEWENANGAN CABANG
      // =========================================================

      const customerSql = `
      SELECT
        p.pelanggan_id,
        p.pelanggan_tipe,
        p.pelanggan_cab_favorit
      FROM ${customerSource} p
      WHERE p.pelanggan_id = $1
        AND p.pelanggan_tipe = 'Korporat'
        ${isOwner ? "" : "AND p.pelanggan_cab_favorit = $2"}
      LIMIT 1;
    `;

      const customerParams = isOwner
        ? [pelangganId]
        : [pelangganId, cabangKode];

      const customerRes = await client.query(customerSql, customerParams);

      if (customerRes.rows.length === 0) {
        throw new AppError(
          "Pelanggan korporat tidak ditemukan atau berada di luar kewenangan cabang Anda.",
          404,
          "CORPORATE_CUSTOMER_NOT_FOUND"
        );
      }

      // =========================================================
      // 2. VALIDASI PERIODE TAGIHAN
      // =========================================================

      const periodeBulanNum = Number(data.periode_bulan || 9);
      const periodeTahunNum = Number(data.periode_tahun || 2026);

      let periodeStr;

      if (
        typeof data.periode_bulan === "string" &&
        data.periode_bulan.includes("-")
      ) {
        periodeStr = data.periode_bulan.trim();

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodeStr)) {
          throw new AppError(
            "Format periode tagihan harus YYYY-MM.",
            400,
            "INVALID_INVOICE_PERIOD"
          );
        }
      } else {
        if (
          !Number.isInteger(periodeBulanNum) ||
          periodeBulanNum < 1 ||
          periodeBulanNum > 12 ||
          !Number.isInteger(periodeTahunNum) ||
          periodeTahunNum < 2000 ||
          periodeTahunNum > 9999
        ) {
          throw new AppError(
            "Bulan atau tahun periode tagihan tidak valid.",
            400,
            "INVALID_INVOICE_PERIOD"
          );
        }

        periodeStr = `${periodeTahunNum}-${String(periodeBulanNum).padStart(
          2,
          "0"
        )}`;
      }

      // =========================================================
      // 3. AMBIL WO YANG MEMENUHI SYARAT
      // =========================================================

      // WO dapat berasal dari cabang pelayanan mana pun,
      // selama motor tersebut dimiliki pelanggan yang dikelola
      // oleh cabang pengguna.

      const eligibleSql = `
      SELECT
        wo.work_no,
        wo.work_status,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan
      FROM "WORK_ORDER" wo

      JOIN "MOTOR" m
        ON m.motor_nopol = wo.motor_nopol

      WHERE m.pelanggan_id = $1
        AND wo.work_status IN ('Selesai', 'Dibayar')
        AND wo.tagihan_id IS NULL

      ORDER BY wo.work_no ASC

      FOR UPDATE OF wo;
    `;

      const { rows: woList } = await client.query(eligibleSql, [pelangganId]);

      if (woList.length === 0) {
        throw new AppError(
          `Tidak ditemukan Work Order korporat yang memenuhi syarat untuk pelanggan ${pelangganId}.`,
          400,
          "NO_ELIGIBLE_CORPORATE_WO"
        );
      }

      // =========================================================
      // 4. GENERATE ID TAGIHAN
      // =========================================================

      const seqInv = await client.query(`
      SELECT COALESCE(
        MAX(
          NULLIF(
            REGEXP_REPLACE(tagihan_id, '[^0-9]', '', 'g'),
            ''
          )::INT
        ),
        1
      ) + 1 AS next_seq
      FROM "TAGIHAN_KOLEKTIF";
    `);

      const tagihanId = data.tagihan_id
        ? String(data.tagihan_id).trim().toUpperCase().slice(0, 15)
        : `TK${String(seqInv.rows[0].next_seq).padStart(3, "0")}`;

      // =========================================================
      // 5. HITUNG TOTAL TAGIHAN
      // =========================================================

      const totalNominal = woList.reduce((acc, item) => {
        const nominal = Number(item.total_tagihan);

        if (!Number.isFinite(nominal) || nominal < 0) {
          throw new AppError(
            `Nominal Work Order ${item.work_no} tidak valid.`,
            400,
            "INVALID_WORK_ORDER_AMOUNT"
          );
        }

        return acc + Math.round(nominal);
      }, 0);

      const tglJatuhTempo =
        data.tgl_jatuh_tempo ||
        data.tanggal_jatuh_tempo ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

      // =========================================================
      // 6. SIMPAN TAGIHAN KOLEKTIF
      // =========================================================

      const insertInvSql = `
      INSERT INTO "TAGIHAN_KOLEKTIF" (
        tagihan_id,
        pelanggan_id,
        periode_bulan,
        total_tagihan,
        status_tagihan,
        tgl_jatuh_tempo,
        tgl_lunas
      )
      VALUES ($1, $2, $3, $4, 'Belum Dibayar', $5, NULL)

      RETURNING
        tagihan_id AS id,
        tagihan_id,
        tagihan_id AS nomor_invoice,
        pelanggan_id,
        periode_bulan AS periode_tagihan,
        tgl_jatuh_tempo AS tanggal_jatuh_tempo,
        total_tagihan,
        'BELUM_DIBAYAR'::VARCHAR AS status_tagihan,
        status_tagihan AS status_tagihan_asli;
    `;

      const { rows: invRows } = await client.query(insertInvSql, [
        tagihanId,
        pelangganId,
        periodeStr,
        totalNominal,
        tglJatuhTempo,
      ]);

      const createdInvoice = invRows[0];

      // =========================================================
      // 7. HUBUNGKAN WO DENGAN TAGIHAN
      // =========================================================

      for (const wo of woList) {
        const updateWo = await client.query(
          `
          UPDATE "WORK_ORDER"
          SET
            tagihan_id = $1,
            pembayaran_metode = 'Tagihan Kolektif'
          WHERE work_no = $2
            AND tagihan_id IS NULL
            AND work_status IN ('Selesai', 'Dibayar')
          RETURNING work_no;
        `,
          [tagihanId, wo.work_no]
        );

        if (updateWo.rowCount !== 1) {
          throw new AppError(
            `Work Order ${wo.work_no} gagal dihubungkan ke tagihan.`,
            409,
            "WORK_ORDER_INVOICE_CONFLICT"
          );
        }
      }

      // =========================================================
      // 8. HASIL
      // =========================================================

      return {
        ...createdInvoice,
        total_wo: woList.length,
      };
    });
  }

  /**
   * Melunasi Tagihan Kolektif Akhir Bulan pada tabel "TAGIHAN_KOLEKTIF"
   * Memicu trigger trg_lunasi_tagihan_kolektif yang otomatis memulihkan sisa_plafon
   * pada "PELANGGAN" dan mengubah pembayaran_status = 'Lunas' pada "WORK_ORDER"!
   */

  async settleCollectiveInvoice(tagihanId, _data) {
    const { role, cabangKode, isOwner, canSettleCollectiveInvoice } =
      this.getRoleFlags();

    // Hanya Owner, Admin Cabang, dan Kasir yang boleh melunasi.
    if (!canSettleCollectiveInvoice) {
      throw new AppError(
        "Anda tidak memiliki izin untuk melunasi tagihan kolektif.",
        403,
        "COLLECTIVE_INVOICE_SETTLE_DENIED"
      );
    }

    const tkId = String(tagihanId || "").trim();

    if (!tkId) {
      throw new AppError("ID tagihan tidak valid.", 400, "INVALID_INVOICE_ID");
    }

    // Kasir tidak memiliki akses langsung ke tabel PELANGGAN.
    const customerSource =
      role === "kasir" ? '"VW_PELANGGAN_AMAN"' : '"PELANGGAN"';

    return await db.withTransaction(async (client) => {
      // =========================================================
      // 1. PERIKSA TAGIHAN DAN KEWENANGAN PELANGGAN
      // =========================================================

      const checkSql = `
      SELECT
        tk.tagihan_id,
        tk.pelanggan_id,
        tk.status_tagihan
      FROM "TAGIHAN_KOLEKTIF" tk

      JOIN ${customerSource} p
        ON p.pelanggan_id = tk.pelanggan_id

      WHERE UPPER(tk.tagihan_id) = UPPER($1)
        AND p.pelanggan_tipe = 'Korporat'
        ${isOwner ? "" : "AND p.pelanggan_cab_favorit = $2"}

      FOR UPDATE OF tk;
    `;

      const checkParams = isOwner ? [tkId] : [tkId, cabangKode];

      const checkRes = await client.query(checkSql, checkParams);

      if (checkRes.rows.length === 0) {
        throw new AppError(
          `Tagihan Kolektif '${tkId}' tidak ditemukan atau berada di luar kewenangan cabang Anda.`,
          404,
          "INVOICE_NOT_FOUND"
        );
      }

      const invoice = checkRes.rows[0];

      // =========================================================
      // 2. PERIKSA STATUS TAGIHAN
      // =========================================================

      if (invoice.status_tagihan === "Lunas") {
        throw new AppError(
          `Tagihan Kolektif '${tkId}' sudah berstatus Lunas.`,
          409,
          "INVOICE_ALREADY_PAID"
        );
      }

      // =========================================================
      // 3. PERBARUI STATUS TAGIHAN
      // =========================================================

      const updateSql = `
      UPDATE "TAGIHAN_KOLEKTIF"
      SET
        status_tagihan = 'Lunas',
        tgl_lunas = CURRENT_TIMESTAMP

      WHERE tagihan_id = $1
        AND status_tagihan <> 'Lunas'

      RETURNING
        tagihan_id AS id,
        tagihan_id,
        tagihan_id AS nomor_invoice,
        pelanggan_id,
        periode_bulan AS periode_tagihan,
        total_tagihan,
        'LUNAS'::VARCHAR AS status_tagihan,
        status_tagihan AS status_tagihan_asli,
        tgl_lunas AS tanggal_lunas;
    `;

      const { rows } = await client.query(updateSql, [invoice.tagihan_id]);

      if (rows.length === 0) {
        throw new AppError(
          `Tagihan Kolektif '${tkId}' gagal diperbarui.`,
          409,
          "INVOICE_SETTLEMENT_CONFLICT"
        );
      }

      return rows[0];
    });
  }
}

module.exports = new CorporateRepository();
