-- ============================================================================
-- KALAWA SERVICE — WORKSHOP MANAGEMENT & CORPORATE BILLING ERP
-- File: 02_migration_corporate.sql
-- Deskripsi: Perubahan Requirement — Ekspansi Layanan Pelanggan Korporat (B2B)
--            (Perusahaan Kurir & Rental Motor, Kontrak Servis Bulanan,
--             Plafon Kredit, dan Tagihan Kolektif Akhir Bulan)
-- Database Engine: PostgreSQL 15+
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ALTER TABLE PELANGGAN: Mendukung Pelanggan Individu (B2C) & Korporat (B2B)
-- ============================================================================
ALTER TABLE pelanggan
    ADD COLUMN IF NOT EXISTS tipe_pelanggan VARCHAR(20) NOT NULL DEFAULT 'INDIVIDU'
        CHECK (tipe_pelanggan IN ('INDIVIDU', 'KORPORAT')),
    ADD COLUMN IF NOT EXISTS nama_perusahaan VARCHAR(150),
    ADD COLUMN IF NOT EXISTS npwp VARCHAR(35),
    ADD COLUMN IF NOT EXISTS pic_nama VARCHAR(100),
    ADD COLUMN IF NOT EXISTS plafon_kredit NUMERIC(15, 2) NOT NULL DEFAULT 0
        CHECK (plafon_kredit >= 0),
    ADD COLUMN IF NOT EXISTS sisa_plafon NUMERIC(15, 2) NOT NULL DEFAULT 0
        CHECK (sisa_plafon >= 0);

-- Pastikan sisa_plafon tidak melebihi plafon_kredit
ALTER TABLE pelanggan
    DROP CONSTRAINT IF EXISTS chk_sisa_plafon_valid;

ALTER TABLE pelanggan
    ADD CONSTRAINT chk_sisa_plafon_valid
    CHECK (sisa_plafon <= plafon_kredit);

-- ============================================================================
-- 2. TABEL BARU: KONTRAK KORPORAT (Kontrak Servis Bulanan Armada B2B)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kontrak_korporat (
    id SERIAL PRIMARY KEY,
    nomor_kontrak VARCHAR(35) UNIQUE NOT NULL,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE RESTRICT,
    cabang_utama_id INTEGER REFERENCES cabang(id) ON DELETE SET NULL,
    nama_kontrak VARCHAR(150) NOT NULL,
    jenis_armada VARCHAR(50) NOT NULL DEFAULT 'KURIR_LOGISTIK'
        CHECK (jenis_armada IN ('KURIR_LOGISTIK', 'RENTAL_MOTOR', 'OPERASIONAL_KANTOR')),
    tanggal_mulai DATE NOT NULL,
    tanggal_berakhir DATE NOT NULL,
    kuota_servis_bulanan INTEGER NOT NULL DEFAULT 25 CHECK (kuota_servis_bulanan > 0),
    diskon_kontrak_persen NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (diskon_kontrak_persen BETWEEN 0 AND 100),
    sla_jam_pengerjaan INTEGER NOT NULL DEFAULT 24 CHECK (sla_jam_pengerjaan > 0),
    status_kontrak VARCHAR(20) NOT NULL DEFAULT 'AKTIF'
        CHECK (status_kontrak IN ('AKTIF', 'BERAKHIR', 'DIBEKUKAN')),
    catatan TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_periode_kontrak CHECK (tanggal_berakhir >= tanggal_mulai)
);

