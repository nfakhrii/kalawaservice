const db = require('../config/db');
const AppError = require('../utils/AppError');

class OperationsRepository {
  normalizeStatusFilter(statusFilter) {
    if (!statusFilter) return null;
    const s = String(statusFilter).trim().toLowerCase();
    if (
      [
        'antre',
        'dibuat',
        'dikerjakan',
        'diproses',
        'selesai',
        'dibayar',
        'dibatalkan',
        'lunas',
        'belum lunas',
      ].includes(s)
    ) {
      return s;
    }
    return null;
  }

  async getAllWorkOrders(statusFilter = null) {
    const normalized = this.normalizeStatusFilter(statusFilter);
    let whereClause = '';

    if (normalized === 'antre' || normalized === 'dibuat') {
      whereClause = `WHERE wo.work_status IN ('Dibuat', 'Antre')`;
    } else if (normalized === 'dikerjakan' || normalized === 'diproses') {
      whereClause = `WHERE wo.work_status IN ('Diproses', 'Dikerjakan')`;
    } else if (normalized === 'selesai' || normalized === 'belum lunas') {
      whereClause = `WHERE wo.work_status = 'Selesai' AND wo.pembayaran_status = 'Belum Lunas'`;
    } else if (normalized === 'dibayar' || normalized === 'lunas') {
      whereClause = `WHERE wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar'`;
    } else if (normalized === 'dibatalkan') {
      whereClause = `WHERE wo.work_status = 'Dibatalkan'`;
    }

    const sql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        wo.motor_nopol AS motor_id,
        wo.motor_nopol,
        wo.motor_nopol AS plat_nomor,
        wo.cabang_kode AS cabang_id,
        wo.cabang_kode,
        wo.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        wo.mekanik_id,
        COALESCE(pg_mek.pegawai_nama, '-') AS nama_mekanik,
        'Budi Santoso'::VARCHAR AS nama_kasir,
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_masuk,
        wo.work_tgl_selesai AS waktu_selesai,
        wo.work_tgl_selesai,
        m.motor_kilometer AS kilometer_masuk,
        m.motor_kilometer,
        wo.work_keluhan AS keluhan,
        wo.work_keluhan,
        wo.work_status,
        CASE
          WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
          WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
          WHEN wo.work_status = 'Selesai' THEN 'selesai'
          WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
          ELSE 'antre'
        END AS status,
        wo.pembayaran_diskon AS diskon,
        wo.pembayaran_diskon,
        wo.pembayaran_metode,
        UPPER(COALESCE(wo.pembayaran_metode, 'TUNAI')) AS metode_pembayaran,
        wo.pembayaran_status,
        UPPER(wo.pembayaran_status) AS status_pembayaran,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
        wo.tagihan_id,
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
        m.motor_merek AS merk,
        m.motor_merek,
        m.motor_tipe AS tipe_motor,
        m.motor_tahun AS tahun_motor,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        p.plafon_kredit,
        p.sisa_plafon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak,
        CASE WHEN wo.pembayaran_status = 'Lunas' THEN ('KWT-' || wo.work_no) ELSE NULL END AS nomor_kwitansi,
        (SELECT COUNT(*) FROM "WO_JASA" wj WHERE wj.work_no = wo.work_no) AS jumlah_item_jasa,
        (SELECT COUNT(*) FROM "WO_SUKU_CADANG" wsc WHERE wsc.work_no = wo.work_no) AS jumlah_item_part
      FROM "WORK_ORDER" wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "PEGAWAI" pg_mek ON pg_mek.pegawai_id = wo.mekanik_id
      ${whereClause}
      ORDER BY wo.work_tgl_masuk DESC, wo.work_no DESC;
    `;

    const countsSql = `
      SELECT
        COUNT(*) AS all,
        COUNT(*) FILTER (WHERE work_status IN ('Dibuat', 'Antre')) AS antre,
        COUNT(*) FILTER (WHERE work_status IN ('Diproses', 'Dikerjakan')) AS dikerjakan,
        COUNT(*) FILTER (WHERE work_status = 'Selesai' AND pembayaran_status = 'Belum Lunas') AS selesai,
        COUNT(*) FILTER (WHERE pembayaran_status = 'Lunas' OR work_status = 'Dibayar') AS dibayar,
        COUNT(*) FILTER (WHERE work_status = 'Dibatalkan') AS dibatalkan
      FROM "WORK_ORDER";
    `;

    const [listRes, countsRes] = await Promise.all([db.query(sql), db.query(countsSql)]);
    return {
      workOrders: listRes.rows,
      counts: countsRes.rows[0],
    };
  }

  async getWorkOrderById(idOrNomor) {
    const paramValue = String(idOrNomor).trim();

    const woSql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        wo.motor_nopol AS motor_id,
        wo.motor_nopol,
        wo.motor_nopol AS plat_nomor,
        wo.cabang_kode AS cabang_id,
        wo.cabang_kode,
        wo.cabang_kode AS kode_cabang,
        c.cabang_nama AS nama_cabang,
        c.cabang_nama,
        'Palangka Raya'::VARCHAR AS kota_cabang,
        wo.mekanik_id,
        COALESCE(pg_mek.pegawai_nama, '-') AS nama_mekanik,
        'Budi Santoso'::VARCHAR AS nama_kasir,
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_masuk,
        wo.work_tgl_selesai AS waktu_selesai,
        wo.work_tgl_selesai,
        m.motor_kilometer AS kilometer_masuk,
        m.motor_kilometer AS kilometer_terakhir,
        m.motor_kilometer,
        wo.work_keluhan AS keluhan,
        wo.work_keluhan,
        NULL::TEXT AS catatan_mekanik,
        wo.work_status,
        CASE
          WHEN wo.work_status = 'Dibatalkan' THEN 'dibatalkan'
          WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
          WHEN wo.work_status = 'Selesai' THEN 'selesai'
          WHEN wo.work_status IN ('Diproses', 'Dikerjakan') THEN 'dikerjakan'
          ELSE 'antre'
        END AS status,
        wo.pembayaran_diskon AS diskon,
        wo.pembayaran_diskon,
        wo.pembayaran_metode,
        wo.pembayaran_status,
        CASE
          WHEN wo.pembayaran_metode = 'Tagihan Kolektif' OR p.pelanggan_tipe = 'Korporat' THEN 'PLAFON_KORPORAT'
          ELSE 'LANGSUNG'
        END AS skema_pembayaran,
        wo.tagihan_id,
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
        fn_status_garansi_by_wo(wo.work_no) AS status_garansi,
        g.garansi_id,
        g.garansi_jumlah_hari,
        g.garansi_keterangan,
        m.motor_merek AS merk,
        m.motor_merek,
        m.motor_tipe AS tipe_motor,
        m.motor_tahun AS tahun_motor,
        m.motor_warna AS warna_motor,
        m.motor_no_rangka AS nomor_rangka,
        m.motor_no_rangka,
        m.motor_no_mesin AS nomor_mesin,
        m.motor_no_mesin,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama,
        p.pelanggan_telp AS telepon_pelanggan,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        p.pelanggan_no_identitas AS npwp,
        p.plafon_kredit,
        p.sisa_plafon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak,
        ('Kontrak Armada ' || p.pelanggan_nama) AS nama_kontrak,
        kk.diskon_kontrak_persen,
        kk.kuota_motor
      FROM "WORK_ORDER" wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      LEFT JOIN "PEGAWAI" pg_mek ON pg_mek.pegawai_id = wo.mekanik_id
      LEFT JOIN "GARANSI" g ON g.work_no = wo.work_no
      WHERE UPPER(wo.work_no) = UPPER($1)
      LIMIT 1;
    `;

    const { rows } = await db.query(woSql, [paramValue]);
    if (!rows[0]) return null;

    const wo = rows[0];

    // Panggil Stored Procedure asli Kelompok 1: CALL sp_hitung_total_tagihan($1, NULL)
    const procRes = await db.query(`CALL sp_hitung_total_tagihan($1, NULL);`, [wo.work_no]);
    const totalTagihan = Math.max(
      Number(procRes.rows[0] ? procRes.rows[0].p_total_tagihan : 0),
      0
    );

    const servicesSql = `
      SELECT
        wj.jasa_kode AS id,
        wj.jasa_kode AS jasa_servis_id,
        wj.work_no,
        wj.jasa_kode,
        wj.jasa_kode AS kode_jasa,
        js.jasa_uraian AS nama_jasa,
        js.jasa_uraian,
        'SERVIS BENGKEL'::VARCHAR AS kategori,
        45 AS estimasi_menit,
        1 AS jumlah,
        js.jasa_biaya AS harga_satuan,
        js.jasa_biaya,
        js.jasa_biaya AS subtotal
      FROM "WO_JASA" wj
      JOIN "JASA_SERVIS" js ON js.jasa_kode = wj.jasa_kode
      WHERE wj.work_no = $1
      ORDER BY wj.jasa_kode ASC;
    `;

    const partsSql = `
      SELECT
        wsc.suku_cadang_kode AS id,
        wsc.suku_cadang_kode AS suku_cadang_id,
        wsc.work_no,
        wsc.suku_cadang_kode,
        wsc.suku_cadang_kode AS kode_sku,
        sc.suku_cadang_nama AS nama_part,
        sc.suku_cadang_nama,
        'SUKU CADANG'::VARCHAR AS kategori,
        'PCS'::VARCHAR AS satuan,
        wsc.suku_cadang_qty AS jumlah,
        wsc.suku_cadang_qty,
        sc.suku_cadang_harga_satuan AS harga_satuan,
        sc.suku_cadang_harga_satuan,
        wsc.suku_cadang_jumlah AS subtotal,
        wsc.suku_cadang_jumlah,
        COALESCE(st.stok_qty, 0) AS stok_saat_ini,
        COALESCE(st.stok_qty, 0) AS stok_qty
      FROM "WO_SUKU_CADANG" wsc
      JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = wsc.suku_cadang_kode
      LEFT JOIN "STOK_CABANG" st
        ON st.suku_cadang_kode = wsc.suku_cadang_kode AND st.cabang_kode = $2
      WHERE wsc.work_no = $1
      ORDER BY wsc.suku_cadang_kode ASC;
    `;

    const mechanicsSql = `
      SELECT
        wm.work_no,
        wm.mekanik_id,
        wm.peran_mekanik,
        p.pegawai_nama,
        mk.mekanik_keahlian,
        mk.mekanik_keahlian AS mekanik_spesialisasi,
        p.pegawai_peran AS mekanik_level
      FROM "WO_MEKANIK" wm
      JOIN "PEGAWAI" p ON p.pegawai_id = wm.mekanik_id
      JOIN "MEKANIK" mk ON mk.mekanik_id = wm.mekanik_id
      WHERE wm.work_no = $1
      ORDER BY CASE WHEN wm.peran_mekanik = 'Penanggung Jawab' THEN 0 ELSE 1 END, wm.mekanik_id ASC;
    `;

    const [srvRes, partRes, mekRes] = await Promise.all([
      db.query(servicesSql, [wo.work_no]),
      db.query(partsSql, [wo.work_no, wo.cabang_kode]),
      db.query(mechanicsSql, [wo.work_no]),
    ]);

    const payment =
      wo.pembayaran_status === 'Lunas' || wo.work_status === 'Dibayar'
        ? {
            id: wo.work_no,
            work_no: wo.work_no,
            work_order_id: wo.work_no,
            nomor_kwitansi: `KWT-${wo.work_no}`,
            metode_pembayaran: wo.pembayaran_metode || 'Tunai',
            pembayaran_metode: wo.pembayaran_metode || 'Tunai',
            status_pembayaran: wo.pembayaran_status,
            pembayaran_status: wo.pembayaran_status,
            pembayaran_diskon: wo.pembayaran_diskon,
            jumlah_bayar: totalTagihan,
            tanggal_bayar: wo.work_tgl_selesai || wo.work_tgl_masuk,
            nama_kasir: wo.nama_kasir,
          }
        : null;

    return {
      ...wo,
      total_tagihan: totalTagihan,
      services: srvRes.rows,
      spareparts: partRes.rows,
      mechanics: mekRes.rows,
      payment,
    };
  }

