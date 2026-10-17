-- =========================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL
-- TUGAS 3 - MINGGU 1 (SCHEMA)
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


-- =========================================================
-- 1. DROP TABLE
-- =========================================================

DROP TABLE IF EXISTS "GARANSI" CASCADE;
DROP TABLE IF EXISTS "WO_SUKU_CADANG" CASCADE;
DROP TABLE IF EXISTS "WO_JASA" CASCADE;
DROP TABLE IF EXISTS "WO_MEKANIK" CASCADE;
DROP TABLE IF EXISTS "WORK_ORDER" CASCADE;
DROP TABLE IF EXISTS "STOK_CABANG" CASCADE;
DROP TABLE IF EXISTS "SUPPLIER_SUKU_CADANG" CASCADE;
DROP TABLE IF EXISTS "RIWAYAT_KEPEMILIKAN" CASCADE;
DROP TABLE IF EXISTS "SUKU_CADANG" CASCADE;
DROP TABLE IF EXISTS "SUPPLIER" CASCADE;
DROP TABLE IF EXISTS "JASA_SERVIS" CASCADE;
DROP TABLE IF EXISTS "MOTOR" CASCADE;
DROP TABLE IF EXISTS "PELANGGAN" CASCADE;
DROP TABLE IF EXISTS "MEKANIK" CASCADE;
DROP TABLE IF EXISTS "PEGAWAI" CASCADE;
DROP TABLE IF EXISTS "CABANG" CASCADE;


-- =========================================================
-- 2. CABANG
-- =========================================================

CREATE TABLE "CABANG" (
    "cabang_kode" VARCHAR(10) PRIMARY KEY,
    "cabang_nama" VARCHAR(100) NOT NULL,
    "cabang_alamat" VARCHAR(255) NOT NULL,
    "cabang_telp" VARCHAR(20) NOT NULL,
    "jam_buka" TIME NOT NULL,
    "jam_tutup" TIME NOT NULL,
    "kapasitas_slot" INT NOT NULL,

    CONSTRAINT "chk_cabang_kapasitas"
        CHECK (
          "kapasitas_slot" > 0
        ),

    CONSTRAINT "chk_cabang_jam"
        CHECK (
          "jam_tutup" > "jam_buka"
        )
);


-- =========================================================
-- 3. PEGAWAI
-- =========================================================

CREATE TABLE "PEGAWAI" (
    "pegawai_id" VARCHAR(10) PRIMARY KEY,
    "cabang_kode" VARCHAR(10) NOT NULL,
    "pegawai_nama" VARCHAR(100) NOT NULL,
    "pegawai_telp" VARCHAR(20) NOT NULL,
    "pegawai_peran" VARCHAR(30) NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "status_aktif" BOOLEAN DEFAULT TRUE NOT NULL,

    CONSTRAINT "fk_pegawai_cabang"
        FOREIGN KEY ("cabang_kode")
        REFERENCES "CABANG" ("cabang_kode"),

    CONSTRAINT "chk_pegawai_peran"
        CHECK (
            "pegawai_peran" IN (
                'Admin',
                'Kasir',
                'Mekanik Umum',
                'Mekanik Spesialis',
                'Petugas Gudang'
            )
        )
);


-- =========================================================
-- 4. MEKANIK
-- =========================================================

CREATE TABLE "MEKANIK" (
    "mekanik_id" VARCHAR(10) PRIMARY KEY,
    "mekanik_keahlian" VARCHAR(100) NOT NULL,

    CONSTRAINT "fk_mekanik_pegawai"
        FOREIGN KEY ("mekanik_id")
        REFERENCES "PEGAWAI" ("pegawai_id")
);


-- =========================================================
-- 5. PELANGGAN
-- =========================================================

