const db = require('../config/db');
const AppError = require('../utils/AppError');

class CorporateRepository {
  // ==========================================================================
  // 1. "KONTRAK_KORPORAT" & MONITORING PLAFON KREDIT "PELANGGAN"
  // ==========================================================================
  async getCorporateContractsAndFleets() {
    const monitoringSql = `
      SELECT
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_nama AS nama_perusahaan,
        p.pelanggan_no_identitas AS npwp,
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
        p.plafon_kredit,
        p.sisa_plafon,
        (p.plafon_kredit - p.sisa_plafon) AS plafon_terpakai,
        CASE
          WHEN p.plafon_kredit > 0 THEN ROUND(((p.plafon_kredit - p.sisa_plafon)::NUMERIC / p.plafon_kredit) * 100, 2)
          ELSE 0
        END AS persentase_utilisasi,
        COUNT(DISTINCT m.motor_nopol) AS jumlah_unit_armada,
        COUNT(DISTINCT wo.work_no) AS total_wo_korporat,
        COUNT(DISTINCT tk.tagihan_id) FILTER (WHERE tk.status_tagihan = 'Belum Dibayar') AS tagihan_outstanding_count
      FROM "PELANGGAN" p
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      LEFT JOIN "MOTOR" m ON m.pelanggan_id = p.pelanggan_id
      LEFT JOIN "WORK_ORDER" wo ON wo.motor_nopol = m.motor_nopol
      LEFT JOIN "TAGIHAN_KOLEKTIF" tk ON tk.pelanggan_id = p.pelanggan_id
      WHERE p.pelanggan_tipe = 'Korporat'
      GROUP BY
        p.pelanggan_id, p.pelanggan_nama, p.pelanggan_no_identitas,
        p.pelanggan_telp, kk.kontrak_id, kk.status_kontrak,
        kk.diskon_kontrak_persen, kk.kuota_motor, p.plafon_kredit, p.sisa_plafon
      ORDER BY p.pelanggan_id ASC;
    `;

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
        p.pelanggan_no_identitas AS npwp,
        p.pelanggan_nama AS pic_nama,
        p.pelanggan_telp AS telepon,
        p.plafon_kredit,
        p.sisa_plafon,
        COALESCE(p.pelanggan_cab_favorit, 'CB001') AS kode_cabang,
        COALESCE(c.cabang_nama, 'Kalawa Service Pahandut') AS nama_cabang,
        (
          SELECT COUNT(*)
          FROM "MOTOR" m
          WHERE m.pelanggan_id = p.pelanggan_id
        ) AS jumlah_armada,
        (
          SELECT COUNT(*)
          FROM "WORK_ORDER" wo
          JOIN "MOTOR" m2 ON m2.motor_nopol = wo.motor_nopol
          WHERE m2.pelanggan_id = p.pelanggan_id
        ) AS total_wo_kontrak
      FROM "KONTRAK_KORPORAT" kk
      JOIN "PELANGGAN" p ON p.pelanggan_id = kk.pelanggan_id
      LEFT JOIN "CABANG" c ON c.cabang_kode = p.pelanggan_cab_favorit
      ORDER BY kk.kontrak_id ASC;
    `;

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
        (SELECT COUNT(*) FROM "WORK_ORDER" wo WHERE wo.motor_nopol = m.motor_nopol) AS jumlah_servis,
        (SELECT MAX(wo.work_tgl_masuk) FROM "WORK_ORDER" wo WHERE wo.motor_nopol = m.motor_nopol) AS servis_terakhir
      FROM "MOTOR" m
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      WHERE p.pelanggan_tipe = 'Korporat'
      ORDER BY p.pelanggan_id ASC, m.motor_nopol ASC;
    `;

    const [monRes, contractsRes, fleetRes] = await Promise.all([
      db.query(monitoringSql),
      db.query(allContractsSql),
      db.query(fleetVehiclesSql),
    ]);

    return {
      creditMonitoring: monRes.rows,
      contracts: contractsRes.rows,
      fleetVehicles: fleetRes.rows,
    };
  }

