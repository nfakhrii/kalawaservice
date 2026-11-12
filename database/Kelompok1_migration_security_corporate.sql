
-- ============================================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL 18
-- FILE     : Kelompok1_migration_security_corporate.sql
-- DESKRIPSI: Penyesuaian Keamanan Akses Data Corporate B2B
--
-- TUJUAN:
-- 1. Memisahkan view pelanggan operasional dan informasi korporat.
-- 2. Membatasi akses informasi plafon kredit.
-- 3. Mencabut akses kontrak dan tagihan kolektif dari mekanik dan gudang.
-- 4. Mempertahankan hak akses owner, admin cabang, kasir, dan auditor.
--
-- PRASYARAT:
-- Dieksekusi setelah:
-- 1. Kelompok1_schema.sql
-- 2. Kelompok1_insert.sql
-- 3. Kelompok1_admin_security.sql
-- 4. Kelompok1_programming.sql
-- 5. Kelompok1_migration_tugas4.sql
--
-- CATATAN:
-- Script ini tidak mengubah data pelanggan, kontrak, maupun tagihan.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PEMBARUAN VIEW PELANGGAN OPERASIONAL
-- ============================================================================

-- View ini hanya menampilkan informasi dasar pelanggan.
-- Informasi plafon kredit tidak disertakan.
--
-- Mekanik dan petugas gudang tetap dapat membaca informasi pelanggan
-- yang diperlukan untuk kegiatan operasional, tanpa memperoleh informasi
-- finansial pelanggan korporat.

-- DROP tanpa CASCADE digunakan agar migrasi tidak menghapus objek
-- lain yang mungkin bergantung pada view ini.
DROP VIEW IF EXISTS "VW_PELANGGAN_AMAN";

CREATE VIEW "VW_PELANGGAN_AMAN" AS
SELECT
    "pelanggan_id",
    "pelanggan_nama",
    "pelanggan_telp",
    "pelanggan_cab_favorit",
    "mekanik_id_pilihan",
    "pelanggan_tipe"
FROM "PELANGGAN";


-- ============================================================================
-- 2. PEMBUATAN VIEW KHUSUS INFORMASI PELANGGAN KORPORAT
-- ============================================================================

-- View ini digunakan untuk kebutuhan monitoring Corporate B2B.
--
-- Informasi yang ditampilkan:
-- - Identitas dasar pelanggan korporat
-- - Cabang favorit pelanggan
-- - Plafon kredit
-- - Sisa plafon kredit
--
-- View hanya menampilkan pelanggan bertipe Korporat.

CREATE OR REPLACE VIEW "VW_PELANGGAN_KORPORAT_AMAN" AS
SELECT
    "pelanggan_id",
    "pelanggan_nama",
    "pelanggan_telp",
    "pelanggan_cab_favorit",
    "pelanggan_tipe",
    "plafon_kredit",
    "sisa_plafon"
FROM "PELANGGAN"
WHERE "pelanggan_tipe" = 'Korporat';


-- ============================================================================
-- 3. PENGATURAN HAK AKSES VIEW PELANGGAN OPERASIONAL
-- ============================================================================

-- Cabut seluruh hak akses langsung yang mungkin pernah diberikan
-- pada view operasional kepada role-role terkait.
REVOKE ALL PRIVILEGES
ON "VW_PELANGGAN_AMAN"
FROM role_owner,
     role_admin_cabang,
     role_kasir,
     role_mekanik,
     role_petugas_gudang,
     role_auditor;

-- Seluruh role tetap dapat membaca informasi dasar pelanggan
-- melalui view operasional.
GRANT SELECT
ON "VW_PELANGGAN_AMAN"
TO role_owner,
   role_admin_cabang,
   role_kasir,
   role_mekanik,
   role_petugas_gudang,
   role_auditor;


-- ============================================================================
-- 4. PENGATURAN HAK AKSES VIEW PELANGGAN KORPORAT
-- ============================================================================

-- Pastikan mekanik dan petugas gudang tidak dapat membaca
-- informasi plafon kredit melalui view khusus korporat.
REVOKE ALL PRIVILEGES
ON "VW_PELANGGAN_KORPORAT_AMAN"
FROM role_mekanik,
     role_petugas_gudang;

-- Informasi korporat hanya dapat dibaca oleh:
-- Owner, Admin Cabang, Kasir, dan Auditor.
GRANT SELECT
ON "VW_PELANGGAN_KORPORAT_AMAN"
TO role_owner,
   role_admin_cabang,
   role_kasir,
   role_auditor;


-- ============================================================================
-- 5. PEMBATASAN AKSES TABEL KONTRAK KORPORAT
-- ============================================================================

-- Mekanik dan petugas gudang tidak memiliki kebutuhan operasional
-- untuk membaca atau mengelola data kontrak korporat.
REVOKE ALL PRIVILEGES
ON "KONTRAK_KORPORAT"
FROM role_mekanik,
     role_petugas_gudang;


-- ============================================================================
-- 6. PEMBATASAN AKSES TABEL TAGIHAN KOLEKTIF
-- ============================================================================

-- Informasi tagihan kolektif merupakan bagian dari proses finansial B2B.
-- Mekanik dan petugas gudang tidak memerlukan akses langsung ke tabel ini.
REVOKE ALL PRIVILEGES
ON "TAGIHAN_KOLEKTIF"
FROM role_mekanik,
     role_petugas_gudang;


-- ============================================================================
-- 7. PENEGASAN HAK AKSES ROLE YANG BERWENANG
-- ============================================================================

-- Owner memiliki akses penuh terhadap data Corporate B2B.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "KONTRAK_KORPORAT",
   "TAGIHAN_KOLEKTIF"
TO role_owner;

-- Admin cabang dapat mengelola kontrak dan tagihan korporat.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "KONTRAK_KORPORAT",
   "TAGIHAN_KOLEKTIF"
TO role_admin_cabang;

-- Kasir dapat membaca kontrak dan memproses tagihan kolektif.
GRANT SELECT
ON "KONTRAK_KORPORAT"
TO role_kasir;

GRANT SELECT, INSERT, UPDATE
ON "TAGIHAN_KOLEKTIF"
TO role_kasir;

-- Auditor hanya memiliki hak baca.
GRANT SELECT
ON "KONTRAK_KORPORAT",
   "TAGIHAN_KOLEKTIF"
TO role_auditor;


-- ============================================================================
-- 8. SELESAI
-- ============================================================================

COMMIT;

-- ============================================================================
-- AKHIR MIGRASI SECURITY CORPORATE B2B
-- ============================================================================
