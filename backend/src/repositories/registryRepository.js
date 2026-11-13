const db = require("../config/db");
const AppError = require("../utils/AppError");

class RegistryRepository {
  getCurrentUser() {
    const user = db.getCurrentUserContext();

    if (!user) {
      const error = new Error("User belum terautentikasi.");
      error.status = 401;
      error.code = "UNAUTHENTICATED";
      throw error;
    }

    return user;
  }

  isRestrictedCustomerRole() {
    const user = this.getCurrentUser();

    return ["kasir", "mekanik", "gudang", "auditor"].includes(user.role);
  }

  getAuthorizedCustomerBranch() {
    const user = this.getCurrentUser();

    // Owner dan auditor memiliki akses lintas cabang.
    if (["owner", "auditor"].includes(user.role)) {
      return null;
    }

    // Admin cabang dan kasir dibatasi ke cabangnya sendiri.
    if (["admin_cabang", "kasir"].includes(user.role)) {
      const cabangKode = user.kode_cabang;

      if (!cabangKode) {
        const error = new Error("Cabang pengguna tidak ditemukan.");
        error.status = 403;
        error.code = "USER_BRANCH_NOT_FOUND";
        throw error;
      }

      return String(cabangKode).trim().toUpperCase();
    }

    return null;
  }

  assertCustomerWritePermission() {
    const user = this.getCurrentUser();

    if (!["owner", "admin_cabang"].includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki hak untuk mengelola data pelanggan.",
        403,
        "CUSTOMER_WRITE_FORBIDDEN"
      );
    }