  async createCorporateContract(data) {
    const seqRes = await db.query(`
      SELECT COALESCE(
        MAX(NULLIF(REGEXP_REPLACE(kontrak_id, '[^0-9]', '', 'g'), '')::INT),
        2
      ) + 1 AS next_seq
      FROM "KONTRAK_KORPORAT";
    `);
    const rawId = data.kontrak_id || data.nomor_kontrak;
    const kontrakId = rawId
      ? String(rawId).trim().toUpperCase().slice(0, 15)
      : `KK${String(seqRes.rows[0].next_seq).padStart(3, '0')}`;
    const pelangganId = String(data.pelanggan_id).trim();
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

    const rawStatus = String(data.status_kontrak || 'Aktif').toLowerCase();
    let statusKontrak = 'Aktif';
    if (rawStatus.includes('berakhir')) statusKontrak = 'Berakhir';
    else if (rawStatus.includes('beku')) statusKontrak = 'Dibekukan';

    const sql = `
      INSERT INTO "KONTRAK_KORPORAT" (
        kontrak_id, pelanggan_id, tgl_mulai, tgl_akhir,
        kuota_motor, diskon_kontrak_persen, status_kontrak
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
    const params = [
      kontrakId,
      pelangganId,
      tglMulai,
      tglAkhir,
      kuotaMotor,
      diskonPersen,
      statusKontrak,
    ];
    const { rows } = await db.query(sql, params);
    return rows[0];
  }

  async updateCorporateCreditLimit(pelangganId, plafonBaru, sisaPlafonBaru) {
    const plafon = Math.round(Number(plafonBaru));
    const sisa =
      sisaPlafonBaru !== undefined
        ? Math.min(plafon, Math.round(Number(sisaPlafonBaru)))
        : plafon;

    const sql = `
      UPDATE "PELANGGAN"
      SET
        plafon_kredit = $1,
        sisa_plafon = $2
      WHERE pelanggan_id = $3 AND pelanggan_tipe = 'Korporat'
      RETURNING
        pelanggan_id AS id,
        pelanggan_id,
        pelanggan_id AS kode_pelanggan,
        pelanggan_nama AS nama_pelanggan,
        pelanggan_nama AS nama_perusahaan,
        plafon_kredit,
        sisa_plafon;
    `;
    const { rows } = await db.query(sql, [plafon, sisa, String(pelangganId).trim()]);
    return rows[0] || null;
  }

  // ==========================================================================
  // 2. "TAGIHAN_KOLEKTIF" AKHIR BULAN (COLLECTIVE BILLING)
  // ==========================================================================
  async getCollectiveBillings() {
    const invoicesSql = `
      SELECT
        tk.tagihan_id AS id,
        tk.tagihan_id,
        tk.tagihan_id AS nomor_invoice,
        tk.pelanggan_id,
        kk.kontrak_id,
        tk.periode_bulan AS periode_tagihan,
        COALESCE(NULLIF(SPLIT_PART(tk.periode_bulan, '-', 2), '')::INT, 9) AS periode_bulan,
        COALESCE(NULLIF(SPLIT_PART(tk.periode_bulan, '-', 1), '')::INT, 2026) AS periode_tahun,
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
          FROM "WORK_ORDER" wo
          WHERE wo.tagihan_id = tk.tagihan_id
        ) AS total_wo,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_perusahaan,
        p.pelanggan_nama AS nama_pelanggan,
        p.pelanggan_no_identitas AS npwp,
        p.pelanggan_nama AS pic_nama,
        p.plafon_kredit,
        p.sisa_plafon,
        kk.kontrak_id AS nomor_kontrak,
        ('Kontrak Armada ' || p.pelanggan_nama) AS nama_kontrak
      FROM "TAGIHAN_KOLEKTIF" tk
      JOIN "PELANGGAN" p ON p.pelanggan_id = tk.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      ORDER BY tk.tagihan_id DESC;
    `;

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
        fn_hitung_total_tagihan(wo.work_no) AS nominal_wo,
        m.motor_nopol AS motor_id,
        m.motor_nopol AS plat_nomor,
        (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan
      FROM "WORK_ORDER" wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      WHERE wo.tagihan_id IS NOT NULL
      ORDER BY wo.work_no ASC;
    `;

    const unbilledWoSql = `
      SELECT
        wo.work_no AS id,
        wo.work_no,
        wo.work_no AS nomor_wo,
        LOWER(wo.work_status) AS status,
        wo.work_status,
        wo.pembayaran_status,
        wo.pembayaran_metode AS skema_pembayaran,
        wo.work_tgl_masuk AS waktu_masuk,
        wo.work_tgl_selesai AS waktu_selesai,
        wo.work_keluhan AS keluhan,
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
        fn_hitung_total_tagihan(wo.work_no) AS total_tagihan,
        m.motor_nopol AS motor_id,
        m.motor_nopol AS plat_nomor,
        (m.motor_merek || ' ' || m.motor_tipe) AS kendaraan,
        p.pelanggan_id,
        p.pelanggan_id AS kode_pelanggan,
        p.pelanggan_nama AS nama_perusahaan,
        p.sisa_plafon,
        kk.kontrak_id,
        kk.kontrak_id AS nomor_kontrak
      FROM "WORK_ORDER" wo
      JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
      JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
      LEFT JOIN "KONTRAK_KORPORAT" kk
        ON kk.pelanggan_id = p.pelanggan_id AND kk.status_kontrak = 'Aktif'
      WHERE p.pelanggan_tipe = 'Korporat'
        AND wo.work_status IN ('Selesai', 'Dibayar')
        AND wo.tagihan_id IS NULL
      ORDER BY wo.work_no DESC;
    `;

