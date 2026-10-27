const db = require('../config/db');

class RegistryRepository {
  isRestrictedCustomerRole() {
    const user = db.getCurrentUserContext();
    return Boolean(user && ['kasir', 'mekanik', 'gudang', 'auditor'].includes(user.role));
  }

  // ==========================================================================
  // 1. MASTER PELANGGAN ("PELANGGAN" & "VW_PELANGGAN_AMAN" + "KONTRAK_KORPORAT")
  // ==========================================================================
  async getAllCustomers(tipeFilter = null) {
    const restricted = this.isRestrictedCustomerRole();
    const params = [];
    let whereClause = '';

    if (tipeFilter && ['INDIVIDU', 'KORPORAT'].includes(tipeFilter.toUpperCase())) {
      const normalized =
        tipeFilter.toUpperCase() === 'KORPORAT' ? 'Korporat' : 'Individu';
      params.push(normalized);
      whereClause = `WHERE p.pelanggan_tipe = $1`;
    }

    const sql = restricted
      ? `
        SELECT
          p.pelanggan_id AS id,
          p.pelanggan_id,
          p.pelanggan_id AS kode_pelanggan,
          p.pelanggan_nama AS nama_pelanggan,
          p.pelanggan_nama,
          UPPER(COALESCE(p.pelanggan_tipe, 'Individu')) AS tipe_pelanggan,
          COALESCE(p.pelanggan_tipe, 'Individu') AS pelanggan_tipe,
          CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
          NULL::VARCHAR AS pelanggan_jenis_identitas,
          '***REDACTED***'::VARCHAR AS npwp,
          '***REDACTED***'::VARCHAR AS pelanggan_no_identitas,
          p.pelanggan_nama AS pic_nama,
          p.pelanggan_telp AS telepon,
          p.pelanggan_telp AS pelanggan_no_hp,
          p.pelanggan_telp,
          '***REDACTED***'::TEXT AS alamat,
          '***REDACTED***'::TEXT AS pelanggan_alamat,
          p.pelanggan_cab_favorit,
          p.mekanik_id_pilihan,
          COALESCE(p.plafon_kredit, 0) AS plafon_kredit,
          COALESCE(p.sisa_plafon, 0) AS sisa_plafon,
          COUNT(DISTINCT m.motor_nopol) AS jumlah_motor,
          MAX(kk.kontrak_id) AS nomor_kontrak,
          UPPER(MAX(kk.status_kontrak)) AS status_kontrak,
          MAX(kk.diskon_kontrak_persen) AS diskon_kontrak_persen
        FROM "VW_PELANGGAN_AMAN" p
        LEFT JOIN "MOTOR" m ON m.pelanggan_id = p.pelanggan_id
        LEFT JOIN "KONTRAK_KORPORAT" kk
          ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
        ${whereClause}
        GROUP BY
          p.pelanggan_id, p.pelanggan_nama, p.pelanggan_telp,
          p.pelanggan_cab_favorit, p.mekanik_id_pilihan,
          p.pelanggan_tipe, p.plafon_kredit, p.sisa_plafon
        ORDER BY p.pelanggan_id ASC;
      `
      : `
        SELECT
          p.pelanggan_id AS id,
          p.pelanggan_id,
          p.pelanggan_id AS kode_pelanggan,
          p.pelanggan_nama AS nama_pelanggan,
          p.pelanggan_nama,
          UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
          p.pelanggan_tipe,
          CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
          p.pelanggan_jenis_identitas,
          p.pelanggan_no_identitas AS npwp,
          p.pelanggan_no_identitas,
          p.pelanggan_nama AS pic_nama,
          p.pelanggan_telp AS telepon,
          p.pelanggan_telp AS pelanggan_no_hp,
          p.pelanggan_telp,
          p.pelanggan_alamat AS alamat,
          p.pelanggan_alamat,
          p.pelanggan_cab_favorit,
          p.mekanik_id_pilihan,
          p.plafon_kredit,
          p.sisa_plafon,
          COUNT(DISTINCT m.motor_nopol) AS jumlah_motor,
          MAX(kk.kontrak_id) AS nomor_kontrak,
          UPPER(MAX(kk.status_kontrak)) AS status_kontrak,
          MAX(kk.diskon_kontrak_persen) AS diskon_kontrak_persen
        FROM "PELANGGAN" p
        LEFT JOIN "MOTOR" m ON m.pelanggan_id = p.pelanggan_id
        LEFT JOIN "KONTRAK_KORPORAT" kk
          ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
        ${whereClause}
        GROUP BY
          p.pelanggan_id, p.pelanggan_nama, p.pelanggan_tipe,
          p.pelanggan_jenis_identitas, p.pelanggan_no_identitas,
          p.pelanggan_telp, p.pelanggan_alamat,
          p.pelanggan_cab_favorit, p.mekanik_id_pilihan,
          p.plafon_kredit, p.sisa_plafon
        ORDER BY p.pelanggan_id ASC;
      `;

    const { rows } = await db.query(sql, params);
    return rows;
  }