  async generateNextWoNumber(client) {
    const { rows } = await client.query(`
      SELECT COALESCE(
        MAX(NULLIF(REGEXP_REPLACE(work_no, '[^0-9]', '', 'g'), '')::INT),
        13
      ) + 1 AS next_seq
      FROM "WORK_ORDER";
    `);
    const nextSeq = String(rows[0].next_seq).padStart(3, '0');
    return `WO${nextSeq}`;
  }

  /**
   * Membuat Work Order baru dalam transaksi ACID (BEGIN ... COMMIT / ROLLBACK)
   * Mendukung Skenario Debugging #1 (Input Work Order Tanpa Motor -> 400 Bad Request)
   */
  async createWorkOrder(data, user) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const rawWoNo = data.work_no || data.nomor_wo;
      const workNo = rawWoNo
        ? String(rawWoNo).trim().toUpperCase().slice(0, 15)
        : await this.generateNextWoNumber(client);

      const cabangKode = String(
        data.cabang_kode || data.cabang_id || (user && user.cabang_kode) || 'CB001'
      ).trim();

      const rawMotor = data.motor_nopol !== undefined ? data.motor_nopol : data.motor_id;
      const motorNopol =
        rawMotor === undefined || rawMotor === null || String(rawMotor).trim() === ''
          ? null
          : String(rawMotor).trim().toUpperCase();