    const [invRes, detRes, unbilledRes] = await Promise.all([
      db.query(invoicesSql),
      db.query(detailsSql),
      db.query(unbilledWoSql),
    ]);

    const detailsByInvoice = {};
    for (const d of detRes.rows) {
      if (!detailsByInvoice[d.tagihan_id]) {
        detailsByInvoice[d.tagihan_id] = [];
      }
      detailsByInvoice[d.tagihan_id].push(d);
    }

    const invoices = invRes.rows.map((inv) => ({
      ...inv,
      details: detailsByInvoice[inv.tagihan_id] || [],
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
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const pelangganId = String(data.pelanggan_id).trim();
      const periodeBulanNum = Number(data.periode_bulan || 9);
      const periodeTahunNum = Number(data.periode_tahun || 2026);
      const periodeStr =
        typeof data.periode_bulan === 'string' && data.periode_bulan.includes('-')
          ? data.periode_bulan
          : `${periodeTahunNum}-${String(periodeBulanNum).padStart(2, '0')}`;

      const eligibleSql = `
        SELECT
          wo.work_no,
          wo.work_status,
          fn_hitung_total_tagihan(wo.work_no) AS total_tagihan
        FROM "WORK_ORDER" wo
        JOIN "MOTOR" m ON m.motor_nopol = wo.motor_nopol
        WHERE m.pelanggan_id = $1
          AND wo.work_status IN ('Selesai', 'Dibayar')
          AND wo.tagihan_id IS NULL
        ORDER BY wo.work_no ASC
        FOR UPDATE OF wo;
      `;
      const { rows: woList } = await client.query(eligibleSql, [pelangganId]);

      if (woList.length === 0) {
        throw new AppError(
          `Tidak ditemukan Work Order korporat (berstatus Selesai & belum ditagihkan) untuk pelanggan ${pelangganId}.`,
          400,
          'NO_ELIGIBLE_CORPORATE_WO'
        );
      }

      const seqInv = await client.query(`
        SELECT COALESCE(
          MAX(NULLIF(REGEXP_REPLACE(tagihan_id, '[^0-9]', '', 'g'), '')::INT),
          1
        ) + 1 AS next_seq
        FROM "TAGIHAN_KOLEKTIF";
      `);
      const tagihanId =
        data.tagihan_id || `TK${String(seqInv.rows[0].next_seq).padStart(3, '0')}`;

      const totalNominal = woList.reduce(
        (acc, item) => acc + Math.round(Number(item.total_tagihan)),
        0
      );
      const tglJatuhTempo =
        data.tgl_jatuh_tempo ||
        data.tanggal_jatuh_tempo ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const insertInvSql = `
        INSERT INTO "TAGIHAN_KOLEKTIF" (
          tagihan_id, pelanggan_id, periode_bulan,
          total_tagihan, status_tagihan, tgl_jatuh_tempo, tgl_lunas
        ) VALUES ($1, $2, $3, $4, 'Belum Dibayar', $5, NULL)
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

      // Kaitkan semua WO korporat ke tagihan_id ini -> memicu trg_potong_plafon_korporat
      for (const wo of woList) {
        await client.query(
          `
            UPDATE "WORK_ORDER"
            SET
              tagihan_id = $1,
              pembayaran_metode = 'Tagihan Kolektif'
            WHERE work_no = $2;
          `,
          [tagihanId, wo.work_no]
        );
      }

      await client.query('COMMIT');
      return {
        ...createdInvoice,
        total_wo: woList.length,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Melunasi Tagihan Kolektif Akhir Bulan pada tabel "TAGIHAN_KOLEKTIF"
   * Memicu trigger trg_lunasi_tagihan_kolektif yang otomatis memulihkan sisa_plafon
   * pada "PELANGGAN" dan mengubah pembayaran_status = 'Lunas' pada "WORK_ORDER"!
   */
  async settleCollectiveInvoice(tagihanId, _data) {
    const tkId = String(tagihanId).trim();
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `SELECT * FROM "TAGIHAN_KOLEKTIF" WHERE UPPER(tagihan_id) = UPPER($1) FOR UPDATE`,
        [tkId]
      );
      if (!checkRes.rows[0]) {
        throw new AppError(`Tagihan Kolektif '${tkId}' tidak ditemukan.`, 404, 'INVOICE_NOT_FOUND');
      }

      if (checkRes.rows[0].status_tagihan === 'Lunas') {
        throw new AppError(
          `Tagihan Kolektif '${tkId}' sudah berstatus Lunas.`,
          409,
          'INVOICE_ALREADY_PAID'
        );
      }

      const { rows } = await client.query(
        `
          UPDATE "TAGIHAN_KOLEKTIF"
          SET
            status_tagihan = 'Lunas',
            tgl_lunas = CURRENT_TIMESTAMP
          WHERE tagihan_id = $1
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
        `,
        [checkRes.rows[0].tagihan_id]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new CorporateRepository();