CREATE TABLE "PELANGGAN" (
    "pelanggan_id" VARCHAR(10) PRIMARY KEY,
    "pelanggan_nama" VARCHAR(100) NOT NULL,
    "pelanggan_telp" VARCHAR(20) NOT NULL,
    "pelanggan_jenis_identitas" VARCHAR(20) NOT NULL,
    "pelanggan_no_identitas" VARCHAR(50) UNIQUE NOT NULL,
    "pelanggan_alamat" VARCHAR(255) NOT NULL,
    "pelanggan_cab_favorit" VARCHAR(10),
    "mekanik_id_pilihan" VARCHAR(10),

    CONSTRAINT "fk_pelanggan_cabang"
        FOREIGN KEY ("pelanggan_cab_favorit")
        REFERENCES "CABANG" ("cabang_kode"),

    CONSTRAINT "fk_pelanggan_mekanik"
        FOREIGN KEY ("mekanik_id_pilihan")
        REFERENCES "MEKANIK" ("mekanik_id"),

    CONSTRAINT "chk_pelanggan_identitas"
        CHECK (
          "pelanggan_jenis_identitas"
          IN ('KTP', 'SIM', 'Paspor')
        )
);

COMMENT ON COLUMN "PELANGGAN"."mekanik_id_pilihan"
IS 'Mekanik pilihan atau favorit pelanggan';

COMMENT ON COLUMN "PELANGGAN"."pelanggan_cab_favorit"
IS 'Cabang favorit pelanggan';


-- =========================================================
-- 6. MOTOR
-- =========================================================

CREATE TABLE "MOTOR" (
    "motor_nopol" VARCHAR(15) PRIMARY KEY,
    "pelanggan_id" VARCHAR(10) NOT NULL,
    "motor_no_rangka" VARCHAR(50) NOT NULL,
    "motor_no_mesin" VARCHAR(50) NOT NULL,
    "motor_merek" VARCHAR(50) NOT NULL,
    "motor_tipe" VARCHAR(50) NOT NULL,
    "motor_tahun" INT NOT NULL,
    "motor_warna" VARCHAR(30) NOT NULL,
    "motor_kilometer" INT DEFAULT 0,

    CONSTRAINT "fk_motor_pelanggan"
        FOREIGN KEY ("pelanggan_id")
        REFERENCES "PELANGGAN" ("pelanggan_id"),

    CONSTRAINT "chk_motor_tahun"
        CHECK (
          "motor_tahun" BETWEEN 1900 AND 2100
        ),

    CONSTRAINT "chk_motor_kilometer"
        CHECK ("motor_kilometer" >= 0)
);


-- =========================================================
-- 7. RIWAYAT KEPEMILIKAN
-- =========================================================

CREATE TABLE "RIWAYAT_KEPEMILIKAN" (
    "riwayat_id" VARCHAR(10) PRIMARY KEY,
    "motor_nopol" VARCHAR(15) NOT NULL,
    "pelanggan_id" VARCHAR(10) NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE,

    CONSTRAINT "fk_riwayat_motor"
        FOREIGN KEY ("motor_nopol")
        REFERENCES "MOTOR" ("motor_nopol"),

    CONSTRAINT "fk_riwayat_pelanggan"
        FOREIGN KEY ("pelanggan_id")
        REFERENCES "PELANGGAN" ("pelanggan_id"),

    CONSTRAINT "chk_riwayat_tanggal"
        CHECK (
          "tanggal_selesai" >= "tanggal_mulai"
        )
);


-- =========================================================
-- 8. JASA SERVIS
-- =========================================================

CREATE TABLE "JASA_SERVIS" (
    "jasa_kode" VARCHAR(10) PRIMARY KEY,
    "jasa_uraian" VARCHAR(150) NOT NULL,
    "jasa_biaya" INT NOT NULL,

    CONSTRAINT "chk_jasa_biaya"
        CHECK ("jasa_biaya" >= 0)
);


-- =========================================================
-- 9. SUKU CADANG
-- =========================================================

CREATE TABLE "SUKU_CADANG" (
    "suku_cadang_kode" VARCHAR(10) PRIMARY KEY,
    "suku_cadang_nama" VARCHAR(100) NOT NULL,
    "suku_cadang_harga_satuan" INT NOT NULL,

    CONSTRAINT "chk_suku_cadang_harga"
        CHECK ("suku_cadang_harga_satuan" >= 0)
);


-- =========================================================
-- 10. SUPPLIER
-- =========================================================

CREATE TABLE "SUPPLIER" (
    "supplier_id" VARCHAR(10) PRIMARY KEY,
    "supplier_nama" VARCHAR(100) NOT NULL,
    "supplier_telp" VARCHAR(20) NOT NULL,
    "supplier_alamat" VARCHAR(255) NOT NULL
);