  async createCustomer(data) {
    const pelangganId = String(data.pelanggan_id || data.kode_pelanggan)
      .trim()
      .toUpperCase();
    const nama = String(
      data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan
    ).trim();
    const rawTipe = String(
      data.pelanggan_tipe || data.tipe_pelanggan || 'Individu'
    ).toUpperCase();
    const tipe = rawTipe === 'KORPORAT' ? 'Korporat' : 'Individu';
    const telp = String(
      data.pelanggan_telp || data.pelanggan_no_hp || data.telepon || '08115200000'
    ).trim();
    const jenisIdentitas =
      data.pelanggan_jenis_identitas || (tipe === 'Korporat' ? 'NPWP' : 'KTP');
    const noIdentitas = String(
      data.pelanggan_no_identitas ||
        data.npwp ||
        `6271${Date.now().toString().slice(-12)}`
    ).trim();
    const alamat = String(
      data.pelanggan_alamat || data.alamat || 'Palangka Raya'
    ).trim();
    const cabFavorit = String(data.pelanggan_cab_favorit || 'CB001').trim();
    const mekanikPilihan = data.mekanik_id_pilihan || 'PG003';
    const plafon =
      tipe === 'Korporat' ? Math.round(Number(data.plafon_kredit || 0)) : 0;
    const sisa =
      tipe === 'Korporat'
        ? Math.round(
            Number(
              data.sisa_plafon !== undefined ? data.sisa_plafon : plafon
            )
          )
        : 0;

    const sql = `
      INSERT INTO "PELANGGAN" (
        pelanggan_id, pelanggan_nama, pelanggan_telp,
        pelanggan_jenis_identitas, pelanggan_no_identitas,
        pelanggan_alamat, pelanggan_cab_favorit, mekanik_id_pilihan,
        pelanggan_tipe, plafon_kredit, sisa_plafon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE WHEN pelanggan_tipe = 'Korporat' THEN pelanggan_nama ELSE NULL END AS nama_perusahaan,
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
    const pelangganId = String(id).trim();
    const nama = String(
      data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan
    ).trim();
    const rawTipe = String(
      data.pelanggan_tipe || data.tipe_pelanggan || 'Individu'
    ).toUpperCase();
    const tipe = rawTipe === 'KORPORAT' ? 'Korporat' : 'Individu';
    const telp = String(
      data.pelanggan_telp || data.pelanggan_no_hp || data.telepon || '08115200000'
    ).trim();
    const alamat = String(
      data.pelanggan_alamat || data.alamat || 'Palangka Raya'
    ).trim();
    const plafon = Math.round(Number(data.plafon_kredit || 0));
    const sisa = Math.round(
      Number(data.sisa_plafon !== undefined ? data.sisa_plafon : plafon)
    );

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
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE WHEN pelanggan_tipe = 'Korporat' THEN pelanggan_nama ELSE NULL END AS nama_perusahaan,
        pelanggan_no_identitas AS npwp,
        pelanggan_telp AS telepon,
        pelanggan_telp AS pelanggan_no_hp,
        pelanggan_alamat AS alamat,
        plafon_kredit,
        sisa_plafon;
    `;
    const params = [nama, tipe, telp, alamat, plafon, sisa, pelangganId];
    const { rows } = await db.query(sql, params);
    return rows[0] || null;
  }

