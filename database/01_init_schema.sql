-- ============================================================================
-- KALAWA SERVICE — WORKSHOP MANAGEMENT & CORPORATE BILLING ERP
-- File: 01_init_schema.sql
-- Deskripsi: Skema Awal Basis Data (B2C Workshop Operasional Inti)
-- Database Engine: PostgreSQL 15+
-- ============================================================================

BEGIN;

-- Bersihkan objek lama jika skrip dijalankan ulang (Idempotent Drop)
DROP VIEW IF EXISTS vw_monitoring_plafon_korporat CASCADE;
DROP VIEW IF EXISTS vw_laporan_stok_minimum CASCADE;
DROP VIEW IF EXISTS vw_laporan_penggunaan_part CASCADE;
DROP VIEW IF EXISTS vw_laporan_pendapatan_cabang CASCADE;
DROP VIEW IF EXISTS vw_laporan_riwayat_motor CASCADE;

DROP TABLE IF EXISTS tagihan_kolektif_detail CASCADE;
DROP TABLE IF EXISTS tagihan_kolektif CASCADE;
DROP TABLE IF EXISTS kontrak_korporat CASCADE;
DROP TABLE IF EXISTS pembayaran CASCADE;
DROP TABLE IF EXISTS work_order_suku_cadang CASCADE;
DROP TABLE IF EXISTS work_order_servis CASCADE;
DROP TABLE IF EXISTS work_order CASCADE;
DROP TABLE IF EXISTS suku_cadang CASCADE;
DROP TABLE IF EXISTS supplier CASCADE;
DROP TABLE IF EXISTS jasa_servis CASCADE;
DROP TABLE IF EXISTS motor CASCADE;
DROP TABLE IF EXISTS pelanggan CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cabang CASCADE;

