
-- ============================================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL 18
-- FILE     : Kelompok1_migration_security_registry.sql
-- DESKRIPSI: Penyesuaian Hak Akses Registry (Master Data)
--
-- TUJUAN:
-- 1. Mempertahankan pengelolaan master SKU oleh Owner dan Gudang.
-- 2. Memusatkan pengelolaan Supplier pada Owner dan Gudang.
-- 3. Mengubah hak akses Admin Cabang terhadap Supplier menjadi read-only.
-- 4. Mempertahankan pengelolaan stok oleh Gudang.
-- 5. Menegaskan bahwa pembatasan cabang berlaku pada STOK_CABANG,
--    bukan pada master SKU maupun Supplier.
--
-- PRASYARAT:
-- Dieksekusi setelah:
-- 1. Kelompok1_schema.sql
-- 2. Kelompok1_insert.sql
-- 3. Kelompok1_admin_security.sql
-- 4. Kelompok1_programming.sql
-- 5. Kelompok1_migration_tugas4.sql
-- 6. Kelompok1_migration_security_corporate.sql
--
-- CATATAN:
-- Migration ini tidak mengubah struktur tabel maupun data.
-- Pembatasan stok berdasarkan cabang tetap harus diterapkan
-- pada repository aplikasi.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HAK AKSES MASTER SUKU CADANG (SUKU_CADANG)
-- ============================================================================

-- Owner tetap memiliki akses penuh.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "SUKU_CADANG"
TO role_owner;

-- Gudang dapat mengelola master SKU secara global.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "SUKU_CADANG"
TO role_petugas_gudang;

-- Role lainnya hanya dapat membaca master SKU.
GRANT SELECT
ON "SUKU_CADANG"
TO role_admin_cabang,
   role_kasir,
   role_mekanik,
   role_auditor;


-- ============================================================================
-- 2. HAK AKSES STOK CABANG (STOK_CABANG)
-- ============================================================================

-- Owner dapat mengelola stok seluruh cabang.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "STOK_CABANG"
TO role_owner;

-- Gudang dapat mengelola stok.
-- Pembatasan hanya pada cabang sendiri diterapkan di repository.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "STOK_CABANG"
TO role_petugas_gudang;

-- Admin, kasir, dan auditor hanya dapat membaca stok.
GRANT SELECT
ON "STOK_CABANG"
TO role_admin_cabang,
   role_kasir,
   role_auditor,
   role_mekanik;


-- ============================================================================
-- 3. HAK AKSES SUPPLIER
-- ============================================================================

-- OWNER
-- Mengelola master Supplier dan seluruh relasinya.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "SUPPLIER", "SUPPLIER_SUKU_CADANG"
TO role_owner;


-- PETUGAS GUDANG
-- Hanya dapat membaca master Supplier.
-- Tidak boleh menambah, mengubah, atau menghapus master Supplier.
REVOKE INSERT, UPDATE, DELETE
ON "SUPPLIER"
FROM role_petugas_gudang;

GRANT SELECT
ON "SUPPLIER"
TO role_petugas_gudang;

-- Gudang dapat menghubungkan Supplier yang sudah terdaftar
-- dengan suku cadang yang dikelola.
-- Tidak boleh mengubah isi relasi secara langsung.
REVOKE UPDATE
ON "SUPPLIER_SUKU_CADANG"
FROM role_petugas_gudang;

GRANT SELECT, INSERT, DELETE
ON "SUPPLIER_SUKU_CADANG"
TO role_petugas_gudang;


-- ADMIN CABANG
-- Hanya dapat membaca data Supplier dan relasinya.
REVOKE INSERT, UPDATE, DELETE
ON "SUPPLIER", "SUPPLIER_SUKU_CADANG"
FROM role_admin_cabang;

GRANT SELECT
ON "SUPPLIER", "SUPPLIER_SUKU_CADANG"
TO role_admin_cabang;


-- KASIR, MEKANIK, DAN AUDITOR
-- Hanya dapat membaca data Supplier dan relasinya.
GRANT SELECT
ON "SUPPLIER", "SUPPLIER_SUKU_CADANG"
TO role_kasir,
   role_mekanik,
   role_auditor;


-- ============================================================================
-- 4. PENEGASAN HAK AKSES OWNER
-- ============================================================================

-- Memastikan Owner tetap memiliki akses penuh pada seluruh tabel
-- yang menjadi bagian dari Registry.
GRANT SELECT, INSERT, UPDATE, DELETE
ON "PELANGGAN",
   "MOTOR",
   "RIWAYAT_KEPEMILIKAN",
   "JASA_SERVIS",
   "SUKU_CADANG",
   "STOK_CABANG",
   "SUPPLIER",
   "SUPPLIER_SUKU_CADANG"
TO role_owner;


-- ============================================================================
-- 5. SELESAI
-- ============================================================================

COMMIT;

-- ============================================================================
-- AKHIR MIGRATION SECURITY REGISTRY
-- ============================================================================