-- =========================================================
-- 11. SUPPLIER - SUKU CADANG
-- =========================================================

CREATE TABLE "SUPPLIER_SUKU_CADANG" (
    "supplier_id" VARCHAR(10) NOT NULL,
    "suku_cadang_kode" VARCHAR(10) NOT NULL,

    PRIMARY KEY (
        "supplier_id",
        "suku_cadang_kode"
    ),

    CONSTRAINT "fk_ssc_supplier"
        FOREIGN KEY ("supplier_id")
        REFERENCES "SUPPLIER" ("supplier_id"),

    CONSTRAINT "fk_ssc_suku_cadang"
        FOREIGN KEY ("suku_cadang_kode")
        REFERENCES "SUKU_CADANG" ("suku_cadang_kode")
);


-- =========================================================
-- 12. STOK CABANG
-- =========================================================

CREATE TABLE "STOK_CABANG" (
    "cabang_kode" VARCHAR(10) NOT NULL,
    "suku_cadang_kode" VARCHAR(10) NOT NULL,
    "stok_qty" INT NOT NULL DEFAULT 0,
    "stok_minimum" INT NOT NULL DEFAULT 0,

    PRIMARY KEY (
        "cabang_kode",
        "suku_cadang_kode"
    ),

    CONSTRAINT "fk_stok_cabang"
        FOREIGN KEY ("cabang_kode")
        REFERENCES "CABANG" ("cabang_kode"),

    CONSTRAINT "fk_stok_suku_cadang"
        FOREIGN KEY ("suku_cadang_kode")
        REFERENCES "SUKU_CADANG" ("suku_cadang_kode"),

    CONSTRAINT "chk_stok_qty"
        CHECK ("stok_qty" >= 0),

    CONSTRAINT "chk_stok_minimum"
        CHECK ("stok_minimum" >= 0)
);


-- =========================================================
-- 13. WORK ORDER
-- =========================================================
-- Informasi pembayaran tetap berada di WORK_ORDER
-- =========================================================

CREATE TABLE "WORK_ORDER" (
    "work_no" VARCHAR(15) PRIMARY KEY,
    "work_tgl_masuk" TIMESTAMPTZ NOT NULL,
    "work_tgl_selesai" TIMESTAMPTZ NOT NULL,
    "work_status" VARCHAR(20) NOT NULL DEFAULT 'Dibuat',
    "work_keluhan" TEXT NOT NULL,

    "cabang_kode" VARCHAR(10) NOT NULL,
    "motor_nopol" VARCHAR(15) NOT NULL,
    "mekanik_id" VARCHAR(10) NOT NULL,

    "pembayaran_diskon" INT DEFAULT 0,
    "pembayaran_metode" VARCHAR(20) NOT NULL DEFAULT 'Tunai',
    "pembayaran_status" VARCHAR(20) NOT NULL DEFAULT 'Belum Lunas',

    CONSTRAINT "fk_work_order_cabang"
        FOREIGN KEY ("cabang_kode")
        REFERENCES "CABANG" ("cabang_kode"),

    CONSTRAINT "fk_work_order_motor"
        FOREIGN KEY ("motor_nopol")
        REFERENCES "MOTOR" ("motor_nopol"),

    CONSTRAINT "fk_work_order_mekanik"
        FOREIGN KEY ("mekanik_id")
        REFERENCES "MEKANIK" ("mekanik_id"),

    CONSTRAINT "chk_work_status"
        CHECK (
            "work_status" IN (
                'Dibuat',
                'Diproses',
                'Selesai',
                'Dibatalkan'
            )
        ),

    CONSTRAINT "chk_work_tanggal"
        CHECK (
          "work_tgl_selesai" >= "work_tgl_masuk"
        ),

    CONSTRAINT "chk_pembayaran_diskon"
        CHECK ("pembayaran_diskon" >= 0),

    CONSTRAINT "chk_pembayaran_metode"
        CHECK (
          "pembayaran_metode" IN (
            'Tunai',
            'Debit',
            'Kredit',
            'QRIS',
            'Transfer'
          )
        ),

    CONSTRAINT "chk_pembayaran_status"
        CHECK (
            "pembayaran_status" IN (
                'Belum Lunas',
                'Lunas',
                'Dibatalkan'
            )
        )
);

