const db = require('../config/db');

class RegistryRepository {
  // ==========================================================================
  // 1. "PELANGGAN" (CUSTOMERS: Individu & Korporat)
  // ==========================================================================
  async getAllCustomers(tipeFilter = null) {
    const params = [];
    let whereClause = '';
    if (tipeFilter && ['INDIVIDU', 'KORPORAT'].includes(String(tipeFilter).toUpperCase())) {
      const normalized = String(tipeFilter).toUpperCase() === 'KORPORAT' ? 'Korporat' : 'Individu';
      params.push(normalized);
      whereClause = `WHERE p.pelanggan_tipe = $1`;
    }

    const sql = `
      SELECT
        p.pelanggan_id AS id,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        p.pelanggan_telp AS telepon,
        p.pelanggan_telp,
        p.pelanggan_jenis_identitas,
        p.pelanggan_no_identitas,
        p.pelanggan_no_identitas AS npwp,
        p.pelanggan_alamat AS alamat,
        p.pelanggan_alamat,
        p.pelanggan_cab_favorit,
        p.mekanik_id_pilihan,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        p.pelanggan_nama AS pic_nama,
        p.plafon_kredit,
        p.sisa_plafon,
        (
          SELECT COUNT(*)
          FROM "MOTOR" m
          WHERE m.pelanggan_id = p.pelanggan_id
        ) AS jumlah_motor,
        (
          SELECT COUNT(*)
          FROM "KONTRAK_KORPORAT" kk
          WHERE kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
        ) AS kontrak_aktif
      FROM "PELANGGAN" p
      ${whereClause}
      ORDER BY p.pelanggan_id ASC;
    `;
    const { rows } = await db.query(sql, params);
    return rows;
  }

