-- =========================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL
-- TUGAS 3 - MINGGU 2 & MINGGU 3
-- ADMINISTRASI HAK AKSES & KEAMANAN BASIS DATA
-- =========================================================


-- =========================================================
-- KELOMPOK 1
-- ANGGOTA KELOMPOK :
-- ARY SIGIT JULIAN (2330105030001)
-- EDWARD CHRISTIAN RUFUS (2330105030019)
-- FEBRIAN NUR HIDAYAT (2330105030026)
-- NAUFAL FAKHRI (2330105030011)
-- RAYDAMAR RIZKYAKA RIYADI (2330205030035)
-- =========================================================



-- #########################################################
-- #########################################################
--
--                  MINGGU 2
--             ADMINISTRASI HAK AKSES
--
-- #########################################################
-- #########################################################


-- =========================================================
-- 1. MEMBUAT ROLE
-- =========================================================

-- Role digunakan sebagai kelompok hak akses.
-- User nantinya diberikan role sesuai jenis pengguna.

CREATE ROLE role_owner NOLOGIN;

CREATE ROLE role_admin_cabang NOLOGIN;

CREATE ROLE role_kasir NOLOGIN;

CREATE ROLE role_mekanik NOLOGIN;

CREATE ROLE role_petugas_gudang NOLOGIN;

CREATE ROLE role_auditor NOLOGIN;


-- =========================================================
-- 2. MEMBUAT USER / AKUN LOGIN
-- =========================================================

-- Password di bawah hanya untuk kebutuhan demonstrasi
-- tugas dan dapat diganti sesuai kebutuhan kelompok.

CREATE USER user_owner
WITH PASSWORD 'OwnerKalawa123';

CREATE USER user_admin_cabang
WITH PASSWORD 'AdminKalawa123';

CREATE USER user_admin_pg008
WITH PASSWORD 'AdminKalawa008';

CREATE USER user_admin_pg009
WITH PASSWORD 'AdminKalawa009';

CREATE USER user_kasir
WITH PASSWORD 'KasirKalawa123';

CREATE USER user_kasir_pg010
WITH PASSWORD 'KasirKalawa010';

CREATE USER user_kasir_pg011
WITH PASSWORD 'KasirKalawa011';

CREATE USER user_mekanik
WITH PASSWORD 'MekanikKalawa123';

CREATE USER user_mekanik_pg004
WITH PASSWORD 'MekanikKalawa004';

CREATE USER user_mekanik_pg005
WITH PASSWORD 'MekanikKalawa005';

CREATE USER user_mekanik_pg006
WITH PASSWORD 'MekanikKalawa006';

CREATE USER user_gudang
WITH PASSWORD 'GudangKalawa123';

CREATE USER user_gudang_pg012
WITH PASSWORD 'GudangKalawa012';

CREATE USER user_gudang_pg013
WITH PASSWORD 'GudangKalawa013';

CREATE USER user_auditor
WITH PASSWORD 'AuditorKalawa123';


-- =========================================================
-- 3. MENGHUBUNGKAN USER DENGAN ROLE
-- =========================================================

GRANT role_owner TO user_owner;

GRANT role_admin_cabang TO user_admin_cabang;

GRANT role_admin_cabang TO user_admin_pg008;

GRANT role_admin_cabang TO user_admin_pg009;

GRANT role_kasir TO user_kasir;

GRANT role_kasir TO user_kasir_pg010;

GRANT role_kasir TO user_kasir_pg011;

GRANT role_mekanik TO user_mekanik;

GRANT role_mekanik TO user_mekanik_pg004;

GRANT role_mekanik TO user_mekanik_pg005;

GRANT role_mekanik TO user_mekanik_pg006;

GRANT role_petugas_gudang TO user_gudang;

GRANT role_petugas_gudang TO user_gudang_pg012;

GRANT role_petugas_gudang TO user_gudang_pg013;

GRANT role_auditor TO user_auditor;


-- =========================================================
-- 4. HAK AKSES OWNER
-- =========================================================

-- Owner dapat melakukan seluruh operasi terhadap seluruh
-- tabel: SELECT, INSERT, UPDATE, DELETE.

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO role_owner;


-- =========================================================
-- 5. HAK AKSES ADMIN CABANG
-- =========================================================

-- Admin cabang mengelola data operasional.