      const mekanikId = String(data.mekanik_id || 'PG003').trim();
      const keluhan = data.work_keluhan || data.keluhan || 'Servis berkala & pengecekan umum';
      const diskon = Math.round(
        Number(data.pembayaran_diskon !== undefined ? data.pembayaran_diskon : data.diskon || 0)
      );

      // Map status ke format Kelompok 1 ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan', 'Selesai', 'Dibayar', 'Dibatalkan')
      const rawStatus = String(data.work_status || data.status || 'Antre').toLowerCase();
      let workStatus = 'Antre';
      if (rawStatus === 'dibuat') workStatus = 'Dibuat';
      else if (rawStatus === 'diproses') workStatus = 'Diproses';
      else if (rawStatus === 'dikerjakan') workStatus = 'Dikerjakan';
      else if (rawStatus === 'selesai') workStatus = 'Selesai';
      else if (rawStatus === 'dibayar') workStatus = 'Dibayar';
      else if (rawStatus === 'dibatalkan') workStatus = 'Dibatalkan';

      const rawSkema = String(
        data.pembayaran_metode || data.skema_pembayaran || 'Tunai'
      ).toUpperCase();
      let pembayaranMetode = 'Tunai';
      if (rawSkema.includes('KORPORAT') || rawSkema.includes('PLAFON') || rawSkema.includes('KOLEKTIF')) {
        pembayaranMetode = 'Tagihan Kolektif';
      } else if (rawSkema.includes('QRIS')) {
        pembayaranMetode = 'QRIS';
      } else if (rawSkema.includes('TRANSFER')) {
        pembayaranMetode = 'Transfer';
      } else if (rawSkema.includes('DEBIT')) {
        pembayaranMetode = 'Debit';
      } else if (rawSkema.includes('KREDIT')) {
        pembayaranMetode = 'Kredit';
      }

