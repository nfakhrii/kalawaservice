-- ============================================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL 18
-- FILE     : Kelompok1_migration_tugas4.sql
-- DESKRIPSI: Script Migrasi & Perluasan Skema Tugas 4 (Pelanggan Korporat B2B,
--            Kontrak Korporat, Plafon Kredit, Tagihan Kolektif Akhir Bulan,
--            Penyesuaian Status Work Order, Trigger Otomatis, & Data Uji Tugas 4)
-- PRASYARAT: Dieksekusi SETELAH ke-4 file Tugas 3 Kelompok 1:
--            1. Kelompok1_schema.sql
--            2. Kelompok1_insert.sql
--            3. Kelompok1_admin_security.sql
--            4. Kelompok1_programming.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PENYESUAIAN CONSTRAINT "WORK_ORDER" (ALUR OPERASIONAL TUGAS 4)
-- ============================================================================

-- 1.a. Izinkan "work_tgl_selesai" bernilai NULL saat Work Order baru dibuat/antre
ALTER TABLE "WORK_ORDER"
    ALTER COLUMN "work_tgl_selesai" DROP NOT NULL;

-- 1.b. Perbarui constraint "chk_work_tanggal" agar mengizinkan work_tgl_selesai NULL
ALTER TABLE "WORK_ORDER"
    DROP CONSTRAINT IF EXISTS "chk_work_tanggal";

ALTER TABLE "WORK_ORDER"
    ADD CONSTRAINT "chk_work_tanggal"
    CHECK ("work_tgl_selesai" IS NULL OR "work_tgl_selesai" >= "work_tgl_masuk");

-- 1.c. Perbarui constraint "chk_work_status" agar mendukung nilai lama di Kelompok1_insert.sql
--      sekaligus status wajib di Tugas 4 ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan', 'Selesai', 'Dibayar', 'Dibatalkan')
ALTER TABLE "WORK_ORDER"
    DROP CONSTRAINT IF EXISTS "chk_work_status";

ALTER TABLE "WORK_ORDER"
    ADD CONSTRAINT "chk_work_status"
    CHECK (
        "work_status" IN (
            'Dibuat',
            'Diproses',
            'Antre',
            'Dikerjakan',
            'Selesai',
            'Dibayar',
            'Dibatalkan'
        )
    );

-- ============================================================================
-- 2. MODIFIKASI DESAIN UNTUK LAYANAN PELANGGAN KORPORAT (B2B)
-- ============================================================================

-- 2.a. ALTER TABLE "PELANGGAN" menambahkan kolom korporat & plafon kredit
ALTER TABLE "PELANGGAN"
    ADD COLUMN IF NOT EXISTS "pelanggan_tipe" VARCHAR(20) NOT NULL DEFAULT 'Individu',
    ADD COLUMN IF NOT EXISTS "plafon_kredit" INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "sisa_plafon" INT NOT NULL DEFAULT 0;

ALTER TABLE "PELANGGAN"
    DROP CONSTRAINT IF EXISTS "chk_pelanggan_tipe";

ALTER TABLE "PELANGGAN"
    ADD CONSTRAINT "chk_pelanggan_tipe"
    CHECK ("pelanggan_tipe" IN ('Individu', 'Korporat'));

ALTER TABLE "PELANGGAN"
    DROP CONSTRAINT IF EXISTS "chk_plafon_kredit";

ALTER TABLE "PELANGGAN"
    ADD CONSTRAINT "chk_plafon_kredit"
    CHECK ("plafon_kredit" >= 0 AND "sisa_plafon" >= 0 AND "sisa_plafon" <= "plafon_kredit");

-- Perbarui constraint "chk_pelanggan_identitas" agar mendukung identitas perusahaan ('NPWP', 'NIB')
ALTER TABLE "PELANGGAN"
    DROP CONSTRAINT IF EXISTS "chk_pelanggan_identitas";

ALTER TABLE "PELANGGAN"
    ADD CONSTRAINT "chk_pelanggan_identitas"
    CHECK ("pelanggan_jenis_identitas" IN ('KTP', 'SIM', 'Paspor', 'NPWP', 'NIB'));