GRANT SELECT, INSERT, UPDATE, DELETE
ON
    "CABANG",
    "PEGAWAI",
    "PELANGGAN",
    "MOTOR",
    "RIWAYAT_KEPEMILIKAN",
    "WORK_ORDER",
    "WO_MEKANIK",
    "WO_JASA",
    "WO_SUKU_CADANG"
TO role_admin_cabang;

GRANT SELECT
ON
    "MEKANIK",
    "JASA_SERVIS",
    "SUKU_CADANG",
    "SUPPLIER",
    "SUPPLIER_SUKU_CADANG",
    "STOK_CABANG",
    "GARANSI"
TO role_admin_cabang;


-- =========================================================
-- 6. HAK AKSES KASIR
-- =========================================================

-- Kasir membutuhkan akses untuk melihat data pelanggan,
-- motor, work order, jasa, spare part, serta memperbarui
-- informasi pembayaran pada WORK_ORDER.

GRANT SELECT
ON
    "CABANG",
    "PELANGGAN",
    "MOTOR",
    "MEKANIK",
    "JASA_SERVIS",
    "SUKU_CADANG",
    "WORK_ORDER",
    "WO_JASA",
    "WO_SUKU_CADANG",
    "GARANSI"
TO role_kasir;

GRANT UPDATE
ON "WORK_ORDER"
TO role_kasir;


-- =========================================================
-- 7. HAK AKSES MEKANIK
-- =========================================================

-- Mekanik dapat melihat informasi kendaraan dan pekerjaan
-- serta memperbarui data pekerjaan yang dikerjakan.

GRANT SELECT
ON
    "PELANGGAN",
    "MOTOR",
    "MEKANIK",
    "JASA_SERVIS",
    "SUKU_CADANG",
    "WORK_ORDER",
    "WO_MEKANIK",
    "WO_JASA",
    "WO_SUKU_CADANG",
    "GARANSI"
TO role_mekanik;

GRANT UPDATE
ON
    "WORK_ORDER",
    "WO_MEKANIK",
    "WO_JASA",
    "WO_SUKU_CADANG"
TO role_mekanik;


-- =========================================================
-- 8. HAK AKSES PETUGAS GUDANG
-- =========================================================

-- Petugas gudang mengelola data spare part, supplier,
-- dan stok cabang.

GRANT SELECT
ON
    "CABANG",
    "SUKU_CADANG",
    "SUPPLIER",
    "SUPPLIER_SUKU_CADANG",
    "STOK_CABANG",
    "WORK_ORDER",
    "WO_SUKU_CADANG"
TO role_petugas_gudang;

GRANT INSERT, UPDATE, DELETE
ON
    "SUKU_CADANG",
    "SUPPLIER",
    "SUPPLIER_SUKU_CADANG",
    "STOK_CABANG"
TO role_petugas_gudang;


-- =========================================================
-- 9. HAK AKSES AUDITOR
-- =========================================================

-- Auditor hanya dapat melihat data.

GRANT SELECT
ON ALL TABLES IN SCHEMA public
TO role_auditor;


-- =========================================================
-- 10. HAK AKSES SEQUENCE
-- =========================================================

-- Disiapkan apabila nantinya terdapat kolom menggunakan
-- sequence/identity.

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO role_owner;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO role_admin_cabang;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO role_kasir;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO role_mekanik;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO role_petugas_gudang;


-- =========================================================
-- 11. DEFAULT PRIVILEGES
-- =========================================================

-- Hak akses default untuk objek tabel yang dibuat
-- pada schema public di masa mendatang.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO role_auditor;



-- #########################################################
-- #########################################################
--
--                  MINGGU 3
--              KEAMANAN BASIS DATA
--
-- #########################################################
-- #########################################################


-- =========================================================
-- 12. VIEW DATA PELANGGAN
-- =========================================================

-- View digunakan untuk membatasi kolom sensitif pelanggan.
--
-- Kolom yang tidak ditampilkan melalui view:
--   - pelanggan_jenis_identitas
--   - pelanggan_no_identitas
--   - pelanggan_alamat
--
-- Informasi tersebut tetap tersimpan pada tabel PELANGGAN,
-- tetapi tidak ditampilkan kepada pengguna yang hanya
-- membutuhkan informasi dasar pelanggan.

CREATE OR REPLACE VIEW "VW_PELANGGAN_AMAN" AS
SELECT
    "pelanggan_id",
    "pelanggan_nama",
    "pelanggan_telp",
    "pelanggan_cab_favorit",
    "mekanik_id_pilihan"