  async deleteCustomer(id) {
    const sql = `
      DELETE FROM "PELANGGAN"
      WHERE pelanggan_id = $1
      RETURNING pelanggan_id AS id, pelanggan_id AS kode_pelanggan, pelanggan_nama AS nama_pelanggan;
    `;
    const { rows } = await db.query(sql, [String(id).trim()]);
    return rows[0] || null;
  }

  // ==========================================================================
  // 2. MASTER MOTOR ("MOTOR" & "RIWAYAT_KEPEMILIKAN")
  // ==========================================================================
  async getAllVehicles() {
    const customerTable = this.isRestrictedCustomerRole()
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

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
          FROM "WORK_ORDER" wo
          WHERE UPPER(TRIM(wo.motor_nopol))
              = UPPER(TRIM(m.motor_nopol))
        ) AS total_servis,

        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN 'ARMADA_KORPORAT' ELSE 'REGULER' END AS jenis_armada,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(COALESCE(p.pelanggan_tipe, 'Individu')) AS tipe_pelanggan,
        COALESCE(p.pelanggan_tipe, 'Individu') AS pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak
      FROM "MOTOR" m
      JOIN ${customerTable} p ON p.pelanggan_id = m.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      ORDER BY m.motor_nopol ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createVehicle(data) {
    const nopol = String(data.motor_nopol || data.plat_nomor)
      .trim()
      .toUpperCase();
    const pelangganId = String(data.pelanggan_id).trim();
    const merek = String(data.motor_merek || data.motor_merk || data.merk).trim();
    const tipe = String(data.motor_tipe || data.tipe).trim();
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = String(data.motor_warna || data.warna || 'Hitam').trim();
    const noRangka = String(data.motor_no_rangka || data.nomor_rangka)
      .trim()
      .toUpperCase();
    const noMesin = String(
      data.motor_no_mesin || data.nomor_mesin || `MSN-${Date.now().toString().slice(-6)}`
    )
      .trim()
      .toUpperCase();
    const km = Number(data.motor_kilometer || data.kilometer_terakhir || 0);

    return await db.withTransaction(async (client) => {
      const insertMotorSql = `
        INSERT INTO "MOTOR" (
          motor_nopol, pelanggan_id, motor_no_rangka, motor_no_mesin,
          motor_merek, motor_tipe, motor_tahun, motor_warna, motor_kilometer
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      `;
      const { rows } = await client.query(insertMotorSql, [
        nopol,
        pelangganId,
        noRangka,
        noMesin,
        merek,
        tipe,
        tahun,
        warna,
        km,
      ]);

      const rwSeq = await client.query(`
        SELECT COALESCE(
          MAX(NULLIF(REGEXP_REPLACE(riwayat_id, '[^0-9]', '', 'g'), '')::INT),
          20
        ) + 1 AS next_seq
        FROM "RIWAYAT_KEPEMILIKAN";
      `);
      const riwayatId = `RW${String(rwSeq.rows[0].next_seq).padStart(3, '0')}`;

      await client.query(
        `
          INSERT INTO "RIWAYAT_KEPEMILIKAN" (
            riwayat_id, motor_nopol, pelanggan_id, tanggal_mulai, tanggal_selesai
          ) VALUES ($1, $2, $3, CURRENT_DATE, NULL)
          ON CONFLICT (riwayat_id) DO NOTHING;
        `,
        [riwayatId, nopol, pelangganId]
      );

      return rows[0];
    });
  }