-- 2.b. Buat tabel "KONTRAK_KORPORAT"
DROP TABLE IF EXISTS "TAGIHAN_KOLEKTIF" CASCADE;
DROP TABLE IF EXISTS "KONTRAK_KORPORAT" CASCADE;

CREATE TABLE "KONTRAK_KORPORAT" (
    "kontrak_id" VARCHAR(15) PRIMARY KEY,
    "pelanggan_id" VARCHAR(10) NOT NULL,
    "tgl_mulai" DATE NOT NULL,
    "tgl_akhir" DATE NOT NULL,
    "kuota_motor" INT NOT NULL DEFAULT 10,
    "diskon_kontrak_persen" INT NOT NULL DEFAULT 0,
    "status_kontrak" VARCHAR(20) NOT NULL DEFAULT 'Aktif',

    CONSTRAINT "fk_kontrak_pelanggan"
        FOREIGN KEY ("pelanggan_id")
        REFERENCES "PELANGGAN" ("pelanggan_id")
        ON DELETE CASCADE,

    CONSTRAINT "chk_kontrak_tanggal"
        CHECK ("tgl_akhir" >= "tgl_mulai"),

    CONSTRAINT "chk_kontrak_kuota"
        CHECK ("kuota_motor" > 0),

    CONSTRAINT "chk_kontrak_diskon"
        CHECK ("diskon_kontrak_persen" BETWEEN 0 AND 100),

    CONSTRAINT "chk_kontrak_status"
        CHECK ("status_kontrak" IN ('Aktif', 'Berakhir', 'Dibekukan'))
);

-- 2.c. Buat tabel "TAGIHAN_KOLEKTIF"
CREATE TABLE "TAGIHAN_KOLEKTIF" (
    "tagihan_id" VARCHAR(15) PRIMARY KEY,
    "pelanggan_id" VARCHAR(10) NOT NULL,
    "periode_bulan" VARCHAR(20) NOT NULL,
    "total_tagihan" INT NOT NULL DEFAULT 0,
    "status_tagihan" VARCHAR(20) NOT NULL DEFAULT 'Belum Dibayar',
    "tgl_jatuh_tempo" DATE NOT NULL,
    "tgl_lunas" TIMESTAMPTZ NULL,

    CONSTRAINT "fk_tagihan_pelanggan"
        FOREIGN KEY ("pelanggan_id")
        REFERENCES "PELANGGAN" ("pelanggan_id")
        ON DELETE RESTRICT,

    CONSTRAINT "chk_tagihan_total"
        CHECK ("total_tagihan" >= 0),

    CONSTRAINT "chk_tagihan_status"
        CHECK ("status_tagihan" IN ('Belum Lunas', 'Belum Dibayar', 'Lunas'))
);

-- 2.d. Tambahkan kolom "tagihan_id" pada "WORK_ORDER" & perbarui "chk_pembayaran_metode"
ALTER TABLE "WORK_ORDER"
    ADD COLUMN IF NOT EXISTS "tagihan_id" VARCHAR(15) NULL;

ALTER TABLE "WORK_ORDER"
    DROP CONSTRAINT IF EXISTS "fk_work_order_tagihan";

ALTER TABLE "WORK_ORDER"
    ADD CONSTRAINT "fk_work_order_tagihan"
    FOREIGN KEY ("tagihan_id")
    REFERENCES "TAGIHAN_KOLEKTIF" ("tagihan_id")
    ON DELETE SET NULL;

ALTER TABLE "WORK_ORDER"
    DROP CONSTRAINT IF EXISTS "chk_pembayaran_metode";

ALTER TABLE "WORK_ORDER"
    ADD CONSTRAINT "chk_pembayaran_metode"
    CHECK (
        "pembayaran_metode" IN (
            'Tunai',
            'Debit',
            'Kredit',
            'QRIS',
            'Transfer',
            'Tagihan Kolektif'
        )
    );