FROM "PELANGGAN";


-- =========================================================
-- 13. VIEW DATA WORK ORDER
-- =========================================================

-- View digunakan untuk menampilkan informasi pekerjaan
-- tanpa menampilkan informasi pembayaran.

CREATE OR REPLACE VIEW "VW_WORK_ORDER_AMAN" AS
SELECT
    "work_no",
    "work_tgl_masuk",
    "work_tgl_selesai",
    "work_status",
    "work_keluhan",
    "cabang_kode",
    "motor_nopol",
    "mekanik_id"
FROM "WORK_ORDER";


-- =========================================================
-- 14. AUDIT LOG
-- =========================================================

-- Tabel AUDIT_LOG digunakan untuk menyimpan catatan
-- perubahan penting pada database.
--
-- Implementasi pengisian otomatis menggunakan trigger
-- akan dilakukan pada Minggu 4.

CREATE TABLE IF NOT EXISTS "AUDIT_LOG" (
    "audit_id" BIGSERIAL PRIMARY KEY,

    "nama_tabel" VARCHAR(50) NOT NULL,

    "nama_operasi" VARCHAR(10) NOT NULL,

    "data_id" VARCHAR(50) NOT NULL,

    "user_database" VARCHAR(100)
        NOT NULL DEFAULT CURRENT_USER,

    "waktu_perubahan" TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "data_lama" JSONB,

    "data_baru" JSONB,

    CONSTRAINT "chk_audit_operasi"
        CHECK (
            "nama_operasi"
            IN ('INSERT', 'UPDATE', 'DELETE')
        )
);


-- =========================================================
-- 15. HAK AKSES VIEW PELANGGAN
-- =========================================================

-- Akses SELECT langsung ke tabel PELANGGAN dicabut dari
-- role yang tidak membutuhkan data sensitif.
--
-- Selanjutnya role tersebut menggunakan view aman.

REVOKE SELECT
ON "PELANGGAN"
FROM role_kasir;

REVOKE SELECT
ON "PELANGGAN"
FROM role_mekanik;

REVOKE SELECT
ON "PELANGGAN"
FROM role_auditor;


-- Memberikan akses ke view pelanggan yang sudah dibatasi.

GRANT SELECT
ON "VW_PELANGGAN_AMAN"
TO role_kasir;

GRANT SELECT
ON "VW_PELANGGAN_AMAN"
TO role_mekanik;

GRANT SELECT
ON "VW_PELANGGAN_AMAN"
TO role_auditor;


-- =========================================================
-- 16. HAK AKSES VIEW WORK ORDER
-- =========================================================

-- Mekanik tidak memerlukan informasi pembayaran ketika
-- melihat informasi pekerjaan.
--
-- Akses SELECT langsung ke WORK_ORDER dicabut dan
-- digantikan dengan view yang lebih terbatas.

REVOKE SELECT
ON "WORK_ORDER"
FROM role_mekanik;

GRANT SELECT
ON "VW_WORK_ORDER_AMAN"
TO role_mekanik;


-- Auditor juga menggunakan view yang tidak menampilkan
-- informasi pembayaran.

REVOKE SELECT
ON "WORK_ORDER"
FROM role_auditor;

GRANT SELECT
ON "VW_WORK_ORDER_AMAN"
TO role_auditor;


-- =========================================================
-- 17. PEMBATASAN UPDATE MEKANIK
-- =========================================================

-- Mekanik hanya diperbolehkan mengubah kolom yang
-- berkaitan dengan pekerjaan, bukan informasi pembayaran.

REVOKE UPDATE
ON "WORK_ORDER"
FROM role_mekanik;

GRANT UPDATE (
    "work_status",
    "work_tgl_selesai",
    "work_keluhan"
)
ON "WORK_ORDER"
TO role_mekanik;


-- =========================================================
-- 18. HAK AKSES AUDIT LOG
-- =========================================================

-- Audit log hanya dapat dibaca oleh owner dan auditor.
-- Pengisian otomatis akan dilakukan oleh trigger
-- pada Minggu 4.

GRANT SELECT
ON "AUDIT_LOG"
TO role_owner;

GRANT SELECT
ON "AUDIT_LOG"
TO role_auditor;


-- =========================================================
-- SELESAI
-- =========================================================