      const insertWoSql = `
        INSERT INTO "WORK_ORDER" (
          work_no, work_tgl_masuk, work_tgl_selesai, work_status,
          work_keluhan, cabang_kode, motor_nopol, mekanik_id,
          pembayaran_diskon, pembayaran_metode, pembayaran_status
        ) VALUES (
          $1, CURRENT_TIMESTAMP, NULL, $2,
          $3, $4, $5, $6,
          $7, $8, 'Belum Lunas'
        )
        RETURNING *;
      `;

      const { rows: woRows } = await client.query(insertWoSql, [
        workNo,
        workStatus,
        keluhan,
        cabangKode,
        motorNopol,
        mekanikId,
        diskon,
        pembayaranMetode,
      ]);

      const createdWo = woRows[0];

      // Update motor_kilometer jika dikirim
      const kmMasuk = Number(data.motor_kilometer || data.kilometer_masuk || 0);
      if (createdWo.motor_nopol && kmMasuk > 0) {
        await client.query(
          `UPDATE "MOTOR" SET motor_kilometer = GREATEST(motor_kilometer, $1) WHERE motor_nopol = $2;`,
          [kmMasuk, createdWo.motor_nopol]
        );
      }

      // Assign mekanik ke "WO_MEKANIK"
      await client.query(
        `
          INSERT INTO "WO_MEKANIK" (work_no, mekanik_id, peran_mekanik)
          VALUES ($1, $2, 'Penanggung Jawab')
          ON CONFLICT (work_no, mekanik_id) DO NOTHING;
        `,
        [createdWo.work_no, mekanikId]
      );