-- ============================================================================
-- 3. PEMBARUAN VIEW KEAMANAN ("VW_PELANGGAN_AMAN" & "VW_WORK_ORDER_AMAN")
-- ============================================================================

CREATE OR REPLACE VIEW "VW_PELANGGAN_AMAN" AS
SELECT
    "pelanggan_id",
    "pelanggan_nama",
    "pelanggan_telp",
    "pelanggan_cab_favorit",
    "mekanik_id_pilihan",
    "pelanggan_tipe",
    "plafon_kredit",
    "sisa_plafon"
FROM "PELANGGAN";

CREATE OR REPLACE VIEW "VW_WORK_ORDER_AMAN" AS
SELECT
    "work_no",
    "work_tgl_masuk",
    "work_tgl_selesai",
    "work_status",
    "work_keluhan",
    "cabang_kode",
    "motor_nopol",
    "mekanik_id",
    "tagihan_id"
FROM "WORK_ORDER";

-- ============================================================================
-- 4. FUNGSI HELPER & TRIGGER OTOMATIS TUGAS 4
-- ============================================================================

-- 4.a. Fungsi pembungkus fn_hitung_total_tagihan(p_work_no) yang memanggil
--      Stored Procedure asli Kelompok 1: CALL sp_hitung_total_tagihan(p_work_no, v_total)
CREATE OR REPLACE FUNCTION fn_hitung_total_tagihan(p_work_no VARCHAR)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total INT := 0;
BEGIN
    CALL sp_hitung_total_tagihan(p_work_no, v_total);
    RETURN GREATEST(COALESCE(v_total, 0), 0);
END;
$$;

-- Pastikan stored function/trigger internal Tugas 3 dapat membaca tabel referensi
-- ketika dipanggil oleh role terbatas (seperti role_mekanik / role_auditor via View)
ALTER FUNCTION fn_status_garansi_by_wo(VARCHAR) SECURITY DEFINER;
ALTER FUNCTION sp_riwayat_servis(VARCHAR) SECURITY DEFINER;
ALTER FUNCTION sp_daftar_wo_cabang(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) SECURITY DEFINER;
ALTER FUNCTION trg_fn_kurangi_stok() SECURITY DEFINER;
ALTER FUNCTION public.trg_fn_kurangi_stok()
SET search_path = public, pg_temp;