COMMENT ON COLUMN "WORK_ORDER"."mekanik_id"
IS 'Mekanik penanggung jawab utama';

COMMENT ON COLUMN "WORK_ORDER"."pembayaran_diskon"
IS 'Diskon yang diberikan pada transaksi work order';

COMMENT ON COLUMN "WORK_ORDER"."pembayaran_metode"
IS 'Metode pembayaran work order';

COMMENT ON COLUMN "WORK_ORDER"."pembayaran_status"
IS 'Status pembayaran work order';


-- =========================================================
-- 14. WO - MEKANIK
-- =========================================================
-- Digunakan agar satu WO dapat ditangani lebih dari satu mekanik
-- =========================================================

CREATE TABLE "WO_MEKANIK" (
    "work_no" VARCHAR(15) NOT NULL,
    "mekanik_id" VARCHAR(10) NOT NULL,
    "peran_mekanik" VARCHAR(30) NOT NULL DEFAULT 'Pembantu',

    PRIMARY KEY (
        "work_no",
        "mekanik_id"
    ),

    CONSTRAINT "fk_wo_mekanik_work"
        FOREIGN KEY ("work_no")
        REFERENCES "WORK_ORDER" ("work_no")
        ON DELETE CASCADE,

    CONSTRAINT "fk_wo_mekanik_mekanik"
        FOREIGN KEY ("mekanik_id")
        REFERENCES "MEKANIK" ("mekanik_id"),

    CONSTRAINT "chk_peran_mekanik"
        CHECK (
            "peran_mekanik" IN (
                'Penanggung Jawab',
                'Pembantu'
            )
        )
);


-- =========================================================
-- 15. WO - JASA
-- =========================================================

CREATE TABLE "WO_JASA" (
    "work_no" VARCHAR(15) NOT NULL,
    "jasa_kode" VARCHAR(10) NOT NULL,

    PRIMARY KEY (
        "work_no",
        "jasa_kode"
    ),

    CONSTRAINT "fk_wo_jasa_work"
        FOREIGN KEY ("work_no")
        REFERENCES "WORK_ORDER" ("work_no")
        ON DELETE CASCADE,

    CONSTRAINT "fk_wo_jasa_jasa"
        FOREIGN KEY ("jasa_kode")
        REFERENCES "JASA_SERVIS" ("jasa_kode")
);


-- =========================================================
-- 16. WO - SUKU CADANG
-- =========================================================

CREATE TABLE "WO_SUKU_CADANG" (
    "work_no" VARCHAR(15) NOT NULL,
    "suku_cadang_kode" VARCHAR(10) NOT NULL,
    "suku_cadang_qty" INT NOT NULL,
    "suku_cadang_jumlah" INT NOT NULL,

    PRIMARY KEY (
        "work_no",
        "suku_cadang_kode"
    ),

    CONSTRAINT "fk_wo_sc_work"
        FOREIGN KEY ("work_no")
        REFERENCES "WORK_ORDER" ("work_no")
        ON DELETE CASCADE,

    CONSTRAINT "fk_wo_sc_suku_cadang"
        FOREIGN KEY ("suku_cadang_kode")
        REFERENCES "SUKU_CADANG" ("suku_cadang_kode"),

    CONSTRAINT "chk_wo_sc_qty"
        CHECK ("suku_cadang_qty" > 0),

    CONSTRAINT "chk_wo_sc_jumlah"
        CHECK ("suku_cadang_jumlah" >= 0)
);


-- =========================================================
-- 17. GARANSI
-- =========================================================

CREATE TABLE "GARANSI" (
    "garansi_id" VARCHAR(10) NOT NULL,
    "work_no" VARCHAR(15) NOT NULL,
    "garansi_jumlah_hari" INT NOT NULL,
    "garansi_keterangan" VARCHAR(255) NOT NULL,

    PRIMARY KEY (
        "garansi_id",
        "work_no"
    ),

    CONSTRAINT "fk_garansi_work"
        FOREIGN KEY ("work_no")
        REFERENCES "WORK_ORDER" ("work_no"),

    CONSTRAINT "chk_garansi_hari"
        CHECK ("garansi_jumlah_hari" > 0)
);


-- =========================================================
-- SELESAI
-- =========================================================