      // Tambahkan jasa servis awal ("WO_JASA") jika dikirim
      if (Array.isArray(data.initial_services) && data.initial_services.length > 0) {
        for (const srv of data.initial_services) {
          const jasaKode = String(srv.jasa_kode || srv.jasa_servis_id).trim();
          await client.query(
            `
              INSERT INTO "WO_JASA" (work_no, jasa_kode)
              VALUES ($1, $2)
              ON CONFLICT (work_no, jasa_kode) DO NOTHING;
            `,
            [createdWo.work_no, jasaKode]
          );
        }
      }

      // Tambahkan suku cadang awal ("WO_SUKU_CADANG") jika dikirim
      if (Array.isArray(data.initial_spareparts) && data.initial_spareparts.length > 0) {
        for (const part of data.initial_spareparts) {
          const scKode = String(part.suku_cadang_kode || part.suku_cadang_id).trim();
          const qty = Math.round(Number(part.suku_cadang_qty || part.wo_sc_qty || part.jumlah || 1));
          const scRes = await client.query(
            `SELECT suku_cadang_harga_satuan FROM "SUKU_CADANG" WHERE suku_cadang_kode = $1`,
            [scKode]
          );
          if (scRes.rows[0]) {
            const jumlahRp = qty * Number(scRes.rows[0].suku_cadang_harga_satuan);
            await client.query(
              `
                INSERT INTO "WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah)
                VALUES ($1, $2, $3, $4);
              `,
              [createdWo.work_no, scKode, qty, jumlahRp]
            );
          }
        }
      }