-- 4.b. Perluas fn_audit_log() (tetap SECURITY INVOKER agar CURRENT_USER mencatat
--      akun PostgreSQL aktif dari SET LOCAL ROLE: user_owner, user_admin_cabang, dll.)
CREATE OR REPLACE FUNCTION "fn_audit_log"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_data_id VARCHAR(50);
BEGIN
    IF TG_TABLE_NAME = 'WORK_ORDER' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'work_no'),
            (to_jsonb(OLD) ->> 'work_no')
        );
    ELSIF TG_TABLE_NAME = 'STOK_CABANG' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'cabang_kode') || '-' || (to_jsonb(NEW) ->> 'suku_cadang_kode'),
            (to_jsonb(OLD) ->> 'cabang_kode') || '-' || (to_jsonb(OLD) ->> 'suku_cadang_kode')
        );
    ELSIF TG_TABLE_NAME = 'WO_SUKU_CADANG' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'work_no') || '-' || (to_jsonb(NEW) ->> 'suku_cadang_kode'),
            (to_jsonb(OLD) ->> 'work_no') || '-' || (to_jsonb(OLD) ->> 'suku_cadang_kode')
        );
    ELSIF TG_TABLE_NAME = 'KONTRAK_KORPORAT' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'kontrak_id'),
            (to_jsonb(OLD) ->> 'kontrak_id')
        );
    ELSIF TG_TABLE_NAME = 'TAGIHAN_KOLEKTIF' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'tagihan_id'),
            (to_jsonb(OLD) ->> 'tagihan_id')
        );
    ELSE
        v_data_id := 'UNKNOWN';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AUDIT_LOG" (
            "nama_tabel", "nama_operasi", "data_id",
            "user_database", "waktu_perubahan",
            "data_lama", "data_baru"
        )
        VALUES (
            TG_TABLE_NAME, TG_OP, v_data_id,
            SESSION_USER, CURRENT_TIMESTAMP,
            NULL, to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD IS DISTINCT FROM NEW THEN
            INSERT INTO "AUDIT_LOG" (
                "nama_tabel", "nama_operasi", "data_id",
                "user_database", "waktu_perubahan",
                "data_lama", "data_baru"
            )
            VALUES (
                TG_TABLE_NAME, TG_OP, v_data_id,
                SESSION_USER, CURRENT_TIMESTAMP,
                to_jsonb(OLD), to_jsonb(NEW)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AUDIT_LOG" (
            "nama_tabel", "nama_operasi", "data_id",
            "user_database", "waktu_perubahan",
            "data_lama", "data_baru"
        )
        VALUES (
            TG_TABLE_NAME, TG_OP, v_data_id,
            SESSION_USER, CURRENT_TIMESTAMP,
            to_jsonb(OLD), NULL
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_kontrak_korporat ON "KONTRAK_KORPORAT";
CREATE TRIGGER trg_audit_kontrak_korporat
AFTER INSERT OR UPDATE OR DELETE ON "KONTRAK_KORPORAT"
FOR EACH ROW EXECUTE FUNCTION "fn_audit_log"();

DROP TRIGGER IF EXISTS trg_audit_tagihan_kolektif ON "TAGIHAN_KOLEKTIF";
CREATE TRIGGER trg_audit_tagihan_kolektif
AFTER INSERT OR UPDATE OR DELETE ON "TAGIHAN_KOLEKTIF"
FOR EACH ROW EXECUTE FUNCTION "fn_audit_log"();

-- 4.c. Trigger pengembalian stok saat item dihapus dari "WO_SUKU_CADANG"
CREATE OR REPLACE FUNCTION trg_fn_kembalikan_stok()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cabang_kode VARCHAR(10);
BEGIN
    SELECT cabang_kode INTO v_cabang_kode
    FROM "WORK_ORDER"
    WHERE work_no = OLD.work_no;

    IF v_cabang_kode IS NOT NULL THEN
        UPDATE "STOK_CABANG"
        SET stok_qty = stok_qty + OLD.suku_cadang_qty
        WHERE cabang_kode = v_cabang_kode
          AND suku_cadang_kode = OLD.suku_cadang_kode;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_kembalikan_stok_suku_cadang ON "WO_SUKU_CADANG";
CREATE TRIGGER trg_kembalikan_stok_suku_cadang
AFTER DELETE ON "WO_SUKU_CADANG"
FOR EACH ROW EXECUTE FUNCTION trg_fn_kembalikan_stok();

-- 4.d. Trigger Otomatis Pemotongan Plafon Kredit saat Work Order Korporat
--      ditagihkan ke "TAGIHAN_KOLEKTIF" atau menggunakan metode 'Tagihan Kolektif'
CREATE OR REPLACE FUNCTION trg_fn_potong_plafon_korporat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pelanggan_id VARCHAR(10);
    v_tipe VARCHAR(20);
    v_sisa INT;
    v_total_wo INT := 0;
BEGIN
    -- Jalan saat Work Order dikaitkan ke tagihan_id baru atau metode menjadi 'Tagihan Kolektif'
    IF (OLD.tagihan_id IS NULL AND NEW.tagihan_id IS NOT NULL)
       OR (OLD.pembayaran_metode <> 'Tagihan Kolektif' AND NEW.pembayaran_metode = 'Tagihan Kolektif' AND NEW.tagihan_id IS NULL)
    THEN
        SELECT m.pelanggan_id, p.pelanggan_tipe, p.sisa_plafon
        INTO v_pelanggan_id, v_tipe, v_sisa
        FROM "MOTOR" m
        JOIN "PELANGGAN" p ON p.pelanggan_id = m.pelanggan_id
        WHERE m.motor_nopol = NEW.motor_nopol;

        IF v_tipe = 'Korporat' THEN
            CALL sp_hitung_total_tagihan(NEW.work_no, v_total_wo);
            v_total_wo := GREATEST(COALESCE(v_total_wo, 0), 0);

            IF v_total_wo > v_sisa THEN
                RAISE EXCEPTION 'Plafon kredit korporat pelanggan % tidak mencukupi (Tagihan WO: Rp %, Sisa Plafon: Rp %).',
                    v_pelanggan_id, v_total_wo, v_sisa
                    USING ERRCODE = 'P0004';
            END IF;

            UPDATE "PELANGGAN"
            SET sisa_plafon = sisa_plafon - v_total_wo
            WHERE pelanggan_id = v_pelanggan_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_potong_plafon_korporat ON "WORK_ORDER";
CREATE TRIGGER trg_potong_plafon_korporat
AFTER UPDATE ON "WORK_ORDER"
FOR EACH ROW EXECUTE FUNCTION trg_fn_potong_plafon_korporat();

-- 4.e. Trigger Otomatis Pemulihan Plafon Kredit saat "TAGIHAN_KOLEKTIF" dilunasi akhir bulan
CREATE OR REPLACE FUNCTION trg_fn_lunasi_tagihan_kolektif()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status_tagihan <> 'Lunas' AND NEW.status_tagihan = 'Lunas' THEN
        NEW.tgl_lunas := COALESCE(NEW.tgl_lunas, CURRENT_TIMESTAMP);

        -- Pulihkan sisa_plafon pelanggan korporat sebesar total_tagihan
        UPDATE "PELANGGAN"
        SET sisa_plafon = LEAST(plafon_kredit, sisa_plafon + NEW.total_tagihan)
        WHERE pelanggan_id = NEW.pelanggan_id;

        -- Tandai seluruh Work Order di dalam tagihan kolektif ini sebagai 'Lunas'
        UPDATE "WORK_ORDER"
        SET pembayaran_status = 'Lunas',
            work_status = CASE WHEN work_status = 'Selesai' THEN 'Dibayar' ELSE work_status END
        WHERE tagihan_id = NEW.tagihan_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lunasi_tagihan_kolektif ON "TAGIHAN_KOLEKTIF";
CREATE TRIGGER trg_lunasi_tagihan_kolektif
BEFORE UPDATE ON "TAGIHAN_KOLEKTIF"
FOR EACH ROW EXECUTE FUNCTION trg_fn_lunasi_tagihan_kolektif();

-- ============================================================================
-- 5. HAK AKSES (GRANT) TABEL & OBJEK BARU KE 6 ROLE KELOMPOK 1
--    (Mempertahankan REVOKE keamanan Kelompok1_admin_security.sql untuk SET LOCAL ROLE)
-- ============================================================================

-- Izinkan trigger fn_audit_log() menulis ke AUDIT_LOG saat dieksekusi oleh role operasional
GRANT SELECT ON "AUDIT_LOG" TO role_owner, role_auditor, role_admin_cabang;

-- Hak akses tabel baru Corporate B2B
GRANT SELECT, INSERT, UPDATE, DELETE ON "KONTRAK_KORPORAT", "TAGIHAN_KOLEKTIF" TO role_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON "KONTRAK_KORPORAT", "TAGIHAN_KOLEKTIF" TO role_admin_cabang;
GRANT SELECT, INSERT, UPDATE ON "TAGIHAN_KOLEKTIF" TO role_kasir;
GRANT SELECT ON "KONTRAK_KORPORAT" TO role_kasir;
GRANT SELECT ON "KONTRAK_KORPORAT", "TAGIHAN_KOLEKTIF" TO role_auditor, role_mekanik, role_petugas_gudang;

-- Hak akses penuh Admin Cabang pada Supplier & Relasi Supplier (untuk halaman Registry Supplier)
GRANT SELECT, INSERT, UPDATE, DELETE ON "SUPPLIER", "SUPPLIER_SUKU_CADANG" TO role_admin_cabang;

-- Hak baca katalog/referensi non-sensitif agar navigasi dashboard/analytics tidak error,
-- TANPA memberikan SELECT pada "PELANGGAN" (untuk kasir, mekanik, auditor) dan
-- TANPA memberikan SELECT pada "WORK_ORDER" (untuk mekanik, auditor)
GRANT SELECT ON
    "CABANG", "PEGAWAI", "MEKANIK", "MOTOR", "RIWAYAT_KEPEMILIKAN",
    "JASA_SERVIS", "SUKU_CADANG", "STOK_CABANG", "SUPPLIER", "SUPPLIER_SUKU_CADANG",
    "WO_MEKANIK", "WO_JASA", "WO_SUKU_CADANG", "GARANSI",
    "VW_PELANGGAN_AMAN", "VW_WORK_ORDER_AMAN"
TO role_owner, role_admin_cabang, role_kasir, role_mekanik, role_petugas_gudang, role_auditor;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO role_owner;

-- Lindungi isi Audit Trail dari perubahan langsung.
REVOKE INSERT, UPDATE, DELETE
ON public."AUDIT_LOG"
FROM PUBLIC,
     role_owner,
     role_admin_cabang,
     role_kasir,
     role_mekanik,
     role_petugas_gudang,
     role_auditor,
     user_owner,
     user_admin_cabang,
     user_kasir,
     user_mekanik,
     user_gudang,
     user_auditor;

REVOKE USAGE, UPDATE
ON SEQUENCE public."AUDIT_LOG_audit_id_seq"
FROM PUBLIC,
     role_owner,
     role_admin_cabang,
     role_kasir,
     role_mekanik,
     role_petugas_gudang,
     role_auditor,
     user_owner,
     user_admin_cabang,
     user_kasir,
     user_mekanik,
     user_gudang,
     user_auditor;

GRANT SELECT
ON public."AUDIT_LOG"
TO role_owner, role_admin_cabang, role_auditor;

-- Pastikan REVOKE sensitif dari Kelompok1_admin_security.sql tetap terkunci rapat:
REVOKE SELECT ON "PELANGGAN" FROM role_kasir, role_mekanik, role_auditor, role_petugas_gudang;
REVOKE SELECT ON "WORK_ORDER" FROM role_mekanik, role_auditor, role_petugas_gudang;
REVOKE UPDATE ON "WORK_ORDER" FROM role_mekanik;
GRANT UPDATE ("work_status", "work_tgl_selesai", "work_keluhan") ON "WORK_ORDER" TO role_mekanik;
GRANT SELECT ("work_no", "work_tgl_masuk", "work_tgl_selesai", "work_status", "work_keluhan") ON "WORK_ORDER" TO role_mekanik;

-- ============================================================================
-- 6. DATA UJI TAMBAHAN (SEED TUGAS 4)
-- ============================================================================

-- 6.a. Tambahkan 2 Pelanggan Korporat (PL007 & PL008)
INSERT INTO "PELANGGAN" (
    "pelanggan_id", "pelanggan_nama", "pelanggan_telp",
    "pelanggan_jenis_identitas", "pelanggan_no_identitas",
    "pelanggan_alamat", "pelanggan_cab_favorit", "mekanik_id_pilihan",
    "pelanggan_tipe", "plafon_kredit", "sisa_plafon"
) VALUES
(
    'PL007', 'PT Borneo Kurir Ekspres', '08115200777',
    'NPWP', '01.345.678.9-711.000',
    'Jl. Tjilik Riwut Km. 4.5 No. 88, Palangka Raya', 'CB001', 'PG003',
    'Korporat', 25000000, 24415000
),
(
    'PL008', 'CV Palangka Rental Motor', '08115200888',
    'NPWP', '02.888.999.1-711.000',
    'Jl. Imam Bonjol No. 19, Palangka Raya', 'CB002', 'PG005',
    'Korporat', 15000000, 15000000
)
ON CONFLICT ("pelanggan_id") DO UPDATE SET
    "pelanggan_tipe" = EXCLUDED."pelanggan_tipe",
    "plafon_kredit" = EXCLUDED."plafon_kredit",
    "sisa_plafon" = EXCLUDED."sisa_plafon";

-- 6.b. Kontrak Korporat Aktif (KK001 & KK002)
INSERT INTO "KONTRAK_KORPORAT" (
    "kontrak_id", "pelanggan_id", "tgl_mulai", "tgl_akhir",
    "kuota_motor", "diskon_kontrak_persen", "status_kontrak"
) VALUES
('KK001', 'PL007', '2026-01-01', '2026-12-31', 25, 10, 'Aktif'),
('KK002', 'PL008', '2026-01-01', '2026-12-31', 15, 5, 'Aktif')
ON CONFLICT ("kontrak_id") DO NOTHING;

-- 6.c. 4 Unit Motor Armada Korporat
INSERT INTO "MOTOR" (
    "motor_nopol", "pelanggan_id", "motor_no_rangka", "motor_no_mesin",
    "motor_merek", "motor_tipe", "motor_tahun", "motor_warna", "motor_kilometer"
) VALUES
('KH8001BK', 'PL007', 'MH1JFZ99000008001', 'JFZ9908001', 'Honda', 'Beat Street Fleet', 2024, 'Hitam', 28400),
('KH8002BK', 'PL007', 'MH1JFZ99000008002', 'JFZ9908002', 'Honda', 'Vario 125 Kurir', 2024, 'Merah', 31200),
('KH9001PR', 'PL008', 'MH3NMX88000009001', 'NMX8809001', 'Yamaha', 'NMAX 155 Executive', 2025, 'Biru', 15600),
('KH9002PR', 'PL008', 'MH1PCX88000009002', 'PCX8809002', 'Honda', 'PCX 160 Rental', 2025, 'Putih', 11200)
ON CONFLICT ("motor_nopol") DO NOTHING;

INSERT INTO "RIWAYAT_KEPEMILIKAN" (
    "riwayat_id", "motor_nopol", "pelanggan_id", "tanggal_mulai", "tanggal_selesai"
) VALUES
('RW011', 'KH8001BK', 'PL007', '2024-02-01', NULL),
('RW012', 'KH8002BK', 'PL007', '2024-02-01', NULL),
('RW013', 'KH9001PR', 'PL008', '2025-01-15', NULL),
('RW014', 'KH9002PR', 'PL008', '2025-01-15', NULL)
ON CONFLICT ("riwayat_id") DO NOTHING;

-- 6.d. Tagihan Kolektif Awal (TK001 untuk PL007)
INSERT INTO "TAGIHAN_KOLEKTIF" (
    "tagihan_id", "pelanggan_id", "periode_bulan", "total_tagihan",
    "status_tagihan", "tgl_jatuh_tempo", "tgl_lunas"
) VALUES
('TK001', 'PL007', '2026-09', 585000, 'Belum Dibayar', '2026-10-25', NULL)
ON CONFLICT ("tagihan_id") DO NOTHING;

-- 6.e. Work Order Tambahan (Korporat & Operasional Aktif Antre/Dikerjakan)
INSERT INTO "WORK_ORDER" (
    "work_no", "work_tgl_masuk", "work_tgl_selesai",
    "work_status", "work_keluhan", "cabang_kode",
    "motor_nopol", "mekanik_id", "pembayaran_diskon",
    "pembayaran_metode", "pembayaran_status", "tagihan_id"
) VALUES
(
    'WO009', '2026-09-12 08:30:00+07', '2026-09-12 11:00:00+07',
    'Selesai', 'Servis rutin armada kurir & ganti kampas rem depan + oli mesin',
    'CB001', 'KH8001BK', 'PG003', 20000,
    'Tagihan Kolektif', 'Belum Lunas', 'TK001'
),
(
    'WO010', '2026-09-14 09:15:00+07', '2026-09-14 12:00:00+07',
    'Selesai', 'Perawatan CVT & penggantian V-Belt armada kurir ekspres',
    'CB001', 'KH8002BK', 'PG003', 30000,
    'Tagihan Kolektif', 'Belum Lunas', 'TK001'
),
(
    'WO011', '2026-09-18 10:00:00+07', '2026-09-18 12:30:00+07',
    'Selesai', 'Tune up & servis sistem injeksi armada rental eksekutif (siap ditagihkan kolektif)',
    'CB002', 'KH9001PR', 'PG005', 15000,
    'Tagihan Kolektif', 'Belum Lunas', NULL
),
(
    'WO012', '2026-09-19 09:00:00+07', NULL,
    'Dikerjakan', 'Pengecekan kelistrikan & ganti oli mesin unit rental',
    'CB002', 'KH9002PR', 'PG004', 0,
    'Tagihan Kolektif', 'Belum Lunas', NULL
),
(
    'WO013', '2026-09-20 08:30:00+07', NULL,
    'Antre', 'Servis berkala & pengecekan rem belakang',
    'CB001', 'KH1010FF', 'PG003', 0,
    'Tunai', 'Belum Lunas', NULL
)
ON CONFLICT ("work_no") DO NOTHING;

INSERT INTO "WO_MEKANIK" ("work_no", "mekanik_id", "peran_mekanik") VALUES
('WO009', 'PG003', 'Penanggung Jawab'),
('WO010', 'PG003', 'Penanggung Jawab'),
('WO011', 'PG005', 'Penanggung Jawab'),
('WO012', 'PG004', 'Penanggung Jawab'),
('WO013', 'PG003', 'Penanggung Jawab')
ON CONFLICT ("work_no", "mekanik_id") DO NOTHING;

INSERT INTO "WO_JASA" ("work_no", "jasa_kode") VALUES
('WO009', 'JS001'),
('WO009', 'JS006'),
('WO010', 'JS008'),
('WO010', 'JS002'),
('WO011', 'JS004'),
('WO011', 'JS005'),
('WO012', 'JS002'),
('WO013', 'JS001')
ON CONFLICT ("work_no", "jasa_kode") DO NOTHING;

INSERT INTO "WO_SUKU_CADANG" ("work_no", "suku_cadang_kode", "suku_cadang_qty", "suku_cadang_jumlah") VALUES
('WO009', 'SC001', 1, 55000),
('WO009', 'SC004', 1, 85000),
('WO010', 'SC008', 1, 150000),
('WO010', 'SC009', 1, 90000),
('WO011', 'SC001', 1, 55000),
('WO011', 'SC006', 1, 60000)
ON CONFLICT ("work_no", "suku_cadang_kode") DO NOTHING;

INSERT INTO "GARANSI" ("garansi_id", "work_no", "garansi_jumlah_hari", "garansi_keterangan") VALUES
('GR004', 'WO009', 30, 'Garansi servis armada korporat PT Borneo Kurir Ekspres selama 30 hari.'),
('GR005', 'WO010', 30, 'Garansi CVT & V-Belt armada korporat PT Borneo Kurir Ekspres selama 30 hari.')
ON CONFLICT ("garansi_id", "work_no") DO NOTHING;

-- 6.f. Update/Tambahkan baris di "STOK_CABANG" sehingga stok_qty < stok_minimum
--      agar Laporan Stok Kritis & Skenario #3 langsung memiliki data uji
UPDATE "STOK_CABANG"
SET "stok_qty" = 1, "stok_minimum" = 5
WHERE "cabang_kode" = 'CB001' AND "suku_cadang_kode" = 'SC008';

UPDATE "STOK_CABANG"
SET "stok_qty" = 2, "stok_minimum" = 5
WHERE "cabang_kode" = 'CB001' AND "suku_cadang_kode" = 'SC007';

UPDATE "STOK_CABANG"
SET "stok_qty" = 1, "stok_minimum" = 3
WHERE "cabang_kode" = 'CB002' AND "suku_cadang_kode" = 'SC010';

INSERT INTO "STOK_CABANG" ("cabang_kode", "suku_cadang_kode", "stok_qty", "stok_minimum")
VALUES ('CB001', 'SC015', 2, 5)
ON CONFLICT ("cabang_kode", "suku_cadang_kode")
DO UPDATE SET "stok_qty" = 2, "stok_minimum" = 5;

COMMIT;