  async updateVehicle(id, data) {
    const nopolLama = String(id).trim().toUpperCase();

    const nopolBaru = String(
      data.motor_nopol || data.plat_nomor || id
    )
      .trim()
      .toUpperCase();

    const pelangganId = String(data.pelanggan_id).trim();
    const merek = String(
      data.motor_merek || data.motor_merk || data.merk
    ).trim();
    const tipe = String(data.motor_tipe || data.tipe).trim();
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = String(
      data.motor_warna || data.warna || 'Hitam'
    ).trim();
    const noRangka = String(
      data.motor_no_rangka || data.nomor_rangka
    )
      .trim()
      .toUpperCase();
    const noMesin = String(
      data.motor_no_mesin || data.nomor_mesin || '-'
    )
      .trim()
      .toUpperCase();
    const km = Number(
      data.motor_kilometer ?? data.kilometer_terakhir ?? 0
    );

    return await db.withTransaction(async (client) => {
      // Pastikan motor lama ditemukan dan kunci barisnya.
      const existingResult = await client.query(
        `
          SELECT motor_nopol
          FROM "MOTOR"
          WHERE UPPER(TRIM(motor_nopol)) = $1
          FOR UPDATE;
        `,
        [nopolLama]
      );

      if (existingResult.rowCount === 0) {
        return null;
      }

      const nopolAsli = existingResult.rows[0].motor_nopol;

      // Jika plat berubah, pastikan plat baru belum digunakan.
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
          const error = new Error(
            `Plat nomor ${nopolBaru} sudah digunakan oleh motor lain.`
          );
          error.code = 'DUPLICATE_VEHICLE_PLATE';
          error.status = 409;
          throw error;
        }
      }

      // Perbarui data motor, termasuk primary key jika plat berubah.
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

      // Sinkronkan foreign key pada riwayat kepemilikan.
      if (nopolBaru !== nopolAsli) {
        await client.query(
          `
            UPDATE "RIWAYAT_KEPEMILIKAN"
            SET motor_nopol = $1
            WHERE motor_nopol = $2;
          `,
          [nopolBaru, nopolAsli]
        );
      }

      return updateResult.rows[0] || null;
    });
  }
  
  async deleteVehicle(id) {
    const nopol = String(id).trim().toUpperCase();

    return await db.withTransaction(async (client) => {
      // 1. Pastikan motor tersedia dan kunci barisnya.
      const motorResult = await client.query(
        `
          SELECT motor_nopol
          FROM "MOTOR"
          WHERE UPPER(TRIM(motor_nopol)) = $1
          FOR UPDATE;
        `,
        [nopol]
      );

      if (motorResult.rows.length === 0) {
        return null;
      }

      // Gunakan nopol asli dari database.
      const actualNopol = motorResult.rows[0].motor_nopol;

      // 2. Hapus seluruh riwayat kepemilikan motor.
      const historyResult = await client.query(
        `
          DELETE FROM "RIWAYAT_KEPEMILIKAN"
          WHERE motor_nopol = $1
          RETURNING riwayat_id, motor_nopol;
        `,
        [actualNopol]
      );

      // 3. Pastikan tidak ada riwayat yang tersisa.
      const remainingResult = await client.query(
        `
          SELECT riwayat_id, motor_nopol
          FROM "RIWAYAT_KEPEMILIKAN"
          WHERE motor_nopol = $1;
        `,
        [actualNopol]
      );

      if (remainingResult.rowCount > 0) {
        const error = new Error(
          `Masih terdapat ${remainingResult.rowCount} riwayat kepemilikan untuk motor ${actualNopol}.`
        );
        error.code = 'VEHICLE_HISTORY_REMAINS';
        error.details = remainingResult.rows;
        throw error;
      }

      // 4. Hapus motor setelah riwayat berhasil dibersihkan.
      const motorDeleteResult = await client.query(
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

      return motorDeleteResult.rows[0] || null;
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
    const kode = String(data.jasa_kode || data.kode_jasa)
      .trim()
      .toUpperCase();
    const uraian = String(
      data.jasa_uraian || data.jasa_nama || data.nama_jasa
    ).trim();
    const biaya = Math.round(
      Number(
        data.jasa_biaya !== undefined
          ? data.jasa_biaya
          : data.jasa_harga !== undefined
          ? data.jasa_harga
          : data.harga_jasa || 0
      )
    );

    const sql = `
      INSERT INTO "JASA_SERVIS" (
        jasa_kode,
        jasa_uraian,
        jasa_biaya
      ) VALUES ($1, $2, $3)
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
  }

  async updateService(id, data) {
    const kode = String(id).trim().toUpperCase();
    const uraian = String(
      data.jasa_uraian || data.jasa_nama || data.nama_jasa
    ).trim();
    const biaya = Math.round(
      Number(
        data.jasa_biaya !== undefined
          ? data.jasa_biaya
          : data.jasa_harga !== undefined
          ? data.jasa_harga
          : data.harga_jasa || 0
      )
    );

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
    const sql = `
      DELETE FROM "JASA_SERVIS"
      WHERE UPPER(jasa_kode) = $1
      RETURNING jasa_kode AS id, jasa_kode AS kode_jasa, jasa_uraian AS nama_jasa;
    `;
    const { rows } = await db.query(sql, [String(id).trim().toUpperCase()]);
    return rows[0] || null;
  }

  // ==========================================================================
  // 4. MASTER SUKU CADANG & STOK CABANG ("SUKU_CADANG", "STOK_CABANG", "SUPPLIER_SUKU_CADANG")
  // ==========================================================================
  async getAllSpareparts(cabangKode = 'CB001') {
    const branch = String(cabangKode || 'CB001').trim().toUpperCase();
    const sql = `
      SELECT
        sc.suku_cadang_kode AS id,
        sc.suku_cadang_kode,
        sc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        'PCS'::VARCHAR AS satuan,
        sc.suku_cadang_harga_satuan AS harga_jual,
        sc.suku_cadang_harga_satuan,
        COALESCE(st.cabang_kode, $1) AS cabang_kode,
        COALESCE(st.stok_qty, 0) AS stok_saat_ini,
        COALESCE(st.stok_qty, 0) AS stok_qty,
        COALESCE(st.stok_qty, 0) AS stok_jumlah,
        COALESCE(st.stok_minimum, 5) AS stok_minimum,
        ssc.supplier_id,
        sup.supplier_id AS kode_supplier,
        sup.supplier_nama AS nama_supplier,
        sup.supplier_telp AS telepon_supplier,
        CASE
          WHEN COALESCE(st.stok_qty, 0) = 0 THEN 'HABIS'
          WHEN COALESCE(st.stok_qty, 0) < COALESCE(st.stok_minimum, 5) THEN 'KRITIS'
          ELSE 'AMAN'
        END AS status_stok
      FROM "SUKU_CADANG" sc
      LEFT JOIN "STOK_CABANG" st
        ON st.suku_cadang_kode = sc.suku_cadang_kode AND st.cabang_kode = $1
      LEFT JOIN LATERAL (
        SELECT s1.supplier_id
        FROM "SUPPLIER_SUKU_CADANG" s1
        WHERE s1.suku_cadang_kode = sc.suku_cadang_kode
        ORDER BY s1.supplier_id ASC
        LIMIT 1
      ) ssc ON TRUE
      LEFT JOIN "SUPPLIER" sup ON sup.supplier_id = ssc.supplier_id
      ORDER BY sc.suku_cadang_kode ASC;
    `;
    const { rows } = await db.query(sql, [branch]);
    return rows;
  }

  async createSparepart(data) {
    const kode = String(data.suku_cadang_kode || data.kode_sku)
      .trim()
      .toUpperCase();
    const nama = String(data.suku_cadang_nama || data.nama_part).trim();
    const hargaSatuan = Math.round(
      Number(
        data.suku_cadang_harga_satuan !== undefined
          ? data.suku_cadang_harga_satuan
          : data.harga_jual || 0
      )
    );
    const cabangKode = String(data.cabang_kode || 'CB001').trim().toUpperCase();
    const stokQty = Math.round(
      Number(
        data.stok_qty !== undefined
          ? data.stok_qty
          : data.stok_jumlah !== undefined
          ? data.stok_jumlah
          : data.stok_saat_ini !== undefined
          ? data.stok_saat_ini
          : 10
      )
    );
    const stokMin = Math.round(Number(data.stok_minimum || 5));
    const supplierId = data.supplier_id ? String(data.supplier_id).trim() : null;

    return await db.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO "SUKU_CADANG" (
            suku_cadang_kode, suku_cadang_nama, suku_cadang_harga_satuan
          ) VALUES ($1, $2, $3);
        `,
        [kode, nama, hargaSatuan]
      );

      await client.query(
        `
          INSERT INTO "STOK_CABANG" (
            cabang_kode, suku_cadang_kode, stok_qty, stok_minimum
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (cabang_kode, suku_cadang_kode)
          DO UPDATE SET stok_qty = EXCLUDED.stok_qty, stok_minimum = EXCLUDED.stok_minimum;
        `,
        [cabangKode, kode, stokQty, stokMin]
      );

      if (supplierId) {
        await client.query(
          `
            INSERT INTO "SUPPLIER_SUKU_CADANG" (
              supplier_id,
              suku_cadang_kode
            ) VALUES ($1, $2)
            ON CONFLICT (supplier_id, suku_cadang_kode) DO NOTHING;
          `,
          [supplierId, kode]
        );
      }

      return {
        id: kode,
        suku_cadang_kode: kode,
        kode_sku: kode,
        suku_cadang_nama: nama,
        nama_part: nama,
        satuan: 'PCS',
        harga_jual: hargaSatuan,
        suku_cadang_harga_satuan: hargaSatuan,
        cabang_kode: cabangKode,
        stok_saat_ini: stokQty,
        stok_qty: stokQty,
        stok_minimum: stokMin,
      };
    });
  }

  async updateSparepart(id, data) {
    const kode = String(id).trim().toUpperCase();
    const nama = String(data.suku_cadang_nama || data.nama_part).trim();
    const hargaSatuan = Math.round(
      Number(
        data.suku_cadang_harga_satuan !== undefined
          ? data.suku_cadang_harga_satuan
          : data.harga_jual || 0
      )
    );
    const cabangKode = String(data.cabang_kode || 'CB001').trim().toUpperCase();
    const stokQty = Math.round(
      Number(
        data.stok_qty !== undefined
          ? data.stok_qty
          : data.stok_jumlah !== undefined
          ? data.stok_jumlah
          : data.stok_saat_ini !== undefined
          ? data.stok_saat_ini
          : 0
      )
    );
    const stokMin = Math.round(Number(data.stok_minimum || 5));

    return await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `
          UPDATE "SUKU_CADANG"
          SET
            suku_cadang_nama = $1,
            suku_cadang_harga_satuan = $2
          WHERE UPPER(suku_cadang_kode) = $3
          RETURNING suku_cadang_kode, suku_cadang_nama, suku_cadang_harga_satuan;
        `,
        [nama, hargaSatuan, kode]
      );

      if (!rows[0]) {
        return null;
      }

      await client.query(
        `
          INSERT INTO "STOK_CABANG" (
            cabang_kode, suku_cadang_kode, stok_qty, stok_minimum
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (cabang_kode, suku_cadang_kode)
          DO UPDATE SET stok_qty = EXCLUDED.stok_qty, stok_minimum = EXCLUDED.stok_minimum;
        `,
        [cabangKode, rows[0].suku_cadang_kode, stokQty, stokMin]
      );

      return {
        id: rows[0].suku_cadang_kode,
        suku_cadang_kode: rows[0].suku_cadang_kode,
        kode_sku: rows[0].suku_cadang_kode,
        suku_cadang_nama: rows[0].suku_cadang_nama,
        nama_part: rows[0].suku_cadang_nama,
        satuan: 'PCS',
        harga_jual: rows[0].suku_cadang_harga_satuan,
        suku_cadang_harga_satuan: rows[0].suku_cadang_harga_satuan,
        cabang_kode: cabangKode,
        stok_saat_ini: stokQty,
        stok_qty: stokQty,
        stok_minimum: stokMin,
      };
    });
  }

  
  async deleteSparepart(id) {
    const kode = String(id).trim().toUpperCase();

    return await db.withTransaction(async (client) => {
      // 1. Pastikan sparepart ditemukan dan kunci barisnya.
      const sparepartResult = await client.query(
        `
          SELECT suku_cadang_kode, suku_cadang_nama
          FROM "SUKU_CADANG"
          WHERE UPPER(suku_cadang_kode) = $1
          FOR UPDATE;
        `,
        [kode]
      );

      if (sparepartResult.rowCount === 0) {
        return null;
      }

      const sparepart = sparepartResult.rows[0];
      const kodeAsli = sparepart.suku_cadang_kode;

      // 2. Hapus relasi supplier untuk SKU ini.
      await client.query(
        `
          DELETE FROM "SUPPLIER_SUKU_CADANG"
          WHERE suku_cadang_kode = $1;
        `,
        [kodeAsli]
      );

      // 3. Hapus stok cabang untuk SKU ini.
      // Jika masih direferensikan tabel transaksi lain, query berikutnya
      // akan gagal dan seluruh transaksi di-rollback.
      await client.query(
        `
          DELETE FROM "STOK_CABANG"
          WHERE suku_cadang_kode = $1;
        `,
        [kodeAsli]
      );

      // 4. Hapus data master sparepart.
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
  // 5. MASTER SUPPLIER ("SUPPLIER" & "SUPPLIER_SUKU_CADANG")
  // ==========================================================================
  async getAllSuppliers() {
    const sql = `
      SELECT
        s.supplier_id AS id,
        s.supplier_id,
        s.supplier_id AS kode_supplier,
        s.supplier_nama AS nama_supplier,
        s.supplier_nama,
        'Account Manager'::VARCHAR AS kontak_person,
        s.supplier_telp AS telepon,
        s.supplier_telp AS supplier_kontak,
        s.supplier_telp,
        s.supplier_alamat AS alamat,
        s.supplier_alamat,
        'Palangka Raya'::VARCHAR AS kota,
        COUNT(ssc.suku_cadang_kode) AS jumlah_sku
      FROM "SUPPLIER" s
      LEFT JOIN "SUPPLIER_SUKU_CADANG" ssc ON ssc.supplier_id = s.supplier_id
      GROUP BY s.supplier_id, s.supplier_nama, s.supplier_telp, s.supplier_alamat
      ORDER BY s.supplier_id ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createSupplier(data) {
    const supplierId = String(data.supplier_id || data.kode_supplier)
      .trim()
      .toUpperCase();
    const nama = String(data.supplier_nama || data.nama_supplier).trim();
    const telp = String(
      data.supplier_telp || data.supplier_kontak || data.telepon
    ).trim();
    const alamat = String(
      data.supplier_alamat || data.alamat || 'Palangka Raya'
    ).trim();

    const sql = `
      INSERT INTO "SUPPLIER" (
        supplier_id, supplier_nama, supplier_telp, supplier_alamat
      ) VALUES ($1, $2, $3, $4)
      RETURNING
        supplier_id AS id,
        supplier_id,
        supplier_id AS kode_supplier,
        supplier_nama AS nama_supplier,
        supplier_nama,
        'Account Manager'::VARCHAR AS kontak_person,
        supplier_telp AS telepon,
        supplier_telp AS supplier_kontak,
        supplier_telp,
        supplier_alamat AS alamat,
        supplier_alamat,
        'Palangka Raya'::VARCHAR AS kota;
    `;
    const { rows } = await db.query(sql, [supplierId, nama, telp, alamat]);
    return rows[0];
  }

  async updateSupplier(id, data) {
    const supplierId = String(id).trim().toUpperCase();
    const nama = String(data.supplier_nama || data.nama_supplier).trim();
    const telp = String(
      data.supplier_telp || data.supplier_kontak || data.telepon
    ).trim();
    const alamat = String(
      data.supplier_alamat || data.alamat || 'Palangka Raya'
    ).trim();

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
        'Account Manager'::VARCHAR AS kontak_person,
        supplier_telp AS telepon,
        supplier_telp AS supplier_kontak,
        supplier_telp,
        supplier_alamat AS alamat,
        supplier_alamat;
    `;
    const { rows } = await db.query(sql, [nama, telp, alamat, supplierId]);
    return rows[0] || null;
  }

  async deleteSupplier(id) {
    const sql = `
      DELETE FROM "SUPPLIER"
      WHERE UPPER(supplier_id) = $1
      RETURNING supplier_id AS id, supplier_id AS kode_supplier, supplier_nama AS nama_supplier;
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