      await client.query('COMMIT');
      return await this.getWorkOrderById(createdWo.work_no);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateWorkOrder(id, data) {
    const workNo = String(id).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      let workStatus = null;
      let pembayaranStatus = null;
      const rawStatus = data.work_status || data.status;
      if (rawStatus) {
        const s = String(rawStatus).trim().toLowerCase();
        if (s === 'antre') workStatus = 'Antre';
        else if (s === 'dibuat') workStatus = 'Dibuat';
        else if (s === 'dikerjakan') workStatus = 'Dikerjakan';
        else if (s === 'diproses') workStatus = 'Diproses';
        else if (s === 'selesai') workStatus = 'Selesai';
        else if (s === 'dibayar' || s === 'lunas') {
          workStatus = 'Dibayar';
          pembayaranStatus = 'Lunas';
        } else if (s === 'dibatalkan') {
          workStatus = 'Dibatalkan';
          pembayaranStatus = 'Dibatalkan';
        }
      }

      const diskon =
        data.pembayaran_diskon !== undefined
          ? Math.round(Number(data.pembayaran_diskon))
          : data.diskon !== undefined
          ? Math.round(Number(data.diskon))
          : null;

      const keluhan = data.work_keluhan || data.keluhan || null;
      const mekanikId = data.mekanik_id ? String(data.mekanik_id).trim() : null;

      const sql = `
        UPDATE "WORK_ORDER"
        SET
          work_status = COALESCE($1, work_status),
          pembayaran_status = COALESCE($2, pembayaran_status),
          pembayaran_diskon = COALESCE($3, pembayaran_diskon),
          work_keluhan = COALESCE($4, work_keluhan),
          mekanik_id = COALESCE($5, mekanik_id),
          work_tgl_selesai = CASE
            WHEN $1 IN ('Selesai', 'Dibayar') AND work_tgl_selesai IS NULL THEN CURRENT_TIMESTAMP
            ELSE work_tgl_selesai
          END
        WHERE UPPER(work_no) = UPPER($6)
        RETURNING *;
      `;

      const { rows } = await client.query(sql, [
        workStatus,
        pembayaranStatus,
        diskon,
        keluhan,
        mekanikId,
        workNo,
      ]);

      if (!rows[0]) {
        throw new AppError(`Work Order '${workNo}' tidak ditemukan.`, 404, 'WO_NOT_FOUND');
      }

      if (mekanikId) {
        await client.query(
          `
            INSERT INTO "WO_MEKANIK" (work_no, mekanik_id, peran_mekanik)
            VALUES ($1, $2, 'Penanggung Jawab')
            ON CONFLICT (work_no, mekanik_id)
            DO UPDATE SET peran_mekanik = 'Penanggung Jawab';
          `,
          [rows[0].work_no, mekanikId]
        );
      }

      await client.query('COMMIT');
      return await this.getWorkOrderById(rows[0].work_no);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async addServiceToWorkOrder(workOrderId, jasaServisId) {
    const workNo = String(workOrderId).trim();
    const jasaKode = String(jasaServisId).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const jsRes = await client.query(
        `SELECT jasa_kode, jasa_biaya FROM "JASA_SERVIS" WHERE jasa_kode = $1`,
        [jasaKode]
      );
      if (!jsRes.rows[0]) {
        throw new AppError(`Jasa servis '${jasaKode}' tidak ditemukan.`, 404, 'SERVICE_NOT_FOUND');
      }

      await client.query(
        `
          INSERT INTO "WO_JASA" (work_no, jasa_kode)
          VALUES ($1, $2)
          ON CONFLICT (work_no, jasa_kode) DO NOTHING;
        `,
        [workNo, jasaKode]
      );
      await client.query('COMMIT');
      return await this.getWorkOrderById(workNo);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async removeServiceFromWorkOrder(workOrderId, itemId) {
    const workNo = String(workOrderId).trim();
    const jasaKode = String(itemId).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM "WO_JASA" WHERE work_no = $1 AND jasa_kode = $2;`,
        [workNo, jasaKode]
      );
      await client.query('COMMIT');
      return await this.getWorkOrderById(workNo);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Menambahkan Suku Cadang ke "WO_SUKU_CADANG" dalam transaksi ACID
   * Skenario Debugging #3: Trigger PostgreSQL trg_kurangi_stok_suku_cadang (trg_fn_kurangi_stok)
   * mengurangi "STOK_CABANG".stok_qty. Jika suku_cadang_qty > stok_qty, constraint
   * "chk_stok_qty" (23514) melempar error, transaksi di-ROLLBACK dan HTTP 422 dikembalikan.
   */
  async addSparepartToWorkOrder(workOrderId, sukuCadangId, jumlah) {
    const workNo = String(workOrderId).trim();
    const scKode = String(sukuCadangId).trim();
    const qty = Math.round(Number(jumlah));

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const scRes = await client.query(
        `SELECT suku_cadang_kode, suku_cadang_harga_satuan FROM "SUKU_CADANG" WHERE suku_cadang_kode = $1`,
        [scKode]
      );
      if (!scRes.rows[0]) {
        throw new AppError(`Suku cadang '${scKode}' tidak ditemukan.`, 404, 'SPAREPART_NOT_FOUND');
      }

      const hargaSatuan = Number(scRes.rows[0].suku_cadang_harga_satuan);

      // Pastikan baris cabang_kode + suku_cadang_kode ada di "STOK_CABANG" agar UPDATE pada trg_fn_kurangi_stok mengenai baris tersebut
      const woCabangRes = await client.query(
        `SELECT cabang_kode FROM "WORK_ORDER" WHERE work_no = $1`,
        [workNo]
      );
      if (woCabangRes.rows[0]) {
        await client.query(
          `
            INSERT INTO "STOK_CABANG" (cabang_kode, suku_cadang_kode, stok_qty, stok_minimum)
            VALUES ($1, $2, 0, 2)
            ON CONFLICT (cabang_kode, suku_cadang_kode) DO NOTHING;
          `,
          [woCabangRes.rows[0].cabang_kode, scKode]
        );
      }

      const existing = await client.query(
        `SELECT suku_cadang_qty FROM "WO_SUKU_CADANG" WHERE work_no = $1 AND suku_cadang_kode = $2`,
        [workNo, scKode]
      );

      if (existing.rowCount > 0) {
        const newQty = Number(existing.rows[0].suku_cadang_qty) + qty;
        await client.query(
          `DELETE FROM "WO_SUKU_CADANG" WHERE work_no = $1 AND suku_cadang_kode = $2`,
          [workNo, scKode]
        );
        await client.query(
          `
            INSERT INTO "WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah)
            VALUES ($1, $2, $3, $4);
          `,
          [workNo, scKode, newQty, newQty * hargaSatuan]
        );
      } else {
        await client.query(
          `
            INSERT INTO "WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah)
            VALUES ($1, $2, $3, $4);
          `,
          [workNo, scKode, qty, qty * hargaSatuan]
        );
      }

      await client.query('COMMIT');
      return await this.getWorkOrderById(workNo);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async removeSparepartFromWorkOrder(workOrderId, itemId) {
    const workNo = String(workOrderId).trim();
    const scKode = String(itemId).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM "WO_SUKU_CADANG" WHERE work_no = $1 AND suku_cadang_kode = $2;`,
        [workNo, scKode]
      );
      await client.query('COMMIT');
      return await this.getWorkOrderById(workNo);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // PEMBAYARAN KASIR (Atribut Pembayaran Menyatu di Tabel "WORK_ORDER")
  // ==========================================================================
  async getAllPayments() {
    const sql = `
      SELECT
        wo.work_no AS id,
        wo.work_no AS work_order_id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        ('KWT-' || wo.work_no) AS nomor_kwitansi,
        CASE
          WHEN wo.pembayaran_status = 'Lunas' OR wo.work_status = 'Dibayar' THEN 'dibayar'
          ELSE LOWER(wo.work_status)
        END AS status_wo,
        wo.work_status,
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
        wo.pembayaran_diskon,
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        fn_hitung_total_tagihan(wo.work_no) AS jumlah_bayar,
        UPPER(COALESCE(wo.pembayaran_metode, 'TUNAI')) AS metode_pembayaran,
        wo.pembayaran_metode,
        UPPER(wo.pembayaran_status) AS status_pembayaran,
        wo.pembayaran_status,
        COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) AS tanggal_bayar,
        m.motor_nopol AS plat_nomor,
        m.motor_nopol,
        (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        UPPER(p.pelanggan_tipe) AS tipe_pelanggan,
        p.pelanggan_tipe,
        CASE WHEN p.pelanggan_tipe = 'Korporat' THEN p.pelanggan_nama ELSE NULL END AS nama_perusahaan,
        p.sisa_plafon,
        c.cabang_kode AS kode_cabang,
        c.cabang_kode,
        c.cabang_nama AS nama_cabang,
        'Budi Santoso'::VARCHAR AS nama_kasir
      FROM "WORK_ORDER" wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      JOIN "CABANG" c ON c.cabang_kode = wo.cabang_kode
      WHERE wo.pembayaran_status = 'Lunas'
         OR wo.work_status = 'Dibayar'
         OR (wo.work_status = 'Selesai' AND wo.pembayaran_metode = 'Tagihan Kolektif')
      ORDER BY COALESCE(wo.work_tgl_selesai, wo.work_tgl_masuk) DESC, wo.work_no DESC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  }

  /**
   * Memproses Pembayaran Work Order dalam Transaksi ACID (BEGIN ... COMMIT / ROLLBACK)
   * Skenario Debugging #2: Pengecekan pembayaran_status = 'Lunas' atau work_status = 'Dibayar'
   * pada tabel "WORK_ORDER" di dalam transaksi dengan row-level lock FOR UPDATE -> 409 Conflict!
   */
  async createPayment(data, _user) {
    const workNo = String(data.work_no || data.work_order_id || '').trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const woCheckSql = `
        SELECT
          wo.work_no,
          wo.work_status,
          wo.pembayaran_status,
          wo.pembayaran_metode,
          wo.pembayaran_diskon,
          wo.work_tgl_selesai,
          wo.motor_nopol,
          fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
          p.pelanggan_id,
          p.pelanggan_tipe,
          p.pelanggan_nama,
          p.sisa_plafon
        FROM "WORK_ORDER" wo
        JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
        JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
        WHERE UPPER(wo.work_no) = UPPER($1)
        FOR UPDATE OF wo;
      `;
      const { rows: woRows } = await client.query(woCheckSql, [workNo]);

      if (!woRows[0]) {
        throw new AppError(
          `Work Order '${workNo}' tidak ditemukan pada tabel "WORK_ORDER".`,
          404,
          'WO_NOT_FOUND'
        );
      }

      const wo = woRows[0];

      // Skenario Debugging #2: Jika "WORK_ORDER".pembayaran_status sudah 'Lunas' atau work_status = 'Dibayar', tolak dengan 409 Conflict!
      if (wo.pembayaran_status === 'Lunas' || wo.work_status === 'Dibayar') {
        throw new AppError(
          `Pembayaran Dobel Ditolak (409 Conflict): Work Order ${wo.work_no} sudah berstatus 'Lunas' pada tabel "WORK_ORDER" (Metode: ${wo.pembayaran_metode || 'Tunai'}). Transaksi dibatalkan di dalam blok BEGIN...ROLLBACK.`,
          409,
          'DOUBLE_PAYMENT_CONFLICT',
          {
            workNo: wo.work_no,
            nomorWo: wo.work_no,
            currentStatus: wo.work_status,
            pembayaranStatus: wo.pembayaran_status,
            pembayaranMetode: wo.pembayaran_metode,
            existingReceipt: {
              nomor_kwitansi: `KWT-${wo.work_no}`,
              metode_pembayaran: wo.pembayaran_metode,
              tanggal_bayar: wo.work_tgl_selesai,
            },
            dbTable: '"WORK_ORDER"',
            dbColumn: 'pembayaran_status = \'Lunas\'',
          }
        );
      }

      // Normalisasi metode pembayaran sesuai CHECK constraint pada "WORK_ORDER"
      // ('Tunai', 'Debit', 'Kredit', 'QRIS', 'Transfer', 'Tagihan Kolektif')
      const rawMetode = String(
        data.pembayaran_metode ||
          data.metode_pembayaran ||
          (wo.pelanggan_tipe === 'Korporat' ? 'Tagihan Kolektif' : 'Tunai')
      ).toUpperCase();

      let metodeDb = 'Tunai';
      if (rawMetode.includes('QRIS')) metodeDb = 'QRIS';
      else if (rawMetode.includes('TRANSFER')) metodeDb = 'Transfer';
      else if (rawMetode.includes('DEBIT')) metodeDb = 'Debit';
      else if (rawMetode.includes('KREDIT') && !rawMetode.includes('PLAFON')) metodeDb = 'Kredit';
      else if (
        rawMetode.includes('PLAFON') ||
        rawMetode.includes('KORPORAT') ||
        rawMetode.includes('KOLEKTIF')
      ) {
        metodeDb = 'Tagihan Kolektif';
      }

      const diskonBaru =
        data.pembayaran_diskon !== undefined
          ? Math.round(Number(data.pembayaran_diskon))
          : data.diskon !== undefined
          ? Math.round(Number(data.diskon))
          : Math.round(Number(wo.pembayaran_diskon || 0));

      const updatePaySql = `
        UPDATE "WORK_ORDER"
        SET
          work_status = 'Dibayar',
          work_tgl_selesai = COALESCE(work_tgl_selesai, CURRENT_TIMESTAMP),
          pembayaran_metode = $1,
          pembayaran_status = 'Lunas',
          pembayaran_diskon = $2
        WHERE work_no = $3
        RETURNING *;
      `;

      const { rows: updatedRows } = await client.query(updatePaySql, [
        metodeDb,
        diskonBaru,
        wo.work_no,
      ]);

      const procRes = await client.query(`CALL sp_hitung_total_tagihan($1, NULL);`, [wo.work_no]);
      const totalTagihan = Math.max(
        Number(procRes.rows[0] ? procRes.rows[0].p_total_tagihan : 0),
        0
      );

      await client.query('COMMIT');

      const updatedWo = updatedRows[0];
      return {
        id: updatedWo.work_no,
        work_no: updatedWo.work_no,
        work_order_id: updatedWo.work_no,
        nomor_wo: updatedWo.work_no,
        nomor_kwitansi: `KWT-${updatedWo.work_no}`,
        pembayaran_metode: updatedWo.pembayaran_metode,
        metode_pembayaran: updatedWo.pembayaran_metode.toUpperCase(),
        pembayaran_status: updatedWo.pembayaran_status,
        status_pembayaran: updatedWo.pembayaran_status.toUpperCase(),
        pembayaran_diskon: updatedWo.pembayaran_diskon,
        jumlah_bayar: totalTagihan,
        tanggal_bayar: updatedWo.work_tgl_selesai,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new OperationsRepository();