-- ============================================================================
-- 3. ALTER TABLE WORK_ORDER: Integrasi Kontrak & Skema Pembayaran Korporat
-- ============================================================================
ALTER TABLE work_order
    ADD COLUMN IF NOT EXISTS kontrak_id INTEGER REFERENCES kontrak_korporat(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS skema_pembayaran VARCHAR(25) NOT NULL DEFAULT 'LANGSUNG'
        CHECK (skema_pembayaran IN ('LANGSUNG', 'TAGIHAN_KOLEKTIF'));

-- ============================================================================
-- 4. TABEL BARU: TAGIHAN KOLEKTIF & TAGIHAN KOLEKTIF DETAIL (Invoicing Akhir Bulan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tagihan_kolektif (
    id SERIAL PRIMARY KEY,
    nomor_invoice VARCHAR(35) UNIQUE NOT NULL,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE RESTRICT,
    kontrak_id INTEGER REFERENCES kontrak_korporat(id) ON DELETE SET NULL,
    periode_bulan INTEGER NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
    periode_tahun INTEGER NOT NULL CHECK (periode_tahun BETWEEN 2020 AND 2050),
    tanggal_terbit DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_jatuh_tempo DATE NOT NULL,
    total_wo INTEGER NOT NULL DEFAULT 0 CHECK (total_wo >= 0),
    total_tagihan NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_tagihan >= 0),
    status_tagihan VARCHAR(25) NOT NULL DEFAULT 'BELUM_DIBAYAR'
        CHECK (status_tagihan IN ('BELUM_DIBAYAR', 'LUNAS', 'JATUH_TEMPO')),
    tanggal_lunas TIMESTAMP,
    metode_pelunasan VARCHAR(30),
    referensi_pembayaran VARCHAR(100),
    catatan TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tagihan_kolektif_detail (
    id SERIAL PRIMARY KEY,
    tagihan_kolektif_id INTEGER NOT NULL REFERENCES tagihan_kolektif(id) ON DELETE CASCADE,
    work_order_id INTEGER UNIQUE NOT NULL REFERENCES work_order(id) ON DELETE RESTRICT,
    motor_id INTEGER NOT NULL REFERENCES motor(id) ON DELETE RESTRICT,
    nominal_wo NUMERIC(15, 2) NOT NULL CHECK (nominal_wo >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kontrak_pelanggan ON kontrak_korporat(pelanggan_id, status_kontrak);
CREATE INDEX IF NOT EXISTS idx_tagihan_kolektif_pelanggan ON tagihan_kolektif(pelanggan_id, status_tagihan);
CREATE INDEX IF NOT EXISTS idx_wo_kontrak ON work_order(kontrak_id);

-- ============================================================================
-- 5. TRIGGER & STORED PROCEDURE KORPORAT: Validasi Kecukupan Sisa Plafon Kredit
-- ============================================================================

-- 5A. Trigger saat Work Order baru dibuat: otomatis deteksi kontrak korporat & validasi plafon awal
CREATE OR REPLACE FUNCTION fn_attach_corporate_contract_on_wo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_pelanggan_id INTEGER;
    v_tipe_pelanggan VARCHAR(20);
    v_sisa_plafon NUMERIC(15, 2);
    v_nama_perusahaan VARCHAR(150);
    v_kontrak_id INTEGER;
BEGIN
    SELECT m.pelanggan_id, p.tipe_pelanggan, p.sisa_plafon, COALESCE(p.nama_perusahaan, p.nama_pelanggan)
    INTO v_pelanggan_id, v_tipe_pelanggan, v_sisa_plafon, v_nama_perusahaan
    FROM motor m
    JOIN pelanggan p ON p.id = m.pelanggan_id
    WHERE m.id = NEW.motor_id;

    IF v_tipe_pelanggan = 'KORPORAT' THEN
        -- Cari kontrak aktif jika belum diisi
        IF NEW.kontrak_id IS NULL THEN
            SELECT id INTO v_kontrak_id
            FROM kontrak_korporat
            WHERE pelanggan_id = v_pelanggan_id
              AND status_kontrak = 'AKTIF'
            ORDER BY tanggal_berakhir DESC
            LIMIT 1;

            NEW.kontrak_id := v_kontrak_id;
        END IF;

        -- Default skema pembayaran korporat ke TAGIHAN_KOLEKTIF
        IF NEW.skema_pembayaran IS NULL OR NEW.skema_pembayaran = 'LANGSUNG' THEN
            NEW.skema_pembayaran := 'TAGIHAN_KOLEKTIF';
        END IF;

        -- Pastikan sisa_plafon tidak 0 saat mendaftarkan servis korporat dengan skema kolektif
        IF NEW.skema_pembayaran = 'TAGIHAN_KOLEKTIF' AND v_sisa_plafon <= 0 THEN
            RAISE EXCEPTION 'Sisa plafon kredit korporat % sudah habis (Rp 0). Harap lunasi tagihan berjalan terlebih dahulu.',
                v_nama_perusahaan
                USING ERRCODE = 'P0004';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attach_corporate_contract_on_wo ON work_order;
CREATE TRIGGER trg_attach_corporate_contract_on_wo
BEFORE INSERT ON work_order
FOR EACH ROW
EXECUTE FUNCTION fn_attach_corporate_contract_on_wo();

-- 5B. Perbarui Trigger Rekalkulasi Total WO agar memvalidasi kecukupan sisa_plafon pelanggan korporat
CREATE OR REPLACE FUNCTION fn_recalculate_wo_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_wo_id INTEGER;
    v_total_jasa NUMERIC(15, 2);
    v_total_part NUMERIC(15, 2);
    v_diskon NUMERIC(15, 2);
    v_total_baru NUMERIC(15, 2);
    v_tipe_pelanggan VARCHAR(20);
    v_sisa_plafon NUMERIC(15, 2);
    v_nama_perusahaan VARCHAR(150);
    v_skema_pembayaran VARCHAR(25);
    v_wo_status VARCHAR(20);
    v_outstanding_other_wo NUMERIC(15, 2);
    v_pelanggan_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_wo_id := OLD.work_order_id;
    ELSE
        v_wo_id := NEW.work_order_id;
    END IF;

    SELECT COALESCE(SUM(subtotal), 0) INTO v_total_jasa
    FROM work_order_servis
    WHERE work_order_id = v_wo_id;

    SELECT COALESCE(SUM(subtotal), 0) INTO v_total_part
    FROM work_order_suku_cadang
    WHERE work_order_id = v_wo_id;

    SELECT COALESCE(wo.diskon, 0), wo.skema_pembayaran, wo.status, p.id, p.tipe_pelanggan, p.sisa_plafon, COALESCE(p.nama_perusahaan, p.nama_pelanggan)
    INTO v_diskon, v_skema_pembayaran, v_wo_status, v_pelanggan_id, v_tipe_pelanggan, v_sisa_plafon, v_nama_perusahaan
    FROM work_order wo
    JOIN motor m ON m.id = wo.motor_id
    JOIN pelanggan p ON p.id = m.pelanggan_id
    WHERE wo.id = v_wo_id;

    v_total_baru := GREATEST(0, v_total_jasa + v_total_part - v_diskon);

    -- Validasi kecukupan sisa_plafon jika pelanggan KORPORAT dan WO belum dibayar/dibatalkan
    IF v_tipe_pelanggan = 'KORPORAT' AND v_skema_pembayaran = 'TAGIHAN_KOLEKTIF' AND v_wo_status NOT IN ('dibayar', 'dibatalkan') THEN
        -- Hitung total WO aktif lainnya milik perusahaan ini yang belum dipotong dari sisa_plafon
        SELECT COALESCE(SUM(wo2.total_tagihan), 0)
        INTO v_outstanding_other_wo
        FROM work_order wo2
        JOIN motor m2 ON m2.id = wo2.motor_id
        WHERE m2.pelanggan_id = v_pelanggan_id
          AND wo2.id <> v_wo_id
          AND wo2.skema_pembayaran = 'TAGIHAN_KOLEKTIF'
          AND wo2.status IN ('antre', 'dikerjakan', 'selesai');

        IF (v_total_baru + v_outstanding_other_wo) > v_sisa_plafon THEN
            RAISE EXCEPTION 'Total tagihan servis korporat % (Rp %) melebihi sisa plafon kredit yang tersedia (Sisa Plafon: Rp %, Beban WO Aktif Lain: Rp %).',
                v_nama_perusahaan, v_total_baru, v_sisa_plafon, v_outstanding_other_wo
                USING ERRCODE = 'P0004';
        END IF;
    END IF;

    UPDATE work_order
    SET total_biaya_jasa = v_total_jasa,
        total_biaya_part = v_total_part,
        total_tagihan = v_total_baru
    WHERE id = v_wo_id;

    RETURN NULL;
END;
$$;

-- 5C. Trigger Validasi & Pemotongan Sisa Plafon saat Pembayaran menggunakan PLAFON_KORPORAT
CREATE OR REPLACE FUNCTION fn_validate_and_process_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_wo_status VARCHAR(20);
    v_total_tagihan NUMERIC(15, 2);
    v_pelanggan_id INTEGER;
    v_tipe_pelanggan VARCHAR(20);
    v_sisa_plafon NUMERIC(15, 2);
    v_nama_perusahaan VARCHAR(150);
BEGIN
    SELECT wo.status, wo.total_tagihan, p.id, p.tipe_pelanggan, p.sisa_plafon, COALESCE(p.nama_perusahaan, p.nama_pelanggan)
    INTO v_wo_status, v_total_tagihan, v_pelanggan_id, v_tipe_pelanggan, v_sisa_plafon, v_nama_perusahaan
    FROM work_order wo
    JOIN motor m ON m.id = wo.motor_id
    JOIN pelanggan p ON p.id = m.pelanggan_id
    WHERE wo.id = NEW.work_order_id
    FOR UPDATE OF wo, p;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Work Order dengan ID % tidak ditemukan.', NEW.work_order_id
            USING ERRCODE = 'P0003';
    END IF;

    -- Skenario Debugging #2: Tolak pembayaran jika status sudah 'dibayar'
    IF v_wo_status = 'dibayar' THEN
        RAISE EXCEPTION 'Pembayaran ditolak! Work Order sudah berstatus dibayar (Double Payment terdeteksi).'
            USING ERRCODE = '23505';
    END IF;

    IF v_wo_status = 'dibatalkan' THEN
        RAISE EXCEPTION 'Work Order yang sudah dibatalkan tidak dapat dilakukan pembayaran.'
            USING ERRCODE = 'P0002';
    END IF;

    -- Jika metode pembayaran menggunakan PLAFON_KORPORAT, wajib pelanggan KORPORAT & cek sisa_plafon
    IF NEW.metode_pembayaran = 'PLAFON_KORPORAT' THEN
        IF v_tipe_pelanggan <> 'KORPORAT' THEN
            RAISE EXCEPTION 'Metode pembayaran PLAFON_KORPORAT hanya berlaku untuk pelanggan KORPORAT.'
                USING ERRCODE = 'P0004';
        END IF;

        IF NEW.jumlah_bayar > v_sisa_plafon THEN
            RAISE EXCEPTION 'Sisa plafon kredit % tidak mencukupi! Tagihan: Rp %, Sisa Plafon: Rp %',
                v_nama_perusahaan, NEW.jumlah_bayar, v_sisa_plafon
                USING ERRCODE = 'P0004';
        END IF;

        -- Kurangi sisa_plafon pelanggan korporat
        UPDATE pelanggan
        SET sisa_plafon = sisa_plafon - NEW.jumlah_bayar
        WHERE id = v_pelanggan_id;

        NEW.status_pembayaran := 'TERTUNDA_KOLEKTIF';
    END IF;

    -- Perbarui status Work Order menjadi 'dibayar' dan pastikan waktu_selesai terisi
    UPDATE work_order
    SET status = 'dibayar',
        waktu_selesai = COALESCE(waktu_selesai, CURRENT_TIMESTAMP)
    WHERE id = NEW.work_order_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_and_process_payment ON pembayaran;
CREATE TRIGGER trg_validate_and_process_payment
BEFORE INSERT ON pembayaran
FOR EACH ROW
EXECUTE FUNCTION fn_validate_and_process_payment();

-- 5D. Stored Function untuk Melunasi Tagihan Kolektif & Memulihkan Sisa Plafon Korporat
CREATE OR REPLACE FUNCTION sp_lunasi_tagihan_kolektif(
    p_tagihan_id INTEGER,
    p_metode_pelunasan VARCHAR(30),
    p_referensi VARCHAR(100)
)
RETURNS TABLE (
    invoice_id INTEGER,
    nomor_invoice VARCHAR(35),
    total_dilunasi NUMERIC(15, 2),
    sisa_plafon_baru NUMERIC(15, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pelanggan_id INTEGER;
    v_total_tagihan NUMERIC(15, 2);
    v_status_tagihan VARCHAR(25);
    v_nomor_invoice VARCHAR(35);
    v_plafon_kredit NUMERIC(15, 2);
    v_sisa_baru NUMERIC(15, 2);
BEGIN
    SELECT tk.pelanggan_id, tk.total_tagihan, tk.status_tagihan, tk.nomor_invoice, p.plafon_kredit
    INTO v_pelanggan_id, v_total_tagihan, v_status_tagihan, v_nomor_invoice, v_plafon_kredit
    FROM tagihan_kolektif tk
    JOIN pelanggan p ON p.id = tk.pelanggan_id
    WHERE tk.id = p_tagihan_id
    FOR UPDATE OF tk, p;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tagihan kolektif dengan ID % tidak ditemukan.', p_tagihan_id
            USING ERRCODE = 'P0003';
    END IF;

    IF v_status_tagihan = 'LUNAS' THEN
        RAISE EXCEPTION 'Tagihan kolektif % sudah berstatus LUNAS.', v_nomor_invoice
            USING ERRCODE = '23505';
    END IF;

    -- Update status tagihan kolektif menjadi LUNAS
    UPDATE tagihan_kolektif
    SET status_tagihan = 'LUNAS',
        tanggal_lunas = CURRENT_TIMESTAMP,
        metode_pelunasan = COALESCE(p_metode_pelunasan, 'TRANSFER_KORPORAT'),
        referensi_pembayaran = p_referensi
    WHERE id = p_tagihan_id;

    -- Update semua pembayaran terkait WO di dalam tagihan kolektif ini menjadi LUNAS
    UPDATE pembayaran pb
    SET status_pembayaran = 'LUNAS'
    FROM tagihan_kolektif_detail tkd
    WHERE tkd.tagihan_kolektif_id = p_tagihan_id
      AND pb.work_order_id = tkd.work_order_id;

    -- Pulihkan sisa_plafon pelanggan korporat (maksimal sebesar plafon_kredit)
    UPDATE pelanggan
    SET sisa_plafon = LEAST(plafon_kredit, sisa_plafon + v_total_tagihan)
    WHERE id = v_pelanggan_id
    RETURNING sisa_plafon INTO v_sisa_baru;

    RETURN QUERY SELECT p_tagihan_id, v_nomor_invoice, v_total_tagihan, v_sisa_baru;
END;
$$;

-- ============================================================================
-- 6. PEMBARUAN VIEWS (MENDUKUNG ATRIBUT PELANGGAN KORPORAT & KONTRAK)
-- ============================================================================

-- Perbarui VIEW 1: Laporan Riwayat Servis per Motor (dengan info Korporat & Kontrak)
DROP VIEW IF EXISTS vw_laporan_riwayat_motor;
CREATE OR REPLACE VIEW vw_laporan_riwayat_motor AS
SELECT
    wo.id AS work_order_id,
    wo.nomor_wo,
    wo.waktu_masuk,
    wo.waktu_selesai,
    wo.status AS status_wo,
    wo.skema_pembayaran,
    m.id AS motor_id,
    m.plat_nomor,
    m.merk,
    m.tipe AS tipe_motor,
    m.tahun AS tahun_motor,
    wo.kilometer_masuk,
    p.id AS pelanggan_id,
    p.kode_pelanggan,
    p.nama_pelanggan,
    p.tipe_pelanggan,
    COALESCE(p.nama_perusahaan, '-') AS nama_perusahaan,
    kk.nomor_kontrak,
    c.id AS cabang_id,
    c.kode_cabang,
    c.nama_cabang,
    u_mek.nama_lengkap AS nama_mekanik,
    wo.keluhan,
    wo.catatan_mekanik,
    COALESCE(
        (SELECT STRING_AGG(js.nama_jasa, ', ' ORDER BY js.nama_jasa)
         FROM work_order_servis wos
         JOIN jasa_servis js ON js.id = wos.jasa_servis_id
         WHERE wos.work_order_id = wo.id),
        '-'
    ) AS daftar_jasa_servis,
    COALESCE(
        (SELECT STRING_AGG(sc.nama_part || ' (x' || wosc.jumlah || ')', ', ' ORDER BY sc.nama_part)
         FROM work_order_suku_cadang wosc
         JOIN suku_cadang sc ON sc.id = wosc.suku_cadang_id
         WHERE wosc.work_order_id = wo.id),
        '-'
    ) AS daftar_suku_cadang,
    wo.total_biaya_jasa,
    wo.total_biaya_part,
    wo.diskon,
    wo.total_tagihan
FROM work_order wo
JOIN motor m ON m.id = wo.motor_id
JOIN pelanggan p ON p.id = m.pelanggan_id
JOIN cabang c ON c.id = wo.cabang_id
LEFT JOIN users u_mek ON u_mek.id = wo.mekanik_id
LEFT JOIN kontrak_korporat kk ON kk.id = wo.kontrak_id;

-- Perbarui VIEW 2: Laporan Total Pendapatan per Cabang (dengan segmen B2C/B2B)
DROP VIEW IF EXISTS vw_laporan_pendapatan_cabang;
CREATE OR REPLACE VIEW vw_laporan_pendapatan_cabang AS
SELECT
    pb.id AS pembayaran_id,
    pb.nomor_kwitansi,
    pb.tanggal_bayar,
    DATE(pb.tanggal_bayar) AS tanggal_transaksi,
    pb.metode_pembayaran,
    pb.status_pembayaran,
    pb.jumlah_bayar,
    wo.id AS work_order_id,
    wo.nomor_wo,
    wo.skema_pembayaran,
    wo.total_biaya_jasa,
    wo.total_biaya_part,
    wo.diskon,
    wo.total_tagihan,
    c.id AS cabang_id,
    c.kode_cabang,
    c.nama_cabang,
    c.kota AS kota_cabang,
    m.plat_nomor,
    p.nama_pelanggan,
    p.tipe_pelanggan,
    COALESCE(p.nama_perusahaan, p.nama_pelanggan) AS entitas_penagihan,
    u_kasir.nama_lengkap AS nama_kasir
FROM pembayaran pb
JOIN work_order wo ON wo.id = pb.work_order_id
JOIN cabang c ON c.id = wo.cabang_id
JOIN motor m ON m.id = wo.motor_id
JOIN pelanggan p ON p.id = m.pelanggan_id
LEFT JOIN users u_kasir ON u_kasir.id = pb.kasir_id
WHERE wo.status = 'dibayar';

-- VIEW BARU 5: Monitoring Kontrak & Plafon Kredit Pelanggan Korporat
CREATE OR REPLACE VIEW vw_monitoring_plafon_korporat AS
SELECT
    p.id AS pelanggan_id,
    p.kode_pelanggan,
    p.nama_pelanggan,
    p.nama_perusahaan,
    p.npwp,
    p.pic_nama,
    p.telepon,
    p.email,
    p.plafon_kredit,
    p.sisa_plafon,
    (p.plafon_kredit - p.sisa_plafon) AS plafon_terpakai,
    CASE
        WHEN p.plafon_kredit > 0 THEN ROUND(((p.plafon_kredit - p.sisa_plafon) / p.plafon_kredit) * 100, 2)
        ELSE 0
    END AS persentase_utilisasi_plafon,
    kk.id AS kontrak_id,
    kk.nomor_kontrak,
    kk.nama_kontrak,
    kk.jenis_armada,
    kk.tanggal_mulai,
    kk.tanggal_berakhir,
    kk.kuota_servis_bulanan,
    kk.diskon_kontrak_persen,
    kk.sla_jam_pengerjaan,
    kk.status_kontrak,
    c.nama_cabang AS cabang_utama,
    (SELECT COUNT(*) FROM motor m WHERE m.pelanggan_id = p.id) AS total_unit_armada,
    (SELECT COUNT(*)
     FROM work_order wo
     JOIN motor m ON m.id = wo.motor_id
     WHERE m.pelanggan_id = p.id
       AND wo.status IN ('antre', 'dikerjakan', 'selesai')) AS wo_aktif_berjalan
FROM pelanggan p
LEFT JOIN kontrak_korporat kk ON kk.pelanggan_id = p.id AND kk.status_kontrak = 'AKTIF'
LEFT JOIN cabang c ON c.id = kk.cabang_utama_id
WHERE p.tipe_pelanggan = 'KORPORAT';

COMMIT;