  async createCustomer(data) {
    const rawId = data.pelanggan_id || data.kode_pelanggan || `PL${Date.now().toString().slice(-4)}`;
    const pelangganId = String(rawId).trim().toUpperCase().slice(0, 10);
    const isKorporat =
      String(data.pelanggan_tipe || data.tipe_pelanggan || '').toUpperCase() === 'KORPORAT';
    const tipe = isKorporat ? 'Korporat' : 'Individu';
    const plafon = isKorporat ? Math.round(Number(data.plafon_kredit || 0)) : 0;
    const sisa = isKorporat
      ? data.sisa_plafon !== undefined
        ? Math.round(Number(data.sisa_plafon))
        : plafon
      : 0;
    const nama = data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan;
    const telp = data.pelanggan_telp || data.telepon;
    const alamat = data.pelanggan_alamat || data.alamat || 'Palangka Raya';
    const jenisIdentitas =
      data.pelanggan_jenis_identitas || (isKorporat ? 'NPWP' : 'KTP');
    const noIdentitas =
      data.pelanggan_no_identitas ||
      data.npwp ||
      `6271${Date.now().toString().slice(-12)}`;
    const cabFavorit = data.pelanggan_cab_favorit || 'CB001';
    const mekPilihan = data.mekanik_id_pilihan || 'PG003';

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
        pelanggan_telp AS telepon,
        pelanggan_telp,
        pelanggan_jenis_identitas,
        pelanggan_no_identitas,
        pelanggan_no_identitas AS npwp,
        pelanggan_alamat AS alamat,
        pelanggan_alamat,
        pelanggan_cab_favorit,
        mekanik_id_pilihan,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE WHEN pelanggan_tipe = 'Korporat' THEN pelanggan_nama ELSE NULL END AS nama_perusahaan,
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
      mekPilihan,
      tipe,
      plafon,
      sisa,
    ];
    const { rows } = await db.query(sql, params);
    return rows[0];
  }

  async updateCustomer(id, data) {
    const isKorporat =
      String(data.pelanggan_tipe || data.tipe_pelanggan || '').toUpperCase() === 'KORPORAT';
    const tipe = isKorporat ? 'Korporat' : 'Individu';
    const plafon = isKorporat ? Math.round(Number(data.plafon_kredit || 0)) : 0;
    const sisa = isKorporat
      ? Math.min(plafon, Math.round(Number(data.sisa_plafon !== undefined ? data.sisa_plafon : plafon)))
      : 0;
    const nama = data.pelanggan_nama || data.nama_perusahaan || data.nama_pelanggan;
    const telp = data.pelanggan_telp || data.telepon;
    const alamat = data.pelanggan_alamat || data.alamat || 'Palangka Raya';
    const jenisIdentitas =
      data.pelanggan_jenis_identitas || (isKorporat ? 'NPWP' : 'KTP');
    const noIdentitas = data.pelanggan_no_identitas || data.npwp || null;

    const sql = `
      UPDATE "PELANGGAN"
      SET
        pelanggan_nama = $1,
        pelanggan_telp = $2,
        pelanggan_alamat = $3,
        pelanggan_tipe = $4,
        pelanggan_jenis_identitas = COALESCE($5, pelanggan_jenis_identitas),
        pelanggan_no_identitas = COALESCE($6, pelanggan_no_identitas),
        plafon_kredit = $7,
        sisa_plafon = $8
      WHERE pelanggan_id = $9
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama,
        pelanggan_telp AS telepon,
        pelanggan_telp,
        pelanggan_jenis_identitas,
        pelanggan_no_identitas,
        pelanggan_no_identitas AS npwp,
        pelanggan_alamat AS alamat,
        pelanggan_alamat,
        UPPER(pelanggan_tipe) AS tipe_pelanggan,
        pelanggan_tipe,
        CASE WHEN pelanggan_tipe = 'Korporat' THEN pelanggan_nama ELSE NULL END AS nama_perusahaan,
        plafon_kredit,
        sisa_plafon;
    `;
    const params = [
      nama,
      telp,
      alamat,
      tipe,
      jenisIdentitas,
      noIdentitas,
      plafon,
      sisa,
      String(id).trim(),
    ];
    const { rows } = await db.query(sql, params);
    return rows[0] || null;
  }

  async deleteCustomer(id) {
    const sql = `
      DELETE FROM "PELANGGAN"
      WHERE pelanggan_id = $1
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan;
    `;
    const { rows } = await db.query(sql, [String(id).trim()]);
    return rows[0] || null;
  }

  // ==========================================================================
  // 2. "MOTOR" & "RIWAYAT_KEPEMILIKAN" (VEHICLES)
  // ==========================================================================
  async getAllVehicles() {
    const sql = `
      SELECT
        m.motor_nopol AS id,
        m.motor_nopol,
        m.motor_nopol AS plat_nomor,
        m.pelanggan_id,
        m.motor_merek AS merk,
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
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        (
          SELECT COUNT(*)
          FROM "WORK_ORDER" wo
          WHERE wo.motor_nopol = m.motor_nopol
        ) AS total_servis
      FROM "MOTOR" m
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      ORDER BY m.motor_nopol ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createVehicle(data) {
    const nopol = String(data.motor_nopol || data.plat_nomor || '')
      .replace(/\s+/g, '')
      .toUpperCase()
      .slice(0, 15);
    const pelangganId = String(data.pelanggan_id || 'PL001').trim();
    const merek = data.motor_merek || data.motor_merk || data.merk;
    const tipe = data.motor_tipe || data.tipe;
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = data.motor_warna || data.warna || 'Hitam';
    const kilometer = Number(data.motor_kilometer !== undefined ? data.motor_kilometer : data.kilometer_terakhir || 0);
    const noRangka = String(data.motor_no_rangka || data.nomor_rangka || `MH1${nopol}`)
      .trim()
      .toUpperCase()
      .slice(0, 50);
    const noMesin = String(data.motor_no_mesin || data.nomor_mesin || `MSN${nopol}`)
      .trim()
      .toUpperCase()
      .slice(0, 50);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO "MOTOR" (
            motor_nopol, pelanggan_id, motor_no_rangka, motor_no_mesin,
            motor_merek, motor_tipe, motor_tahun, motor_warna, motor_kilometer
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `,
        [nopol, pelangganId, noRangka, noMesin, merek, tipe, tahun, warna, kilometer]
      );

      const seqRw = await client.query(`
        SELECT COALESCE(
          MAX(NULLIF(REGEXP_REPLACE(riwayat_id, '[^0-9]', '', 'g'), '')::INT),
          14
        ) + 1 AS next_seq
        FROM "RIWAYAT_KEPEMILIKAN";
      `);
      const rwId = `RW${String(seqRw.rows[0].next_seq).padStart(3, '0')}`;

      await client.query(
        `
          INSERT INTO "RIWAYAT_KEPEMILIKAN" (
            riwayat_id, motor_nopol, pelanggan_id, tanggal_mulai, tanggal_selesai
          ) VALUES ($1, $2, $3, CURRENT_DATE, NULL);
        `,
        [rwId, nopol, pelangganId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const all = await this.getAllVehicles();
    return all.find((v) => v.motor_nopol === nopol) || { id: nopol, motor_nopol: nopol, plat_nomor: nopol };
  }

  async updateVehicle(id, data) {
    const currentNopol = String(id).trim();
    const pelangganId = String(data.pelanggan_id || 'PL001').trim();
    const merek = data.motor_merek || data.motor_merk || data.merk;
    const tipe = data.motor_tipe || data.tipe;
    const tahun = Number(data.motor_tahun || data.tahun || 2024);
    const warna = data.motor_warna || data.warna || 'Hitam';
    const kilometer = Number(data.motor_kilometer !== undefined ? data.motor_kilometer : data.kilometer_terakhir || 0);
    const noRangka = String(data.motor_no_rangka || data.nomor_rangka || '').trim().toUpperCase();
    const noMesin = data.motor_no_mesin || data.nomor_mesin || null;

    const sql = `
      UPDATE "MOTOR"
      SET
        pelanggan_id = $1,
        motor_merek = $2,
        motor_tipe = $3,
        motor_tahun = $4,
        motor_warna = $5,
        motor_kilometer = $6,
        motor_no_rangka = COALESCE(NULLIF($7, ''), motor_no_rangka),
        motor_no_mesin = COALESCE(NULLIF($8, ''), motor_no_mesin)
      WHERE motor_nopol = $9
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [
      pelangganId,
      merek,
      tipe,
      tahun,
      warna,
      kilometer,
      noRangka,
      noMesin,
      currentNopol,
    ]);

    if (!rows[0]) return null;
    const all = await this.getAllVehicles();
    return all.find((v) => v.motor_nopol === currentNopol) || rows[0];
  }

  async deleteVehicle(id) {
    const nopol = String(id).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "RIWAYAT_KEPEMILIKAN" WHERE motor_nopol = $1`, [nopol]);
      const { rows } = await client.query(
        `DELETE FROM "MOTOR" WHERE motor_nopol = $1 RETURNING motor_nopol AS id, motor_nopol, motor_nopol AS plat_nomor;`,
        [nopol]
      );
      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // 3. "JASA_SERVIS" (SERVICES CATALOG)
  // ==========================================================================
  async getAllServices() {
    const sql = `
      SELECT
        js.jasa_kode AS id,
        js.jasa_kode,
        js.jasa_kode AS kode_jasa,
        js.jasa_uraian AS nama_jasa,
        js.jasa_uraian,
        'SERVIS BENGKEL'::VARCHAR AS kategori,
        js.jasa_biaya AS harga_jasa,
        js.jasa_biaya,
        45 AS estimasi_menit,
        js.jasa_uraian AS deskripsi,
        (SELECT COUNT(*) FROM "WO_JASA" wj WHERE wj.jasa_kode = js.jasa_kode) AS frekuensi_penggunaan
      FROM "JASA_SERVIS" js
      ORDER BY js.jasa_kode ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createService(data) {
    const rawCode = data.jasa_kode || data.kode_jasa || `JS${Date.now().toString().slice(-4)}`;
    const jasaKode = String(rawCode).trim().toUpperCase().slice(0, 10);
    const jasaUraian = data.jasa_uraian || data.jasa_nama || data.nama_jasa;
    const jasaBiaya = Math.round(
      Number(
        data.jasa_biaya !== undefined
          ? data.jasa_biaya
          : data.jasa_harga !== undefined
          ? data.jasa_harga
          : data.harga_jasa || 0
      )
    );

    const sql = `
      INSERT INTO "JASA_SERVIS" (jasa_kode, jasa_uraian, jasa_biaya)
      VALUES ($1, $2, $3)
      RETURNING
        jasa_kode AS id,
        jasa_kode,
        jasa_kode AS kode_jasa,
        jasa_uraian AS nama_jasa,
        jasa_uraian,
        'SERVIS BENGKEL'::VARCHAR AS kategori,
        jasa_biaya AS harga_jasa,
        jasa_biaya,
        45 AS estimasi_menit;
    `;
    const { rows } = await db.query(sql, [jasaKode, jasaUraian, jasaBiaya]);
    return rows[0];
  }

  async updateService(id, data) {
    const jasaUraian = data.jasa_uraian || data.jasa_nama || data.nama_jasa;
    const jasaBiaya = Math.round(
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
      WHERE jasa_kode = $3
      RETURNING
        jasa_kode AS id,
        jasa_kode,
        jasa_kode AS kode_jasa,
        jasa_uraian AS nama_jasa,
        jasa_uraian,
        'SERVIS BENGKEL'::VARCHAR AS kategori,
        jasa_biaya AS harga_jasa,
        jasa_biaya,
        45 AS estimasi_menit;
    `;
    const { rows } = await db.query(sql, [jasaUraian, jasaBiaya, String(id).trim()]);
    return rows[0] || null;
  }

  async deleteService(id) {
    const sql = `
      DELETE FROM "JASA_SERVIS"
      WHERE jasa_kode = $1
      RETURNING jasa_kode AS id, jasa_kode, jasa_kode AS kode_jasa, jasa_uraian AS nama_jasa;
    `;
    const { rows } = await db.query(sql, [String(id).trim()]);
    return rows[0] || null;
  }

  // ==========================================================================
  // 4. "SUKU_CADANG", "STOK_CABANG", & "SUPPLIER_SUKU_CADANG" (SPAREPARTS)
  // ==========================================================================
  async getAllSpareparts(cabangKode = null) {
    const targetCabang = cabangKode || 'CB001';
    const sql = `
      SELECT
        sc.suku_cadang_kode AS id,
        sc.suku_cadang_kode,
        sc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        'SUKU CADANG'::VARCHAR AS kategori,
        'PCS'::VARCHAR AS satuan,
        ROUND(sc.suku_cadang_harga_satuan * 0.75, 0) AS harga_beli,
        sc.suku_cadang_harga_satuan AS harga_jual,
        sc.suku_cadang_harga_satuan,
        COALESCE(st.cabang_kode, $1) AS cabang_kode,
        COALESCE(cb.cabang_nama, 'Kalawa Service Pahandut') AS cabang_nama,
        COALESCE(st.stok_qty, 0) AS stok_saat_ini,
        COALESCE(st.stok_qty, 0) AS stok_qty,
        COALESCE(st.stok_minimum, 2) AS stok_minimum,
        ('GUDANG-' || COALESCE(st.cabang_kode, $1)) AS lokasi_rak,
        COALESCE(sup.supplier_id, 'SP001') AS supplier_id,
        COALESCE(sup.supplier_id, 'SP001') AS kode_supplier,
        COALESCE(sup.supplier_nama, 'PT Sumber Motor Jaya') AS nama_supplier,
        COALESCE(sup.supplier_telp, '-') AS telepon_supplier,
        CASE
          WHEN COALESCE(st.stok_qty, 0) = 0 THEN 'HABIS'
          WHEN COALESCE(st.stok_qty, 0) <= COALESCE(st.stok_minimum, 2) THEN 'KRITIS'
          ELSE 'AMAN'
        END AS status_inventori,
        (
          SELECT COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'cabang_kode', st2.cabang_kode,
                'cabang_nama', cb2.cabang_nama,
                'stok_qty', st2.stok_qty,
                'stok_minimum', st2.stok_minimum
              ) ORDER BY st2.cabang_kode ASC
            ),
            '[]'::JSON
          )
          FROM "STOK_CABANG" st2
          JOIN "CABANG" cb2 ON cb2.cabang_kode = st2.cabang_kode
          WHERE st2.suku_cadang_kode = sc.suku_cadang_kode
        ) AS stok_per_cabang
      FROM "SUKU_CADANG" sc
      LEFT JOIN LATERAL (
        SELECT s_st.*
        FROM "STOK_CABANG" s_st
        WHERE s_st.suku_cadang_kode = sc.suku_cadang_kode
        ORDER BY CASE WHEN s_st.cabang_kode = $1 THEN 0 ELSE 1 END, s_st.cabang_kode ASC
        LIMIT 1
      ) st ON TRUE
      LEFT JOIN "CABANG" cb ON cb.cabang_kode = st.cabang_kode
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
    const { rows } = await db.query(sql, [targetCabang]);
    return rows;
  }

  async createSparepart(data) {
    const rawCode = data.suku_cadang_kode || data.kode_sku || `SC${Date.now().toString().slice(-4)}`;
    const scKode = String(rawCode).trim().toUpperCase().slice(0, 10);
    const scNama = data.suku_cadang_nama || data.nama_part;
    const hargaSatuan = Math.round(
      Number(
        data.suku_cadang_harga_satuan !== undefined
          ? data.suku_cadang_harga_satuan
          : data.harga_jual || 0
      )
    );
    const stokQty = Math.round(
      Number(data.stok_qty !== undefined ? data.stok_qty : data.stok_saat_ini || 0)
    );
    const stokMin = Math.round(
      Number(data.stok_minimum !== undefined ? data.stok_minimum : 3)
    );
    const cabangKode = String(data.cabang_kode || 'CB001').trim();
    const supplierId = String(data.supplier_id || 'SP001').trim();

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO "SUKU_CADANG" (
            suku_cadang_kode, suku_cadang_nama, suku_cadang_harga_satuan
          ) VALUES ($1, $2, $3);
        `,
        [scKode, scNama, hargaSatuan]
      );

      await client.query(
        `
          INSERT INTO "STOK_CABANG" (cabang_kode, suku_cadang_kode, stok_qty, stok_minimum)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (cabang_kode, suku_cadang_kode)
          DO UPDATE SET stok_qty = EXCLUDED.stok_qty, stok_minimum = EXCLUDED.stok_minimum;
        `,
        [cabangKode, scKode, stokQty, stokMin]
      );

      await client.query(
        `
          INSERT INTO "SUPPLIER_SUKU_CADANG" (supplier_id, suku_cadang_kode)
          VALUES ($1, $2)
          ON CONFLICT (supplier_id, suku_cadang_kode) DO NOTHING;
        `,
        [supplierId, scKode]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const parts = await this.getAllSpareparts(cabangKode);
    return parts.find((p) => p.suku_cadang_kode === scKode) || { id: scKode, suku_cadang_kode: scKode };
  }

  async updateSparepart(id, data) {
    const scKode = String(id).trim();
    const scNama = data.suku_cadang_nama || data.nama_part;
    const hargaSatuan = Math.round(
      Number(
        data.suku_cadang_harga_satuan !== undefined
          ? data.suku_cadang_harga_satuan
          : data.harga_jual || 0
      )
    );
    const stokQty = Math.round(
      Number(data.stok_qty !== undefined ? data.stok_qty : data.stok_saat_ini || 0)
    );
    const stokMin = Math.round(
      Number(data.stok_minimum !== undefined ? data.stok_minimum : 3)
    );
    const cabangKode = String(data.cabang_kode || 'CB001').trim();
    const supplierId = data.supplier_id ? String(data.supplier_id).trim() : null;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `
          UPDATE "SUKU_CADANG"
          SET
            suku_cadang_nama = $1,
            suku_cadang_harga_satuan = $2
          WHERE suku_cadang_kode = $3
          RETURNING *;
        `,
        [scNama, hargaSatuan, scKode]
      );

      if (res.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
          INSERT INTO "STOK_CABANG" (cabang_kode, suku_cadang_kode, stok_qty, stok_minimum)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (cabang_kode, suku_cadang_kode)
          DO UPDATE SET stok_qty = EXCLUDED.stok_qty, stok_minimum = EXCLUDED.stok_minimum;
        `,
        [cabangKode, scKode, stokQty, stokMin]
      );

      if (supplierId) {
        await client.query(
          `
            INSERT INTO "SUPPLIER_SUKU_CADANG" (supplier_id, suku_cadang_kode)
            VALUES ($1, $2)
            ON CONFLICT (supplier_id, suku_cadang_kode) DO NOTHING;
          `,
          [supplierId, scKode]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const parts = await this.getAllSpareparts(cabangKode);
    return parts.find((p) => p.suku_cadang_kode === scKode) || null;
  }

  async deleteSparepart(id) {
    const scKode = String(id).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "STOK_CABANG" WHERE suku_cadang_kode = $1`, [scKode]);
      await client.query(`DELETE FROM "SUPPLIER_SUKU_CADANG" WHERE suku_cadang_kode = $1`, [scKode]);
      const { rows } = await client.query(
        `
          DELETE FROM "SUKU_CADANG"
          WHERE suku_cadang_kode = $1
          RETURNING suku_cadang_kode AS id, suku_cadang_kode, suku_cadang_kode AS kode_sku, suku_cadang_nama AS nama_part;
        `,
        [scKode]
      );
      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // 5. "SUPPLIER"
  // ==========================================================================
  async getAllSuppliers() {
    const sql = `
      SELECT
        sup.supplier_id AS id,
        sup.supplier_id,
        sup.supplier_id AS kode_supplier,
        sup.supplier_nama AS nama_supplier,
        sup.supplier_nama,
        'Account Manager'::VARCHAR AS kontak_person,
        sup.supplier_telp AS telepon,
        sup.supplier_telp,
        NULL::VARCHAR AS email,
        sup.supplier_alamat AS alamat,
        sup.supplier_alamat,
        'Palangka Raya'::VARCHAR AS kota,
        (
          SELECT COUNT(*)
          FROM "SUPPLIER_SUKU_CADANG" ssc
          WHERE ssc.supplier_id = sup.supplier_id
        ) AS jumlah_sku
      FROM "SUPPLIER" sup
      ORDER BY sup.supplier_id ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async createSupplier(data) {
    const rawId = data.supplier_id || data.kode_supplier || `SP${Date.now().toString().slice(-4)}`;
    const supId = String(rawId).trim().toUpperCase().slice(0, 10);
    const nama = data.supplier_nama || data.nama_supplier;
    const telp = data.supplier_telp || data.supplier_kontak || data.telepon;
    const alamat = data.supplier_alamat || data.alamat || 'Palangka Raya';

    const sql = `
      INSERT INTO "SUPPLIER" (supplier_id, supplier_nama, supplier_telp, supplier_alamat)
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
    const { rows } = await db.query(sql, [supId, nama, telp, alamat]);
    return rows[0];
  }

  async updateSupplier(id, data) {
    const nama = data.supplier_nama || data.nama_supplier;
    const telp = data.supplier_telp || data.supplier_kontak || data.telepon;
    const alamat = data.supplier_alamat || data.alamat || 'Palangka Raya';

    const sql = `
      UPDATE "SUPPLIER"
      SET
        supplier_nama = $1,
        supplier_telp = $2,
        supplier_alamat = $3
      WHERE supplier_id = $4
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
    const { rows } = await db.query(sql, [nama, telp, alamat, String(id).trim()]);
    return rows[0] || null;
  }

  async deleteSupplier(id) {
    const supId = String(id).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "SUPPLIER_SUKU_CADANG" WHERE supplier_id = $1`, [supId]);
      const { rows } = await client.query(
        `
          DELETE FROM "SUPPLIER"
          WHERE supplier_id = $1
          RETURNING supplier_id AS id, supplier_id, supplier_id AS kode_supplier, supplier_nama AS nama_supplier;
        `,
        [supId]
      );
      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // 6. HELPER LOOKUPS: "CABANG" & "MEKANIK" + "PEGAWAI"
  // ==========================================================================
  async getAllBranches() {
    const sql = `
      SELECT
        c.cabang_kode AS id,
        c.cabang_kode,
        c.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        c.cabang_alamat AS alamat,
        c.cabang_alamat,
        c.cabang_telp AS telepon,
        c.cabang_telp,
        c.jam_buka,
        c.jam_tutup,
        c.kapasitas_slot,
        'Palangka Raya'::VARCHAR AS kota
      FROM "CABANG" c
      ORDER BY c.cabang_kode ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  async getAllMechanics() {
    const sql = `
      SELECT
        m.mekanik_id AS id,
        m.mekanik_id,
        p.pegawai_id,
        p.pegawai_nama AS nama_lengkap,
        p.pegawai_nama,
        m.mekanik_keahlian,
        m.mekanik_keahlian AS mekanik_spesialisasi,
        p.pegawai_peran,
        p.cabang_kode AS cabang_id,
        p.cabang_kode,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama
      FROM "MEKANIK" m
      JOIN "PEGAWAI" p ON p.pegawai_id = m.mekanik_id
      JOIN "CABANG" c ON c.cabang_kode = p.cabang_kode
      ORDER BY m.mekanik_id ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }
}

module.exports = new RegistryRepository();