-- ============================================================================
-- 1. TABEL MASTER: CABANG
-- ============================================================================
CREATE TABLE cabang (
    id SERIAL PRIMARY KEY,
    kode_cabang VARCHAR(20) UNIQUE NOT NULL,
    nama_cabang VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    kota VARCHAR(60) NOT NULL,
    telepon VARCHAR(25) NOT NULL,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. TABEL MASTER: USERS (RBAC 4 ROLES)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    cabang_id INTEGER NOT NULL REFERENCES cabang(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin_cabang', 'kasir', 'mekanik', 'gudang')),
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. TABEL MASTER: PELANGGAN (Awalnya Hanya Pelanggan Individu / B2C)
-- ============================================================================
CREATE TABLE pelanggan (
    id SERIAL PRIMARY KEY,
    kode_pelanggan VARCHAR(25) UNIQUE NOT NULL,
    nama_pelanggan VARCHAR(120) NOT NULL,
    telepon VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    alamat TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. TABEL MASTER: MOTOR
-- ============================================================================
CREATE TABLE motor (
    id SERIAL PRIMARY KEY,
    pelanggan_id INTEGER NOT NULL REFERENCES pelanggan(id) ON DELETE RESTRICT,
    plat_nomor VARCHAR(20) UNIQUE NOT NULL,
    merk VARCHAR(50) NOT NULL,
    tipe VARCHAR(80) NOT NULL,
    tahun INTEGER NOT NULL CHECK (tahun BETWEEN 1990 AND 2035),
    warna VARCHAR(40),
    nomor_rangka VARCHAR(50) UNIQUE NOT NULL,
    kilometer_terakhir INTEGER NOT NULL DEFAULT 0 CHECK (kilometer_terakhir >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. TABEL MASTER: JASA SERVIS
-- ============================================================================
CREATE TABLE jasa_servis (
    id SERIAL PRIMARY KEY,
    kode_jasa VARCHAR(25) UNIQUE NOT NULL,
    nama_jasa VARCHAR(120) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    harga_jasa NUMERIC(15, 2) NOT NULL CHECK (harga_jasa >= 0),
    estimasi_menit INTEGER NOT NULL DEFAULT 30 CHECK (estimasi_menit > 0),
    deskripsi TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. TABEL MASTER: SUPPLIER
-- ============================================================================
CREATE TABLE supplier (
    id SERIAL PRIMARY KEY,
    kode_supplier VARCHAR(25) UNIQUE NOT NULL,
    nama_supplier VARCHAR(120) NOT NULL,
    kontak_person VARCHAR(80) NOT NULL,
    telepon VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    alamat TEXT NOT NULL,
    kota VARCHAR(60) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. TABEL MASTER: SUKU CADANG (SPAREPARTS)
-- ============================================================================
CREATE TABLE suku_cadang (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    kode_sku VARCHAR(30) UNIQUE NOT NULL,
    nama_part VARCHAR(120) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    satuan VARCHAR(20) NOT NULL DEFAULT 'PCS',
    harga_beli NUMERIC(15, 2) NOT NULL CHECK (harga_beli >= 0),
    harga_jual NUMERIC(15, 2) NOT NULL CHECK (harga_jual >= 0),
    stok_saat_ini INTEGER NOT NULL DEFAULT 0 CHECK (stok_saat_ini >= 0),
    stok_minimum INTEGER NOT NULL DEFAULT 5 CHECK (stok_minimum >= 0),
    lokasi_rak VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. TABEL TRANSAKSI: WORK ORDER (WO)
--    Skenario Debugging #1: motor_id wajib NOT NULL dan REFERENCES motor(id)
-- ============================================================================
CREATE TABLE work_order (
    id SERIAL PRIMARY KEY,
    nomor_wo VARCHAR(30) UNIQUE NOT NULL,
    cabang_id INTEGER NOT NULL REFERENCES cabang(id) ON DELETE RESTRICT,
    motor_id INTEGER NOT NULL REFERENCES motor(id) ON DELETE RESTRICT,
    mekanik_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kasir_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    keluhan TEXT NOT NULL,
    catatan_mekanik TEXT,
    kilometer_masuk INTEGER NOT NULL DEFAULT 0 CHECK (kilometer_masuk >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'antre'
        CHECK (status IN ('antre', 'dikerjakan', 'selesai', 'dibayar', 'dibatalkan')),
    total_biaya_jasa NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_biaya_jasa >= 0),
    total_biaya_part NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_biaya_part >= 0),
    diskon NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (diskon >= 0),
    total_tagihan NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_tagihan >= 0),
    waktu_masuk TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    waktu_selesai TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. TABEL TRANSAKSI: WORK ORDER SERVIS (DETAIL JASA)
-- ============================================================================
CREATE TABLE work_order_servis (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_order(id) ON DELETE CASCADE,
    jasa_servis_id INTEGER NOT NULL REFERENCES jasa_servis(id) ON DELETE RESTRICT,
    harga_satuan NUMERIC(15, 2) NOT NULL CHECK (harga_satuan >= 0),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    catatan VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. TABEL TRANSAKSI: WORK ORDER SUKU CADANG (DETAIL SPAREPART)
-- ============================================================================
CREATE TABLE work_order_suku_cadang (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_order(id) ON DELETE CASCADE,
    suku_cadang_id INTEGER NOT NULL REFERENCES suku_cadang(id) ON DELETE RESTRICT,
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    harga_satuan NUMERIC(15, 2) NOT NULL CHECK (harga_satuan >= 0),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. TABEL TRANSAKSI: PEMBAYARAN
--     Skenario Debugging #2: UNIQUE (work_order_id) mencegah Double Payment!
-- ============================================================================
CREATE TABLE pembayaran (
    id SERIAL PRIMARY KEY,
    nomor_kwitansi VARCHAR(30) UNIQUE NOT NULL,
    work_order_id INTEGER UNIQUE NOT NULL REFERENCES work_order(id) ON DELETE RESTRICT,
    kasir_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metode_pembayaran VARCHAR(30) NOT NULL
        CHECK (metode_pembayaran IN ('TUNAI', 'TRANSFER', 'QRIS', 'PLAFON_KORPORAT')),
    jumlah_bayar NUMERIC(15, 2) NOT NULL CHECK (jumlah_bayar >= 0),
    status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'LUNAS'
        CHECK (status_pembayaran IN ('LUNAS', 'TERTUNDA_KOLEKTIF', 'DIBATALKAN')),
    catatan TEXT,
    tanggal_bayar TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEKS PERFORMA QUERY
-- ============================================================================
CREATE INDEX idx_motor_pelanggan ON motor(pelanggan_id);
CREATE INDEX idx_wo_cabang_status ON work_order(cabang_id, status);
CREATE INDEX idx_wo_motor ON work_order(motor_id);
CREATE INDEX idx_wo_waktu_masuk ON work_order(waktu_masuk);
CREATE INDEX idx_pembayaran_tanggal ON pembayaran(tanggal_bayar);
CREATE INDEX idx_suku_cadang_stok ON suku_cadang(stok_saat_ini, stok_minimum);

-- ============================================================================
-- TRIGGERS & STORED FUNCTIONS (PL/pgSQL)
-- ============================================================================

-- 1. Trigger Validasi & Pengurangan Stok Suku Cadang (Skenario Debugging #3)
CREATE OR REPLACE FUNCTION fn_validate_and_deduct_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stok_saat_ini INTEGER;
    v_harga_jual NUMERIC(15, 2);
    v_nama_part VARCHAR(120);
    v_kode_sku VARCHAR(30);
    v_wo_status VARCHAR(20);
BEGIN
    -- Pastikan status Work Order masih boleh diubah
    SELECT status INTO v_wo_status
    FROM work_order
    WHERE id = NEW.work_order_id;

    IF v_wo_status IN ('dibayar', 'dibatalkan') THEN
        RAISE EXCEPTION 'Work Order sudah berstatus % dan tidak dapat ditambahkan suku cadang baru.', v_wo_status
            USING ERRCODE = 'P0002';
    END IF;

    -- Kunci baris suku cadang (FOR UPDATE) untuk mencegah race condition
    SELECT stok_saat_ini, harga_jual, nama_part, kode_sku
    INTO v_stok_saat_ini, v_harga_jual, v_nama_part, v_kode_sku
    FROM suku_cadang
    WHERE id = NEW.suku_cadang_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Suku cadang dengan ID % tidak ditemukan.', NEW.suku_cadang_id
            USING ERRCODE = 'P0003';
    END IF;

    -- Validasi kecukupan stok (Skenario #3: Stok Suku Cadang Tidak Cukup)
    IF NEW.jumlah > v_stok_saat_ini THEN
        RAISE EXCEPTION 'Stok suku cadang % (%) tidak mencukupi! Permintaan: %, Sisa stok tersedia: %',
            v_nama_part, v_kode_sku, NEW.jumlah, v_stok_saat_ini
            USING ERRCODE = 'P0001';
    END IF;

    -- Isi harga_satuan default dari master jika 0, lalu hitung subtotal
    IF NEW.harga_satuan IS NULL OR NEW.harga_satuan = 0 THEN
        NEW.harga_satuan := v_harga_jual;
    END IF;
    NEW.subtotal := NEW.jumlah * NEW.harga_satuan;

    -- Kurangi stok suku cadang
    UPDATE suku_cadang
    SET stok_saat_ini = stok_saat_ini - NEW.jumlah
    WHERE id = NEW.suku_cadang_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_and_deduct_stock
BEFORE INSERT ON work_order_suku_cadang
FOR EACH ROW
EXECUTE FUNCTION fn_validate_and_deduct_stock();

-- 2. Trigger Pengembalian Stok jika item dihapus dari Work Order
CREATE OR REPLACE FUNCTION fn_restore_stock_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_wo_status VARCHAR(20);
BEGIN
    SELECT status INTO v_wo_status FROM work_order WHERE id = OLD.work_order_id;
    -- Kembalikan stok jika WO belum dibatalkan (karena jika dibatalkan sudah dikembalikan oleh trigger status WO)
    IF v_wo_status IS DISTINCT FROM 'dibatalkan' THEN
        UPDATE suku_cadang
        SET stok_saat_ini = stok_saat_ini + OLD.jumlah
        WHERE id = OLD.suku_cadang_id;
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_restore_stock_on_item_delete
AFTER DELETE ON work_order_suku_cadang
FOR EACH ROW
EXECUTE FUNCTION fn_restore_stock_on_item_delete();

-- 3. Trigger Kalkulasi Otomatis Subtotal Jasa Servis
CREATE OR REPLACE FUNCTION fn_prepare_wo_servis()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_harga_jasa NUMERIC(15, 2);
    v_wo_status VARCHAR(20);
BEGIN
    SELECT status INTO v_wo_status FROM work_order WHERE id = NEW.work_order_id;
    IF v_wo_status IN ('dibayar', 'dibatalkan') THEN
        RAISE EXCEPTION 'Work Order sudah berstatus % dan tidak dapat ditambahkan jasa servis baru.', v_wo_status
            USING ERRCODE = 'P0002';
    END IF;

    SELECT harga_jasa INTO v_harga_jasa FROM jasa_servis WHERE id = NEW.jasa_servis_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jasa servis dengan ID % tidak ditemukan.', NEW.jasa_servis_id
            USING ERRCODE = 'P0003';
    END IF;

    IF NEW.harga_satuan IS NULL OR NEW.harga_satuan = 0 THEN
        NEW.harga_satuan := v_harga_jasa;
    END IF;
    NEW.subtotal := NEW.harga_satuan;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prepare_wo_servis
BEFORE INSERT ON work_order_servis
FOR EACH ROW
EXECUTE FUNCTION fn_prepare_wo_servis();

-- 4. Trigger Rekalkulasi Total Tagihan Work Order
CREATE OR REPLACE FUNCTION fn_recalculate_wo_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_wo_id INTEGER;
    v_total_jasa NUMERIC(15, 2);
    v_total_part NUMERIC(15, 2);
    v_diskon NUMERIC(15, 2);
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

    SELECT COALESCE(diskon, 0) INTO v_diskon
    FROM work_order
    WHERE id = v_wo_id;

    UPDATE work_order
    SET total_biaya_jasa = v_total_jasa,
        total_biaya_part = v_total_part,
        total_tagihan = GREATEST(0, v_total_jasa + v_total_part - v_diskon)
    WHERE id = v_wo_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_wo_on_servis
AFTER INSERT OR UPDATE OR DELETE ON work_order_servis
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_wo_totals();

CREATE TRIGGER trg_recalc_wo_on_part
AFTER INSERT OR UPDATE OR DELETE ON work_order_suku_cadang
FOR EACH ROW
EXECUTE FUNCTION fn_recalculate_wo_totals();

-- 5. Trigger Perubahan Status Work Order (Kembalikan stok saat dibatalkan & catat waktu selesai)
CREATE OR REPLACE FUNCTION fn_handle_wo_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    r_part RECORD;
BEGIN
    -- Jika status berubah menjadi 'selesai' dan waktu_selesai belum terisi
    IF NEW.status = 'selesai' AND OLD.status <> 'selesai' AND NEW.waktu_selesai IS NULL THEN
        NEW.waktu_selesai := CURRENT_TIMESTAMP;
    END IF;

    -- Jika status berubah menjadi 'dibatalkan' dari status bukan 'dibatalkan'
    IF NEW.status = 'dibatalkan' AND OLD.status <> 'dibatalkan' THEN
        IF OLD.status = 'dibayar' THEN
            RAISE EXCEPTION 'Work Order yang sudah dibayar tidak dapat dibatalkan.'
                USING ERRCODE = 'P0002';
        END IF;

        -- Kembalikan semua stok suku cadang yang terpakai pada WO ini
        FOR r_part IN
            SELECT suku_cadang_id, jumlah
            FROM work_order_suku_cadang
            WHERE work_order_id = NEW.id
        LOOP
            UPDATE suku_cadang
            SET stok_saat_ini = stok_saat_ini + r_part.jumlah
            WHERE id = r_part.suku_cadang_id;
        END LOOP;
    END IF;

    -- Rekalkulasi total_tagihan jika diskon berubah
    IF NEW.diskon IS DISTINCT FROM OLD.diskon THEN
        NEW.total_tagihan := GREATEST(0, NEW.total_biaya_jasa + NEW.total_biaya_part - NEW.diskon);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_wo_status_change
BEFORE UPDATE ON work_order
FOR EACH ROW
EXECUTE FUNCTION fn_handle_wo_status_change();

-- ============================================================================
-- VIEWS UNTUK 4 LAPORAN MULTI-TABLE JOIN (VERSI AWAL B2C)
-- ============================================================================

-- VIEW 1: Laporan Riwayat Servis per Motor
CREATE OR REPLACE VIEW vw_laporan_riwayat_motor AS
SELECT
    wo.id AS work_order_id,
    wo.nomor_wo,
    wo.waktu_masuk,
    wo.waktu_selesai,
    wo.status AS status_wo,
    m.id AS motor_id,
    m.plat_nomor,
    m.merk,
    m.tipe AS tipe_motor,
    m.tahun AS tahun_motor,
    wo.kilometer_masuk,
    p.id AS pelanggan_id,
    p.kode_pelanggan,
    p.nama_pelanggan,
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
LEFT JOIN users u_mek ON u_mek.id = wo.mekanik_id;

-- VIEW 2: Laporan Total Pendapatan per Cabang dan Tanggal
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
    u_kasir.nama_lengkap AS nama_kasir
FROM pembayaran pb
JOIN work_order wo ON wo.id = pb.work_order_id
JOIN cabang c ON c.id = wo.cabang_id
JOIN motor m ON m.id = wo.motor_id
JOIN pelanggan p ON p.id = m.pelanggan_id
LEFT JOIN users u_kasir ON u_kasir.id = pb.kasir_id
WHERE wo.status = 'dibayar';

-- VIEW 3: Laporan Penggunaan Suku Cadang per Work Order
CREATE OR REPLACE VIEW vw_laporan_penggunaan_part AS
SELECT
    wosc.id AS detail_id,
    wosc.created_at AS waktu_penggunaan,
    wo.id AS work_order_id,
    wo.nomor_wo,
    wo.status AS status_wo,
    c.id AS cabang_id,
    c.kode_cabang,
    c.nama_cabang,
    m.plat_nomor,
    m.merk || ' ' || m.tipe AS kendaraan,
    p.nama_pelanggan,
    sc.id AS suku_cadang_id,
    sc.kode_sku,
    sc.nama_part,
    sc.kategori AS kategori_part,
    sc.satuan,
    wosc.jumlah AS jumlah_digunakan,
    wosc.harga_satuan,
    wosc.subtotal
FROM work_order_suku_cadang wosc
JOIN work_order wo ON wo.id = wosc.work_order_id
JOIN cabang c ON c.id = wo.cabang_id
JOIN motor m ON m.id = wo.motor_id
JOIN pelanggan p ON p.id = m.pelanggan_id
JOIN suku_cadang sc ON sc.id = wosc.suku_cadang_id;

-- VIEW 4: Laporan Daftar Stok Suku Cadang di Bawah/Sama Dengan Stok Minimum
CREATE OR REPLACE VIEW vw_laporan_stok_minimum AS
SELECT
    sc.id AS suku_cadang_id,
    sc.kode_sku,
    sc.nama_part,
    sc.kategori,
    sc.satuan,
    sc.harga_beli,
    sc.harga_jual,
    sc.stok_saat_ini,
    sc.stok_minimum,
    (sc.stok_minimum - sc.stok_saat_ini) AS defisit_stok,
    GREATEST(sc.stok_minimum * 2 - sc.stok_saat_ini, sc.stok_minimum) AS rekomendasi_restock,
    sc.lokasi_rak,
    sup.id AS supplier_id,
    sup.kode_supplier,
    sup.nama_supplier,
    sup.kontak_person,
    sup.telepon AS telepon_supplier,
    sup.kota AS kota_supplier,
    CASE
        WHEN sc.stok_saat_ini = 0 THEN 'HABIS'
        WHEN sc.stok_saat_ini <= sc.stok_minimum THEN 'KRITIS'
        ELSE 'AMAN'
    END AS status_inventori
FROM suku_cadang sc
JOIN supplier sup ON sup.id = sc.supplier_id
WHERE sc.stok_saat_ini <= sc.stok_minimum;

COMMIT;