    return user;
  }

  // ==========================================================================
  // 1. MASTER PELANGGAN
  // ==========================================================================

  async getAllCustomers(tipeFilter = null) {
    const user = this.getCurrentUser();
    const role = user.role;
    const authorizedBranch = this.getAuthorizedCustomerBranch();

    const params = [];
    const conditions = [];

    // Filter tipe pelanggan.
    if (
      tipeFilter &&
      ["INDIVIDU", "KORPORAT"].includes(String(tipeFilter).toUpperCase())
    ) {
      const normalized =
        String(tipeFilter).toUpperCase() === "KORPORAT"
          ? "Korporat"
          : "Individu";

      params.push(normalized);
      conditions.push(`p.pelanggan_tipe = $${params.length}`);
    }

    // Admin dan kasir hanya melihat pelanggan cabangnya.
    if (authorizedBranch) {
      params.push(authorizedBranch);
      conditions.push(`p.pelanggan_cab_favorit = $${params.length}`);
    }

    // Mekanik hanya melihat pelanggan yang memiliki
    // Work Order yang ditugaskan kepadanya.
    if (role === "mekanik") {
      const pegawaiId = user.pegawai_id;

      if (!pegawaiId) {
        throw new AppError(
          "Identitas pegawai mekanik tidak ditemukan.",
          403,
          "MECHANIC_ID_NOT_FOUND"
        );
      }

      params.push(pegawaiId);

      conditions.push(`
        EXISTS (
          SELECT 1
          FROM "VW_WORK_ORDER_AMAN" wo
          INNER JOIN "MOTOR" m
            ON m.motor_nopol = wo.motor_nopol
          WHERE wo.mekanik_id = $${params.length}
            AND m.pelanggan_id = p.pelanggan_id
        )
      `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Role berikut tidak memiliki akses ke informasi Corporate.
    const canAccessCorporate = [
      "owner",
      "admin_cabang",
      "kasir",
      "auditor",
    ].includes(role);

    // Pelanggan menggunakan view aman untuk role terbatas.
    const customerTable = this.isRestrictedCustomerRole()
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    // Informasi kredit hanya diambil dari view khusus
    // untuk role yang memang memiliki hak akses.
    const corporateJoin = canAccessCorporate
      ? `
        LEFT JOIN "VW_PELANGGAN_KORPORAT_AMAN" vk
          ON vk.pelanggan_id = p.pelanggan_id

        LEFT JOIN "KONTRAK_KORPORAT" kk
          ON kk.pelanggan_id = p.pelanggan_id
          AND kk.status_kontrak = 'Aktif'
      `
      : "";

    const corporateSelect = canAccessCorporate
      ? `
        COALESCE(MAX(vk.plafon_kredit), 0) AS plafon_kredit,
        COALESCE(MAX(vk.sisa_plafon), 0) AS sisa_plafon,
        MAX(kk.kontrak_id) AS nomor_kontrak,
        UPPER(MAX(kk.status_kontrak)) AS status_kontrak,
        MAX(kk.diskon_kontrak_persen) AS diskon_kontrak_persen
      `
      : `
        0 AS plafon_kredit,
        0 AS sisa_plafon,
        NULL::VARCHAR AS nomor_kontrak,
        NULL::VARCHAR AS status_kontrak,
        NULL::NUMERIC AS diskon_kontrak_persen
      `;

    // Identitas dan alamat hanya ditampilkan kepada
    // owner dan admin cabang.
    const sensitiveSelect = ["owner", "admin_cabang"].includes(role)
      ? `
          p.pelanggan_jenis_identitas,
          p.pelanggan_no_identitas AS npwp,
          p.pelanggan_no_identitas,
          p.pelanggan_alamat AS alamat,
          p.pelanggan_alamat
        `
      : `
          NULL::VARCHAR AS pelanggan_jenis_identitas,
          '***REDACTED***'::VARCHAR AS npwp,
          '***REDACTED***'::VARCHAR AS pelanggan_no_identitas,
          '***REDACTED***'::TEXT AS alamat,
          '***REDACTED***'::TEXT AS pelanggan_alamat
        `;

    const sensitiveGroupBy = ["owner", "admin_cabang"].includes(role)
      ? `,
      p.pelanggan_jenis_identitas,
      p.pelanggan_no_identitas,
      p.pelanggan_alamat
    `
      : "";

    const sql = `
      SELECT
        p.pelanggan_id AS id,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,

        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,

        UPPER(COALESCE(p.pelanggan_tipe, 'Individu'))
          AS tipe_pelanggan,

        COALESCE(p.pelanggan_tipe, 'Individu')
          AS pelanggan_tipe,

        CASE
          WHEN p.pelanggan_tipe = 'Korporat'
          THEN p.pelanggan_nama
          ELSE NULL
        END AS nama_perusahaan,

        ${sensitiveSelect},

        p.pelanggan_nama AS pic_nama,
        p.pelanggan_telp AS telepon,
        p.pelanggan_telp AS pelanggan_no_hp,
        p.pelanggan_telp,

        p.pelanggan_cab_favorit,
        p.mekanik_id_pilihan,

        ${corporateSelect},

        COUNT(DISTINCT m.motor_nopol) AS jumlah_motor

      FROM ${customerTable} p

      LEFT JOIN "MOTOR" m
        ON m.pelanggan_id = p.pelanggan_id

      ${corporateJoin}

      ${whereClause}

      GROUP BY
        p.pelanggan_id,
        p.pelanggan_nama,
        p.pelanggan_tipe,
        p.pelanggan_telp,
        p.pelanggan_cab_favorit,
        p.mekanik_id_pilihan
        ${sensitiveGroupBy}

      ORDER BY p.pelanggan_id ASC;
    `;

    const { rows } = await db.query(sql, params);

    return rows;
  }

  async createCustomer(data) {
    const user = this.assertCustomerWritePermission();

    const pelangganId = String(data.pelanggan_id || data.kode_pelanggan)
      .trim()
      .toUpperCase();

    const nama = String(
      data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan
    ).trim();

    const rawTipe = String(
      data.pelanggan_tipe || data.tipe_pelanggan || "Individu"
    ).toUpperCase();

    const tipe = rawTipe === "KORPORAT" ? "Korporat" : "Individu";

    const telp = String(
      data.pelanggan_telp ||
        data.pelanggan_no_hp ||
        data.telepon ||
        "08115200000"
    ).trim();

    const jenisIdentitas =
      data.pelanggan_jenis_identitas || (tipe === "Korporat" ? "NPWP" : "KTP");

    const noIdentitas = String(
      data.pelanggan_no_identitas ||
        data.npwp ||
        `6271${Date.now().toString().slice(-12)}`
    ).trim();

    const alamat = String(
      data.pelanggan_alamat || data.alamat || "Palangka Raya"
    ).trim();

    // Admin cabang tidak boleh menentukan cabang sendiri
    // melalui request dari frontend.
    const cabFavorit =
      user.role === "admin_cabang"
        ? this.getAuthorizedCustomerBranch()
        : String(data.pelanggan_cab_favorit || "CB001")
            .trim()
            .toUpperCase();

    const mekanikPilihan = data.mekanik_id_pilihan || "PG003";

    const plafon =
      tipe === "Korporat" ? Math.round(Number(data.plafon_kredit || 0)) : 0;

    const sisa =
      tipe === "Korporat"
        ? Math.round(
            Number(data.sisa_plafon !== undefined ? data.sisa_plafon : plafon)
          )
        : 0;

    const sql = `
      INSERT INTO "PELANGGAN" (
        pelanggan_id,
        pelanggan_nama,
        pelanggan_telp,
        pelanggan_jenis_identitas,
        pelanggan_no_identitas,
        pelanggan_alamat,
        pelanggan_cab_favorit,
        mekanik_id_pilihan,
        pelanggan_tipe,
        plafon_kredit,
        sisa_plafon
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)

      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE
          WHEN pelanggan_tipe = 'Korporat'
          THEN pelanggan_nama
          ELSE NULL
        END AS nama_perusahaan,
        pelanggan_jenis_identitas,
        pelanggan_no_identitas AS npwp,
        pelanggan_telp AS telepon,
        pelanggan_telp AS pelanggan_no_hp,
        pelanggan_alamat AS alamat,
        pelanggan_cab_favorit,
        mekanik_id_pilihan,
        plafon_kredit,
        sisa_plafon;
    `;

    const params = [
      pelangganId,
      nama,
      telp,
      jenisIdentitas,
      noIdentitas,
      alamat,
      cabFavorit,
      mekanikPilihan,
      tipe,
      plafon,
      sisa,
    ];

    const { rows } = await db.query(sql, params);

    return rows[0];
  }

  async updateCustomer(id, data) {
    const user = this.assertCustomerWritePermission();
    const pelangganId = String(id).trim();

    const nama = String(
      data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan
    ).trim();

    const rawTipe = String(
      data.pelanggan_tipe || data.tipe_pelanggan || "Individu"
    ).toUpperCase();

    const tipe = rawTipe === "KORPORAT" ? "Korporat" : "Individu";

    const telp = String(
      data.pelanggan_telp ||
        data.pelanggan_no_hp ||
        data.telepon ||
        "08115200000"
    ).trim();

    const alamat = String(
      data.pelanggan_alamat || data.alamat || "Palangka Raya"
    ).trim();

    const plafon = Math.round(Number(data.plafon_kredit || 0));

    const sisa = Math.round(
      Number(data.sisa_plafon !== undefined ? data.sisa_plafon : plafon)
    );

    const params = [nama, tipe, telp, alamat, plafon, sisa, pelangganId];

    // Admin hanya boleh mengubah pelanggan cabangnya sendiri.
    let branchCondition = "";

    if (user.role === "admin_cabang") {
      params.push(this.getAuthorizedCustomerBranch());
      branchCondition = `
        AND pelanggan_cab_favorit = $${params.length}
      `;
    }

    const sql = `
      UPDATE "PELANGGAN"
      SET
        pelanggan_nama = $1,
        pelanggan_tipe = $2,
        pelanggan_telp = $3,
        pelanggan_alamat = $4,
        plafon_kredit = $5,
        sisa_plafon = $6
      WHERE pelanggan_id = $7
      ${branchCondition}

      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE
          WHEN pelanggan_tipe = 'Korporat'
          THEN pelanggan_nama
          ELSE NULL
        END AS nama_perusahaan,
        pelanggan_no_identitas AS npwp,
        pelanggan_telp AS telepon,
        pelanggan_telp AS pelanggan_no_hp,
        pelanggan_alamat AS alamat,
        pelanggan_cab_favorit,
        plafon_kredit,
        sisa_plafon;
    `;

    const { rows } = await db.query(sql, params);

    return rows[0] || null;
  }

  async deleteCustomer(id) {
    const user = this.assertCustomerWritePermission();

    const params = [String(id).trim()];

    let branchCondition = "";

    if (user.role === "admin_cabang") {
      params.push(this.getAuthorizedCustomerBranch());

      branchCondition = `
        AND pelanggan_cab_favorit = $${params.length}
      `;
    }

    const sql = `
      DELETE FROM "PELANGGAN"
      WHERE pelanggan_id = $1
      ${branchCondition}

      RETURNING
        pelanggan_id AS id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan;
    `;

    const { rows } = await db.query(sql, params);

    return rows[0] || null;
  }

  // ==========================================================================
  // 2. MASTER MOTOR ("MOTOR" & "RIWAYAT_KEPEMILIKAN")
  // ==========================================================================

  async getAllVehicles() {
    const user = this.getCurrentUser();
    const role = user.role;
    const authorizedBranch = this.getAuthorizedCustomerBranch();

    const params = [];
    const conditions = [];

    // Gunakan view pelanggan aman untuk role terbatas.
    const customerTable = this.isRestrictedCustomerRole()
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    // Admin cabang dan kasir hanya melihat kendaraan
    // milik pelanggan dari cabangnya sendiri.
    if (authorizedBranch) {
      params.push(authorizedBranch);
      conditions.push(`p.pelanggan_cab_favorit = $${params.length}`);
    }

    // Mekanik hanya melihat kendaraan yang memiliki
    // Work Order yang ditugaskan kepadanya.
    if (role === "mekanik") {
      const pegawaiId = user.pegawai_id;

      if (!pegawaiId) {
        throw new AppError(
          "Identitas pegawai mekanik tidak ditemukan.",
          403,
          "MECHANIC_ID_NOT_FOUND"
        );
      }

      params.push(pegawaiId);

      conditions.push(`
      EXISTS (
        SELECT 1
        FROM "VW_WORK_ORDER_AMAN" wo_assigned
        WHERE UPPER(TRIM(wo_assigned.motor_nopol))
            = UPPER(TRIM(m.motor_nopol))
          AND wo_assigned.mekanik_id = $${params.length}
      )
    `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Role yang dapat melihat informasi kontrak korporat.
    const canAccessCorporate = [
      "owner",
      "admin_cabang",
      "kasir",
      "auditor",
    ].includes(role);

    // Gunakan view Work Order untuk role terbatas.
    const workOrderTable = ["mekanik", "gudang", "auditor"].includes(role)
      ? '"VW_WORK_ORDER_AMAN"'
      : '"WORK_ORDER"';

    const corporateSelect = canAccessCorporate
      ? `
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak
      `
      : `
        NULL::VARCHAR AS kontrak_id,
        NULL::VARCHAR AS nomor_kontrak
      `;

    const corporateJoin = canAccessCorporate
      ? `
        LEFT JOIN LATERAL (
          SELECT
            k.kontrak_id
          FROM "KONTRAK_KORPORAT" k
          WHERE k.pelanggan_id = p.pelanggan_id
            AND k.status_kontrak = 'Aktif'
          ORDER BY k.kontrak_id DESC
          LIMIT 1
        ) kk ON TRUE
      `
      : "";

    const sql = `
    SELECT
      m.motor_nopol AS id,
      m.motor_nopol,
      m.motor_nopol AS plat_nomor,
      m.pelanggan_id,

      m.motor_merek AS merk,
      m.motor_merek AS motor_merk,
      m.motor_merek,

      m.motor_tipe AS tipe,
      m.motor_tipe,

      m.motor_tahun AS tahun,
      m.motor_tahun,

      m.motor_warna AS warna,
      m.motor_warna,

      m.motor_no_rangka AS nomor_rangka,
      m.motor_no_rangka,

      m.motor_no_mesin AS nomor_mesin,
      m.motor_no_mesin,

      m.motor_kilometer AS kilometer_terakhir,
      m.motor_kilometer,

      (
        SELECT COUNT(*)
        FROM ${workOrderTable} wo
        WHERE UPPER(TRIM(wo.motor_nopol))
            = UPPER(TRIM(m.motor_nopol))
      ) AS total_servis,

      CASE
        WHEN p.pelanggan_tipe = 'Korporat'
        THEN 'ARMADA_KORPORAT'
        ELSE 'REGULER'
      END AS jenis_armada,

      p.pelanggan_id AS kode_pelanggan,
      p.pelanggan_nama AS nama_pelanggan,
      p.pelanggan_nama,

      UPPER(COALESCE(p.pelanggan_tipe, 'Individu'))
        AS tipe_pelanggan,

      COALESCE(p.pelanggan_tipe, 'Individu')
        AS pelanggan_tipe,

      CASE
        WHEN p.pelanggan_tipe = 'Korporat'
        THEN p.pelanggan_nama
        ELSE NULL
      END AS nama_perusahaan,

      ${corporateSelect}

    FROM "MOTOR" m

    INNER JOIN ${customerTable} p
      ON p.pelanggan_id = m.pelanggan_id

    ${corporateJoin}

    ${whereClause}

    ORDER BY m.motor_nopol ASC;
  `;

    const { rows } = await db.query(sql, params);

    return rows;
  }

  async createVehicle(data) {
    const user = this.getCurrentUser();

    if (!["owner", "admin_cabang"].includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki hak untuk menambahkan data motor.",
        403,
        "VEHICLE_CREATE_FORBIDDEN"
      );
    }

    const nopol = String(data.motor_nopol || data.plat_nomor)
      .trim()
      .toUpperCase();

    const pelangganId = String(data.pelanggan_id).trim();

    const merek = String(
      data.motor_merek || data.motor_merk || data.merk
    ).trim();

    const tipe = String(data.motor_tipe || data.tipe).trim();
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = String(data.motor_warna || data.warna || "Hitam").trim();

    const noRangka = String(data.motor_no_rangka || data.nomor_rangka)
      .trim()
      .toUpperCase();

    const noMesin = String(
      data.motor_no_mesin ||
        data.nomor_mesin ||
        `MSN-${Date.now().toString().slice(-6)}`
    )
      .trim()
      .toUpperCase();

    const km = Number(data.motor_kilometer || data.kilometer_terakhir || 0);

    return await db.withTransaction(async (client) => {
      // Pastikan pelanggan tersedia dan sesuai cabang admin.
      const customerParams = [pelangganId];
      let customerCondition = "";

      if (user.role === "admin_cabang") {
        if (!user.kode_cabang) {
          throw new AppError(
            "Informasi cabang pengguna tidak ditemukan.",
            403,
            "USER_BRANCH_NOT_FOUND"
          );
        }

        customerParams.push(user.kode_cabang);
        customerCondition = `AND pelanggan_cab_favorit = $2`;
      }

      const customerResult = await client.query(
        `
        SELECT pelanggan_id
        FROM "PELANGGAN"
        WHERE pelanggan_id = $1
        ${customerCondition}
        FOR SHARE;
      `,
        customerParams
      );

      if (customerResult.rowCount === 0) {
        throw new AppError(
          "Pelanggan tidak ditemukan atau berada di luar cabang Anda.",
          404,
          "CUSTOMER_NOT_FOUND_OR_FORBIDDEN"
        );
      }

      const { rows } = await client.query(
        `
        INSERT INTO "MOTOR" (
          motor_nopol,
          pelanggan_id,
          motor_no_rangka,
          motor_no_mesin,
          motor_merek,
          motor_tipe,
          motor_tahun,
          motor_warna,
          motor_kilometer
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          motor_nopol AS id,
          motor_nopol,
          motor_nopol AS plat_nomor,
          pelanggan_id,
          motor_merek AS merk,
          motor_merek AS motor_merk,
          motor_tipe AS tipe,
          motor_tahun AS tahun,
          motor_warna AS warna,
          motor_no_rangka AS nomor_rangka,
          motor_no_mesin AS nomor_mesin,
          motor_kilometer AS kilometer_terakhir;
      `,
        [nopol, pelangganId, noRangka, noMesin, merek, tipe, tahun, warna, km]
      );

      // Hindari benturan ID riwayat ketika beberapa transaksi berjalan bersamaan.
      await client.query(`SELECT pg_advisory_xact_lock(20261113, 1);`);

      const rwSeq = await client.query(`
      SELECT COALESCE(
        MAX(
          NULLIF(
            REGEXP_REPLACE(riwayat_id, '[^0-9]', '', 'g'),
            ''
          )::INT
        ),
        20
      ) + 1 AS next_seq
      FROM "RIWAYAT_KEPEMILIKAN";
    `);

      const riwayatId = `RW${String(rwSeq.rows[0].next_seq).padStart(3, "0")}`;

      await client.query(
        `
        INSERT INTO "RIWAYAT_KEPEMILIKAN" (
          riwayat_id,
          motor_nopol,
          pelanggan_id,
          tanggal_mulai,
          tanggal_selesai
        )
        VALUES ($1, $2, $3, CURRENT_DATE, NULL);
      `,
        [riwayatId, nopol, pelangganId]
      );

      return rows[0];
    });
  }

  async updateVehicle(id, data) {
    const user = this.getCurrentUser();

    if (!["owner", "admin_cabang"].includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki hak untuk mengubah data motor.",
        403,
        "VEHICLE_UPDATE_FORBIDDEN"
      );
    }

    const nopolLama = String(id).trim().toUpperCase();

    const nopolBaru = String(data.motor_nopol || data.plat_nomor || id)
      .trim()
      .toUpperCase();

    const pelangganId = String(data.pelanggan_id).trim();

    const merek = String(
      data.motor_merek || data.motor_merk || data.merk
    ).trim();

    const tipe = String(data.motor_tipe || data.tipe).trim();
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = String(data.motor_warna || data.warna || "Hitam").trim();

    const noRangka = String(data.motor_no_rangka || data.nomor_rangka)
      .trim()
      .toUpperCase();

    const noMesin = String(data.motor_no_mesin || data.nomor_mesin || "-")
      .trim()
      .toUpperCase();

    const km = Number(data.motor_kilometer ?? data.kilometer_terakhir ?? 0);

    return await db.withTransaction(async (client) => {
      const existingResult = await client.query(
        `
        SELECT motor_nopol, pelanggan_id
        FROM "MOTOR"
        WHERE UPPER(TRIM(motor_nopol)) = $1
        FOR UPDATE;
      `,
        [nopolLama]
      );

      if (existingResult.rowCount === 0) {
        return null;
      }

      const motorLama = existingResult.rows[0];
      const nopolAsli = motorLama.motor_nopol;
      const pelangganLama = motorLama.pelanggan_id;

      // Validasi cabang asal motor untuk admin cabang.
      if (user.role === "admin_cabang") {
        if (!user.kode_cabang) {
          throw new AppError(
            "Informasi cabang pengguna tidak ditemukan.",
            403,
            "USER_BRANCH_NOT_FOUND"
          );
        }

        const oldCustomerResult = await client.query(
          `
          SELECT pelanggan_id
          FROM "PELANGGAN"
          WHERE pelanggan_id = $1
            AND pelanggan_cab_favorit = $2
          FOR SHARE;
        `,
          [pelangganLama, user.kode_cabang]
        );

        if (oldCustomerResult.rowCount === 0) {
          throw new AppError(
            "Motor berada di luar cakupan cabang Anda.",
            403,
            "VEHICLE_BRANCH_FORBIDDEN"
          );
        }
      }

      // Validasi pelanggan tujuan.
      const customerParams = [pelangganId];
      let customerCondition = "";

      if (user.role === "admin_cabang") {
        customerParams.push(user.kode_cabang);
        customerCondition = `AND pelanggan_cab_favorit = $2`;
      }

      const customerResult = await client.query(
        `
        SELECT pelanggan_id
        FROM "PELANGGAN"
        WHERE pelanggan_id = $1
        ${customerCondition}
        FOR SHARE;
      `,
        customerParams
      );

      if (customerResult.rowCount === 0) {
        throw new AppError(
          "Pelanggan tujuan tidak ditemukan atau berada di luar cabang Anda.",
          404,
          "CUSTOMER_NOT_FOUND_OR_FORBIDDEN"
        );
      }

      // Validasi nomor polisi baru.
      if (nopolBaru !== nopolAsli) {
        const duplicateResult = await client.query(
          `
          SELECT 1
          FROM "MOTOR"
          WHERE UPPER(TRIM(motor_nopol)) = $1
            AND motor_nopol <> $2
          LIMIT 1;
        `,
          [nopolBaru, nopolAsli]
        );

        if (duplicateResult.rowCount > 0) {
          throw new AppError(
            `Plat nomor ${nopolBaru} sudah digunakan oleh motor lain.`,
            409,
            "DUPLICATE_VEHICLE_PLATE"
          );
        }
      }

      const updateResult = await client.query(
        `
        UPDATE "MOTOR"
        SET
          motor_nopol = $1,
          pelanggan_id = $2,
          motor_merek = $3,
          motor_tipe = $4,
          motor_tahun = $5,
          motor_warna = $6,
          motor_no_rangka = $7,
          motor_no_mesin = $8,
          motor_kilometer = $9
        WHERE motor_nopol = $10
        RETURNING
          motor_nopol AS id,
          motor_nopol,
          motor_nopol AS plat_nomor,
          pelanggan_id,
          motor_merek AS merk,
          motor_merek AS motor_merk,
          motor_tipe AS tipe,
          motor_tahun AS tahun,
          motor_warna AS warna,
          motor_no_rangka AS nomor_rangka,
          motor_no_mesin AS nomor_mesin,
          motor_kilometer AS kilometer_terakhir;
      `,
        [
          nopolBaru,
          pelangganId,
          merek,
          tipe,
          tahun,
          warna,
          noRangka,
          noMesin,
          km,
          nopolAsli,
        ]
      );

      // Jika pemilik berubah, tutup histori lama dan buat histori baru.
      if (pelangganId !== pelangganLama) {
        await client.query(
          `
          UPDATE "RIWAYAT_KEPEMILIKAN"
          SET tanggal_selesai = CURRENT_DATE
          WHERE motor_nopol = $1
            AND pelanggan_id = $2
            AND tanggal_selesai IS NULL;
        `,
          [nopolBaru, pelangganLama]
        );

        await client.query(`SELECT pg_advisory_xact_lock(20261113, 1);`);

        const rwSeq = await client.query(`
        SELECT COALESCE(
          MAX(
            NULLIF(
              REGEXP_REPLACE(riwayat_id, '[^0-9]', '', 'g'),
              ''
            )::INT
          ),
          20
        ) + 1 AS next_seq
        FROM "RIWAYAT_KEPEMILIKAN";
      `);

        const riwayatId = `RW${String(rwSeq.rows[0].next_seq).padStart(
          3,
          "0"
        )}`;

        await client.query(
          `
          INSERT INTO "RIWAYAT_KEPEMILIKAN" (
            riwayat_id,
            motor_nopol,
            pelanggan_id,
            tanggal_mulai,
            tanggal_selesai
          )
          VALUES ($1, $2, $3, CURRENT_DATE, NULL);
        `,
          [riwayatId, nopolBaru, pelangganId]
        );
      }

      return updateResult.rows[0] || null;
    });
  }

  async deleteVehicle(id) {
    const user = this.getCurrentUser();

    if (!["owner", "admin_cabang"].includes(user.role)) {
      throw new AppError(
        "Anda tidak memiliki hak untuk menghapus data motor.",
        403,
        "VEHICLE_DELETE_FORBIDDEN"
      );
    }

    const nopol = String(id).trim().toUpperCase();

    return await db.withTransaction(async (client) => {
      // 1. Cari dan kunci data motor.
      const motorResult = await client.query(
        `
        SELECT
          m.motor_nopol,
          m.pelanggan_id,
          p.pelanggan_cab_favorit
        FROM "MOTOR" m
        JOIN "PELANGGAN" p
          ON p.pelanggan_id = m.pelanggan_id
        WHERE UPPER(TRIM(m.motor_nopol)) = $1
        FOR UPDATE OF m;
      `,
        [nopol]
      );

      if (motorResult.rowCount === 0) {
        return null;
      }

      const motor = motorResult.rows[0];
      const actualNopol = motor.motor_nopol;

      // 2. Batasi admin cabang pada motor milik pelanggan cabangnya.
      if (
        user.role === "admin_cabang" &&
        motor.pelanggan_cab_favorit !== user.kode_cabang
      ) {
        throw new AppError(
          "Motor berada di luar cakupan cabang Anda.",
          403,
          "VEHICLE_BRANCH_FORBIDDEN"
        );
      }

      // 3. Periksa histori kepemilikan.
      const historyResult = await client.query(
        `
        SELECT riwayat_id
        FROM "RIWAYAT_KEPEMILIKAN"
        WHERE motor_nopol = $1
        LIMIT 1;
      `,
        [actualNopol]
      );

      if (historyResult.rowCount > 0) {
        throw new AppError(
          "Motor tidak dapat dihapus karena masih memiliki riwayat kepemilikan.",
          409,
          "VEHICLE_HAS_OWNERSHIP_HISTORY"
        );
      }

      // 4. Periksa Work Order.
      const workOrderResult = await client.query(
        `
        SELECT work_no
        FROM "WORK_ORDER"
        WHERE motor_nopol = $1
        LIMIT 1;
      `,
        [actualNopol]
      );

      if (workOrderResult.rowCount > 0) {
        throw new AppError(
          "Motor tidak dapat dihapus karena sudah memiliki riwayat Work Order.",
          409,
          "VEHICLE_HAS_WORK_ORDERS"
        );
      }

      // 5. Hapus motor jika tidak memiliki histori atau transaksi.
      const deleteResult = await client.query(
        `
        DELETE FROM "MOTOR"
        WHERE motor_nopol = $1
        RETURNING
          motor_nopol AS id,
          motor_nopol AS plat_nomor,
          motor_merek AS merk,
          motor_tipe AS tipe;
      `,
        [actualNopol]
      );

      return deleteResult.rows[0] || null;
    });
  }

  // ==========================================================================
  // 3. MASTER JASA SERVIS ("JASA_SERVIS")
  // ==========================================================================
  async getAllServices() {
    const sql = `
    SELECT
      js.jasa_kode AS id,
      js.jasa_kode,
      js.jasa_kode AS kode_jasa,
      js.jasa_uraian AS nama_jasa,
      js.jasa_uraian AS jasa_nama,
      js.jasa_uraian,
      js.jasa_biaya AS harga_jasa,
      js.jasa_biaya AS jasa_harga,
      js.jasa_biaya,
      (
        SELECT COUNT(DISTINCT wj.work_no)
        FROM "WO_JASA" wj
        WHERE wj.jasa_kode = js.jasa_kode
      ) AS frekuensi_penggunaan
    FROM "JASA_SERVIS" js
    ORDER BY js.jasa_kode ASC;
  `;

    const { rows } = await db.query(sql);
    return rows;
  }

  async createService(data) {
    const user = this.getCurrentUser();

    if (user.role !== "owner") {
      throw new AppError(
        "Hanya owner yang dapat menambahkan jasa servis.",
        403,
        "SERVICE_CREATE_FORBIDDEN"
      );
    }

    const kode = String(data.jasa_kode || data.kode_jasa || "")
      .trim()
      .toUpperCase();

    const uraian = String(
      data.jasa_uraian || data.jasa_nama || data.nama_jasa || ""
    ).trim();

    const biaya = Math.round(
      Number(
        data.jasa_biaya !== undefined
          ? data.jasa_biaya
          : data.jasa_harga !== undefined
          ? data.jasa_harga
          : data.harga_jasa ?? 0
      )
    );

    if (!kode || !uraian || !Number.isFinite(biaya) || biaya < 0) {
      throw new AppError(
        "Kode, uraian, dan biaya jasa harus diisi dengan benar.",
        400,
        "INVALID_SERVICE_DATA"
      );
    }

    try {
      const sql = `
      INSERT INTO "JASA_SERVIS" (
        jasa_kode,
        jasa_uraian,
        jasa_biaya
      )
      VALUES ($1, $2, $3)
      RETURNING
        jasa_kode AS id,
        jasa_kode,
        jasa_kode AS kode_jasa,
        jasa_uraian AS nama_jasa,
        jasa_uraian AS jasa_nama,
        jasa_uraian,
        jasa_biaya AS harga_jasa,
        jasa_biaya AS jasa_harga,
        jasa_biaya,
        0::BIGINT AS frekuensi_penggunaan;
    `;

      const { rows } = await db.query(sql, [kode, uraian, biaya]);
      return rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new AppError(
          `Kode jasa ${kode} sudah digunakan.`,
          409,
          "DUPLICATE_SERVICE_CODE"
        );
      }

      throw error;
    }
  }

  async updateService(id, data) {
    const user = this.getCurrentUser();

    if (user.role !== "owner") {
      throw new AppError(
        "Hanya owner yang dapat mengubah jasa servis.",
        403,
        "SERVICE_UPDATE_FORBIDDEN"
      );
    }

    const kode = String(id).trim().toUpperCase();

    const uraian = String(
      data.jasa_uraian || data.jasa_nama || data.nama_jasa || ""
    ).trim();

    const biaya = Math.round(
      Number(
        data.jasa_biaya !== undefined
          ? data.jasa_biaya
          : data.jasa_harga !== undefined
          ? data.jasa_harga
          : data.harga_jasa ?? 0
      )
    );

    if (!kode || !uraian || !Number.isFinite(biaya) || biaya < 0) {
      throw new AppError(
        "Kode, uraian, dan biaya jasa harus diisi dengan benar.",
        400,
        "INVALID_SERVICE_DATA"
      );
    }

    const sql = `
    UPDATE "JASA_SERVIS"
    SET
      jasa_uraian = $1,
      jasa_biaya = $2
    WHERE UPPER(jasa_kode) = $3
    RETURNING
      jasa_kode AS id,
      jasa_kode,
      jasa_kode AS kode_jasa,
      jasa_uraian AS nama_jasa,
      jasa_uraian AS jasa_nama,
      jasa_uraian,
      jasa_biaya AS harga_jasa,
      jasa_biaya AS jasa_harga,
      jasa_biaya;
  `;

    const { rows } = await db.query(sql, [uraian, biaya, kode]);
    return rows[0] || null;
  }

  async deleteService(id) {
    const user = this.getCurrentUser();

    if (user.role !== "owner") {
      throw new AppError(
        "Hanya owner yang dapat menghapus jasa servis.",
        403,
        "SERVICE_DELETE_FORBIDDEN"
      );
    }

    const kode = String(id).trim().toUpperCase();

    return await db.withTransaction(async (client) => {
      // 1. Pastikan jasa tersedia dan kunci barisnya.
      const serviceResult = await client.query(
        `
        SELECT jasa_kode, jasa_uraian
        FROM "JASA_SERVIS"
        WHERE UPPER(jasa_kode) = $1
        FOR UPDATE;
      `,
        [kode]
      );

      if (serviceResult.rowCount === 0) {
        return null;
      }

      const service = serviceResult.rows[0];

      // 2. Periksa apakah jasa pernah digunakan dalam Work Order.
      const usageResult = await client.query(
        `
        SELECT work_no
        FROM "WO_JASA"
        WHERE jasa_kode = $1
        LIMIT 1;
      `,
        [service.jasa_kode]
      );

      if (usageResult.rowCount > 0) {
        throw new AppError(
          `Jasa ${service.jasa_kode} tidak dapat dihapus karena sudah digunakan dalam Work Order.`,
          409,
          "SERVICE_HAS_WORK_ORDERS"
        );
      }

      // 3. Hapus jasa jika belum pernah digunakan.
      const deleteResult = await client.query(
        `
        DELETE FROM "JASA_SERVIS"
        WHERE jasa_kode = $1
        RETURNING
          jasa_kode AS id,
          jasa_kode,
          jasa_kode AS kode_jasa,
          jasa_uraian AS nama_jasa;
      `,
        [service.jasa_kode]
      );

      return deleteResult.rows[0] || null;
    });
  }

  // ==========================================================================
  // 4. MASTER SUKU CADANG & STOK CABANG
  // ("SUKU_CADANG", "STOK_CABANG", "SUPPLIER_SUKU_CADANG")
  // ==========================================================================

  /**
   * Mengambil data sparepart berdasarkan cabang.
   *
   * Owner dan auditor:
   * - cabangKode null: seluruh SKU ditampilkan pada seluruh cabang.
   * - cabangKode terisi: seluruh SKU ditampilkan pada cabang terpilih.
   *
   * Role lainnya:
   * - Selalu dibatasi pada cabang pengguna yang sedang login.
   *
   * SKU yang belum memiliki catatan STOK_CABANG tetap ditampilkan
   * dengan stok_qty dan stok_minimum bernilai 0.
   */
  async getAllSpareparts(cabangKode = null) {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError(
        "Konteks pengguna tidak ditemukan.",
        401,
        "UNAUTHORIZED_USER"
      );
    }

    const role = String(user.role || "").toLowerCase();
    const canViewAllBranches = ["owner", "auditor"].includes(role);

    let branch = null;

    if (canViewAllBranches) {
      branch = cabangKode ? String(cabangKode).trim().toUpperCase() : null;
    } else {
      branch = String(user.kode_cabang || "")
        .trim()
        .toUpperCase();

      if (!branch) {
        throw new AppError(
          "Kode cabang pengguna tidak ditemukan.",
          400,
          "BRANCH_CONTEXT_MISSING"
        );
      }
    }

    const sql = `
      WITH target_branches AS (
        SELECT
          cabang_kode,
          cabang_nama
        FROM "CABANG"
        WHERE $1::VARCHAR IS NULL
           OR cabang_kode = $1
      )

      SELECT
        sc.suku_cadang_kode || ':' || cb.cabang_kode AS id,

        sc.suku_cadang_kode,
        sc.suku_cadang_kode AS kode_sku,

        sc.suku_cadang_nama,
        sc.suku_cadang_nama AS nama_part,

        'PCS'::VARCHAR AS satuan,

        sc.suku_cadang_harga_satuan,
        sc.suku_cadang_harga_satuan AS harga_jual,

        cb.cabang_kode,
        cb.cabang_nama AS nama_cabang,

        COALESCE(st.stok_qty, 0) AS stok_qty,
        COALESCE(st.stok_qty, 0) AS stok_saat_ini,
        COALESCE(st.stok_qty, 0) AS stok_jumlah,

        COALESCE(st.stok_minimum, 0) AS stok_minimum,

        ssc.supplier_id,
        sup.supplier_id AS kode_supplier,
        sup.supplier_nama AS nama_supplier,
        sup.supplier_telp AS telepon_supplier,

        CASE
          WHEN COALESCE(st.stok_qty, 0) = 0 THEN 'HABIS'
          WHEN COALESCE(st.stok_qty, 0) < COALESCE(st.stok_minimum, 0)
            THEN 'KRITIS'
          ELSE 'AMAN'
        END AS status_stok

      FROM "SUKU_CADANG" sc

      CROSS JOIN target_branches cb

      LEFT JOIN "STOK_CABANG" st
        ON st.suku_cadang_kode = sc.suku_cadang_kode
        AND st.cabang_kode = cb.cabang_kode

      LEFT JOIN LATERAL (
        SELECT s1.supplier_id
        FROM "SUPPLIER_SUKU_CADANG" s1
        WHERE s1.suku_cadang_kode = sc.suku_cadang_kode
        ORDER BY s1.supplier_id ASC
        LIMIT 1
      ) ssc ON TRUE

      LEFT JOIN "SUPPLIER" sup
        ON sup.supplier_id = ssc.supplier_id

      ORDER BY
        sc.suku_cadang_kode ASC,
        cb.cabang_kode ASC;
    `;

    const { rows } = await db.query(sql, [branch]);

    return rows;
  }

  /**
   * Membuat master sparepart dan stok awal.
   * Hanya owner yang diperbolehkan.
   */
  async createSparepart(data) {
    const user = db.getCurrentUserContext();

    if (String(user?.role || "").toLowerCase() !== "owner") {
      throw new AppError(
        "Hanya owner yang dapat membuat master sparepart.",
        403,
        "FORBIDDEN_SPAREPART_CREATE"
      );
    }

    const kode = String(data.suku_cadang_kode || data.kode_sku || "")
      .trim()
      .toUpperCase();

    const nama = String(data.suku_cadang_nama || data.nama_part || "").trim();

    const hargaSatuan = Number(
      data.suku_cadang_harga_satuan ?? data.harga_jual
    );

    const cabangKode = String(data.cabang_kode || "")
      .trim()
      .toUpperCase();

    const stokQty = Number(
      data.stok_qty ?? data.stok_jumlah ?? data.stok_saat_ini ?? 0
    );

    const stokMin = Number(data.stok_minimum ?? 5);

    const supplierId = data.supplier_id
      ? String(data.supplier_id).trim()
      : null;

    if (!kode || !nama || !cabangKode) {
      throw new AppError(
        "Kode, nama sparepart, dan cabang wajib diisi.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (
      !Number.isInteger(hargaSatuan) ||
      hargaSatuan < 0 ||
      !Number.isInteger(stokQty) ||
      stokQty < 0 ||
      !Number.isInteger(stokMin) ||
      stokMin < 0
    ) {
      throw new AppError(
        "Harga, jumlah stok, dan stok minimum harus berupa bilangan bulat nonnegatif.",
        400,
        "INVALID_SPAREPART_VALUE"
      );
    }

    return await db.withTransaction(async (client) => {
      const insertMaster = await client.query(
        `
          INSERT INTO "SUKU_CADANG" (
            suku_cadang_kode,
            suku_cadang_nama,
            suku_cadang_harga_satuan
          )
          VALUES ($1, $2, $3)
          RETURNING
            suku_cadang_kode,
            suku_cadang_nama,
            suku_cadang_harga_satuan;
        `,
        [kode, nama, hargaSatuan]
      );

      const master = insertMaster.rows[0];

      await client.query(
        `
          INSERT INTO "STOK_CABANG" (
            cabang_kode,
            suku_cadang_kode,
            stok_qty,
            stok_minimum
          )
          VALUES ($1, $2, $3, $4);
        `,
        [cabangKode, kode, stokQty, stokMin]
      );

      if (supplierId) {
        await client.query(
          `
            INSERT INTO "SUPPLIER_SUKU_CADANG" (
              supplier_id,
              suku_cadang_kode
            )
            VALUES ($1, $2)
            ON CONFLICT (supplier_id, suku_cadang_kode)
            DO NOTHING;
          `,
          [supplierId, kode]
        );
      }

      const branchResult = await client.query(
        `
          SELECT cabang_nama
          FROM "CABANG"
          WHERE cabang_kode = $1;
        `,
        [cabangKode]
      );

      return {
        id: `${master.suku_cadang_kode}:${cabangKode}`,
        suku_cadang_kode: master.suku_cadang_kode,
        kode_sku: master.suku_cadang_kode,
        suku_cadang_nama: master.suku_cadang_nama,
        nama_part: master.suku_cadang_nama,
        satuan: "PCS",
        suku_cadang_harga_satuan: master.suku_cadang_harga_satuan,
        harga_jual: master.suku_cadang_harga_satuan,
        cabang_kode: cabangKode,
        nama_cabang: branchResult.rows[0]?.cabang_nama || null,
        stok_qty: stokQty,
        stok_saat_ini: stokQty,
        stok_minimum: stokMin,
        supplier_id: supplierId,
      };
    });
  }

  /**
   * Memperbarui sparepart.
   *
   * Owner:
   * - Dapat memperbarui nama dan harga master.
   * - Dapat memperbarui stok cabang yang dipilih.
   *
   * Gudang:
   * - Hanya dapat memperbarui stok dan stok minimum.
   * - Cabang selalu dipaksa menggunakan cabang akun login.
   */
  async updateSparepart(id, data) {
    const user = db.getCurrentUserContext();

    if (!user) {
      throw new AppError(
        "Konteks pengguna tidak ditemukan.",
        401,
        "UNAUTHORIZED_USER"
      );
    }

    const role = String(user.role || "").toLowerCase();
    const isOwner = role === "owner";
    const isGudang = role === "gudang";

    if (!isOwner && !isGudang) {
      throw new AppError(
        "Anda tidak memiliki izin untuk mengubah sparepart.",
        403,
        "FORBIDDEN_SPAREPART_UPDATE"
      );
    }

    const kode = String(id || "")
      .trim()
      .toUpperCase();

    if (!kode) {
      throw new AppError(
        "Kode sparepart tidak valid.",
        400,
        "INVALID_SPAREPART_ID"
      );
    }

    // Gudang tidak boleh menentukan cabang melalui request.
    const cabangKode = isGudang
      ? String(user.kode_cabang || "")
          .trim()
          .toUpperCase()
      : String(data.cabang_kode || "")
          .trim()
          .toUpperCase();

    if (!cabangKode) {
      throw new AppError(
        "Kode cabang wajib tersedia.",
        400,
        "BRANCH_CONTEXT_MISSING"
      );
    }

    const stokQty = Number(
      data.stok_qty ?? data.stok_jumlah ?? data.stok_saat_ini
    );

    const stokMin = Number(data.stok_minimum);

    if (
      !Number.isInteger(stokQty) ||
      stokQty < 0 ||
      !Number.isInteger(stokMin) ||
      stokMin < 0
    ) {
      throw new AppError(
        "Jumlah stok dan stok minimum wajib berupa bilangan bulat nonnegatif.",
        400,
        "INVALID_STOCK_VALUE"
      );
    }

    // Data master hanya divalidasi dan diperbarui oleh owner.
    let nama = null;
    let hargaSatuan = null;

    if (isOwner) {
      nama = String(data.suku_cadang_nama || data.nama_part || "").trim();

      hargaSatuan = Number(data.suku_cadang_harga_satuan ?? data.harga_jual);

      if (!nama || !Number.isInteger(hargaSatuan) || hargaSatuan < 0) {
        throw new AppError(
          "Nama sparepart dan harga yang valid wajib diisi oleh owner.",
          400,
          "INVALID_SPAREPART_MASTER"
        );
      }
    }

    return await db.withTransaction(async (client) => {
      // Pastikan SKU tersedia dan kunci master selama transaksi.
      const existingResult = await client.query(
        `
          SELECT
            suku_cadang_kode,
            suku_cadang_nama,
            suku_cadang_harga_satuan
          FROM "SUKU_CADANG"
          WHERE suku_cadang_kode = $1
          FOR UPDATE;
        `,
        [kode]
      );

      if (existingResult.rowCount === 0) {
        return null;
      }

      let master = existingResult.rows[0];

      // Hanya owner yang boleh mengubah master.
      if (isOwner) {
        const updateMaster = await client.query(
          `
            UPDATE "SUKU_CADANG"
            SET
              suku_cadang_nama = $1,
              suku_cadang_harga_satuan = $2
            WHERE suku_cadang_kode = $3
            RETURNING
              suku_cadang_kode,
              suku_cadang_nama,
              suku_cadang_harga_satuan;
          `,
          [nama, hargaSatuan, kode]
        );

        master = updateMaster.rows[0];
      }

      // Update stok hanya pada satu cabang.
      // Gudang selalu menggunakan cabangnya sendiri.
      const stockResult = await client.query(
        `
          INSERT INTO "STOK_CABANG" (
            cabang_kode,
            suku_cadang_kode,
            stok_qty,
            stok_minimum
          )
          VALUES ($1, $2, $3, $4)

          ON CONFLICT (cabang_kode, suku_cadang_kode)
          DO UPDATE SET
            stok_qty = EXCLUDED.stok_qty,
            stok_minimum = EXCLUDED.stok_minimum

          RETURNING
            cabang_kode,
            stok_qty,
            stok_minimum;
        `,
        [cabangKode, kode, stokQty, stokMin]
      );

      const stock = stockResult.rows[0];

      const branchResult = await client.query(
        `
          SELECT cabang_nama
          FROM "CABANG"
          WHERE cabang_kode = $1;
        `,
        [cabangKode]
      );

      return {
        id: `${master.suku_cadang_kode}:${cabangKode}`,
        suku_cadang_kode: master.suku_cadang_kode,
        kode_sku: master.suku_cadang_kode,
        suku_cadang_nama: master.suku_cadang_nama,
        nama_part: master.suku_cadang_nama,
        satuan: "PCS",
        suku_cadang_harga_satuan: master.suku_cadang_harga_satuan,
        harga_jual: master.suku_cadang_harga_satuan,
        cabang_kode: stock.cabang_kode,
        nama_cabang: branchResult.rows[0]?.cabang_nama || null,
        stok_qty: stock.stok_qty,
        stok_saat_ini: stock.stok_qty,
        stok_minimum: stock.stok_minimum,
      };
    });
  }

  /**
   * Menghapus master sparepart beserta seluruh stok dan relasi supplier.
   * Hanya owner yang diperbolehkan.
   */
  async deleteSparepart(id) {
    const user = db.getCurrentUserContext();

    if (String(user?.role || "").toLowerCase() !== "owner") {
      throw new AppError(
        "Hanya owner yang dapat menghapus master sparepart.",
        403,
        "FORBIDDEN_SPAREPART_DELETE"
      );
    }

    const kode = String(id || "")
      .trim()
      .toUpperCase();

    if (!kode) {
      throw new AppError(
        "Kode sparepart tidak valid.",
        400,
        "INVALID_SPAREPART_ID"
      );
    }

    return await db.withTransaction(async (client) => {
      const sparepartResult = await client.query(
        `
          SELECT
            suku_cadang_kode,
            suku_cadang_nama
          FROM "SUKU_CADANG"
          WHERE suku_cadang_kode = $1
          FOR UPDATE;
        `,
        [kode]
      );

      if (sparepartResult.rowCount === 0) {
        return null;
      }

      const sparepart = sparepartResult.rows[0];
      const kodeAsli = sparepart.suku_cadang_kode;

      // Jangan menghapus SKU yang sudah digunakan dalam transaksi WO.
      const usageResult = await client.query(
        `
          SELECT COUNT(*)::INT AS jumlah
          FROM "WO_SUKU_CADANG"
          WHERE suku_cadang_kode = $1;
        `,
        [kodeAsli]
      );

      if (usageResult.rows[0].jumlah > 0) {
        throw new AppError(
          "Sparepart tidak dapat dihapus karena sudah digunakan dalam transaksi work order.",
          409,
          "SPAREPART_IN_USE"
        );
      }

      await client.query(
        `
          DELETE FROM "SUPPLIER_SUKU_CADANG"
          WHERE suku_cadang_kode = $1;
        `,
        [kodeAsli]
      );

      await client.query(
        `
          DELETE FROM "STOK_CABANG"
          WHERE suku_cadang_kode = $1;
        `,
        [kodeAsli]
      );

      const deleteResult = await client.query(
        `
          DELETE FROM "SUKU_CADANG"
          WHERE suku_cadang_kode = $1
          RETURNING
            suku_cadang_kode AS id,
            suku_cadang_kode AS kode_sku,
            suku_cadang_nama AS nama_part;
        `,
        [kodeAsli]
      );

      return deleteResult.rows[0] || null;
    });
  }

  // ==========================================================================
  // 5. MASTER SUPPLIER DAN RELASI SUPPLIER - SUKU CADANG
  // ==========================================================================

  // Mengambil seluruh supplier beserta jumlah SKU yang disediakan.
  async getAllSuppliers() {
    const sql = `
      SELECT
        s.supplier_id AS id,
        s.supplier_id,
        s.supplier_id AS kode_supplier,
        s.supplier_nama AS nama_supplier,
        s.supplier_nama,
        s.supplier_telp AS telepon,
        s.supplier_telp AS supplier_telp,
        s.supplier_alamat AS alamat,
        s.supplier_alamat,
        COUNT(ssc.suku_cadang_kode)::INT AS jumlah_sku
      FROM "SUPPLIER" s
      LEFT JOIN "SUPPLIER_SUKU_CADANG" ssc
        ON ssc.supplier_id = s.supplier_id
      GROUP BY
        s.supplier_id,
        s.supplier_nama,
        s.supplier_telp,
        s.supplier_alamat
      ORDER BY s.supplier_id ASC;
    `;

    const { rows } = await db.query(sql);
    return rows;
  }

  // Mengambil seluruh suku cadang yang disediakan oleh supplier tertentu.
  async getSupplierSpareparts(supplierId) {
    const sql = `
      SELECT
        sc.suku_cadang_kode AS id,
        sc.suku_cadang_kode,
        sc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        sc.suku_cadang_harga_satuan AS harga_satuan
      FROM "SUPPLIER_SUKU_CADANG" ssc
      JOIN "SUKU_CADANG" sc
        ON sc.suku_cadang_kode = ssc.suku_cadang_kode
      WHERE UPPER(ssc.supplier_id) = $1
      ORDER BY sc.suku_cadang_kode ASC;
    `;

    const { rows } = await db.query(sql, [
      String(supplierId).trim().toUpperCase(),
    ]);

    return rows;
  }

  // Menambahkan relasi supplier dengan suku cadang.
  // Supplier dan suku cadang harus sudah terdaftar.
  async assignSparepartToSupplier(supplierId, sparepartCode) {
    const sql = `
      INSERT INTO "SUPPLIER_SUKU_CADANG" (
        supplier_id,
        suku_cadang_kode
      )
      VALUES ($1, $2)
      ON CONFLICT (supplier_id, suku_cadang_kode)
      DO NOTHING
      RETURNING supplier_id, suku_cadang_kode;
    `;

    const { rows } = await db.query(sql, [
      String(supplierId).trim().toUpperCase(),
      String(sparepartCode).trim().toUpperCase(),
    ]);

    return rows[0] || null;
  }

  // Menghapus relasi supplier dengan suku cadang.
  // Tidak menghapus data master supplier maupun suku cadang.
  async removeSparepartFromSupplier(supplierId, sparepartCode) {
    const sql = `
      DELETE FROM "SUPPLIER_SUKU_CADANG"
      WHERE UPPER(supplier_id) = $1
        AND UPPER(suku_cadang_kode) = $2
      RETURNING supplier_id, suku_cadang_kode;
    `;

    const { rows } = await db.query(sql, [
      String(supplierId).trim().toUpperCase(),
      String(sparepartCode).trim().toUpperCase(),
    ]);

    return rows[0] || null;
  }

  // Menambahkan master supplier.
  async createSupplier(data) {
    const supplierId = String(data.supplier_id || data.kode_supplier || "")
      .trim()
      .toUpperCase();

    const nama = String(data.supplier_nama || data.nama_supplier || "").trim();

    const telp = String(
      data.supplier_telp || data.supplier_kontak || data.telepon || ""
    ).trim();

    const alamat = String(data.supplier_alamat || data.alamat || "").trim();

    if (!supplierId || !nama || !telp || !alamat) {
      throw new Error("Data supplier belum lengkap.");
    }

    const sql = `
      INSERT INTO "SUPPLIER" (
        supplier_id,
        supplier_nama,
        supplier_telp,
        supplier_alamat
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        supplier_id AS id,
        supplier_id,
        supplier_id AS kode_supplier,
        supplier_nama AS nama_supplier,
        supplier_nama,
        supplier_telp AS telepon,
        supplier_telp,
        supplier_alamat AS alamat,
        supplier_alamat;
    `;

    const { rows } = await db.query(sql, [supplierId, nama, telp, alamat]);

    return rows[0];
  }

  // Mengubah master supplier.
  async updateSupplier(id, data) {
    const supplierId = String(id).trim().toUpperCase();

    const nama = String(data.supplier_nama || data.nama_supplier || "").trim();

    const telp = String(
      data.supplier_telp || data.supplier_kontak || data.telepon || ""
    ).trim();

    const alamat = String(data.supplier_alamat || data.alamat || "").trim();

    if (!nama || !telp || !alamat) {
      throw new Error("Data supplier belum lengkap.");
    }

    const sql = `
      UPDATE "SUPPLIER"
      SET
        supplier_nama = $1,
        supplier_telp = $2,
        supplier_alamat = $3
      WHERE UPPER(supplier_id) = $4
      RETURNING
        supplier_id AS id,
        supplier_id,
        supplier_id AS kode_supplier,
        supplier_nama AS nama_supplier,
        supplier_nama,
        supplier_telp AS telepon,
        supplier_telp,
        supplier_alamat AS alamat,
        supplier_alamat;
    `;

    const { rows } = await db.query(sql, [nama, telp, alamat, supplierId]);

    return rows[0] || null;
  }

  // Menghapus master supplier.
  // Jika masih memiliki relasi dengan suku cadang, FK akan mencegah
  // penghapusan sampai relasinya dilepas terlebih dahulu.
  async deleteSupplier(id) {
    const sql = `
      DELETE FROM "SUPPLIER"
      WHERE UPPER(supplier_id) = $1
      RETURNING
        supplier_id AS id,
        supplier_id AS kode_supplier,
        supplier_nama AS nama_supplier;
    `;

    const { rows } = await db.query(sql, [String(id).trim().toUpperCase()]);

    return rows[0] || null;
  }

  // ==========================================================================
  // 6. HELPER LOOKUPS ("CABANG", "MEKANIK", "PEGAWAI")
  // ==========================================================================
  async getAllBranches() {
    const sql = `
      SELECT
        cabang_kode AS id,
        cabang_kode,
        cabang_kode AS kode_cabang,
        cabang_nama AS nama_cabang,
        cabang_nama,
        cabang_alamat AS alamat,
        cabang_alamat,
        cabang_telp AS telepon,
        cabang_telp,
        jam_buka,
        jam_tutup,
        (jam_buka::TEXT || ' - ' || jam_tutup::TEXT) AS cabang_jam_operasional,
        kapasitas_slot,
        'Palangka Raya'::VARCHAR AS kota
      FROM "CABANG"
      ORDER BY cabang_kode ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async getAllMechanics() {
    const sql = `
      SELECT
        mk.mekanik_id AS id,
        mk.mekanik_id,
        pg.pegawai_id,
        pg.pegawai_nama AS nama_lengkap,
        pg.pegawai_nama,
        pg.pegawai_peran AS jabatan,
        mk.mekanik_keahlian AS spesialisasi,
        mk.mekanik_keahlian AS mekanik_spesialisasi,
        mk.mekanik_keahlian,
        pg.cabang_kode AS cabang_id,
        pg.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang
      FROM "MEKANIK" mk
      JOIN "PEGAWAI" pg ON pg.pegawai_id = mk.mekanik_id
      JOIN "CABANG" c ON c.cabang_kode = pg.cabang_kode
      ORDER BY mk.mekanik_id ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }
}

module.exports = new RegistryRepository();
