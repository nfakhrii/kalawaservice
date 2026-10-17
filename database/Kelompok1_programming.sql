-- =========================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL
-- TUGAS 3 - MINGGU 4
-- TRIGGER AUDIT LOG
-- =========================================================

-- =========================================================
-- KELOMPOK 1
-- ANGGOTA KELOMPOK :
-- ARY SIGIT JULIAN (2330105030001)46
-- EDWARD CHRISTIAN RUFUS (2330105030019)
-- FEBRIAN NUR HIDAYAT (2330105030026)
-- NAUFAL FAKHRI (2330105030011)
-- RAYDAMAR RIZKYAKA RIYADI (2330205030035)
-- =========================================================

-- =========================================================
-- 1. FUNCTION AUDIT
-- =========================================================

CREATE OR REPLACE FUNCTION "fn_audit_log"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_data_id VARCHAR(50);
BEGIN

    -- Menentukan ID data berdasarkan tabel yang diaudit
    IF TG_TABLE_NAME = 'WORK_ORDER' THEN
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'work_no'),
            (to_jsonb(OLD) ->> 'work_no')
        );

    ELSIF TG_TABLE_NAME = 'STOK_CABANG' THEN
        -- KOREKSI: Menggabungkan cabang_kode dan suku_cadang_kode
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'cabang_kode') || '-' || (to_jsonb(NEW) ->> 'suku_cadang_kode'),
            (to_jsonb(OLD) ->> 'cabang_kode') || '-' || (to_jsonb(OLD) ->> 'suku_cadang_kode')
        );

    ELSIF TG_TABLE_NAME = 'WO_SUKU_CADANG' THEN
        -- KOREKSI: Menggabungkan work_no dan suku_cadang_kode
        v_data_id := COALESCE(
            (to_jsonb(NEW) ->> 'work_no') || '-' || (to_jsonb(NEW) ->> 'suku_cadang_kode'),
            (to_jsonb(OLD) ->> 'work_no') || '-' || (to_jsonb(OLD) ->> 'suku_cadang_kode')
        );

    ELSE
        v_data_id := 'UNKNOWN';
    END IF;


    -- =====================================================
    -- INSERT
    -- =====================================================
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AUDIT_LOG" (
            "nama_tabel", "nama_operasi", "data_id", 
            "user_database", "waktu_perubahan", 
            "data_lama", "data_baru"
        )
        VALUES (
            TG_TABLE_NAME, TG_OP, v_data_id, 
            CURRENT_USER, CURRENT_TIMESTAMP, 
            NULL, to_jsonb(NEW)
        );
        RETURN NEW;

    -- =====================================================
    -- UPDATE
    -- =====================================================
    ELSIF TG_OP = 'UPDATE' THEN
        -- Optimalisasi opsional: Hanya mencatat jika ada data yang benar-benar berubah
        IF OLD IS DISTINCT FROM NEW THEN
            INSERT INTO "AUDIT_LOG" (
                "nama_tabel", "nama_operasi", "data_id", 
                "user_database", "waktu_perubahan", 
                "data_lama", "data_baru"
            )
            VALUES (
                TG_TABLE_NAME, TG_OP, v_data_id, 
                CURRENT_USER, CURRENT_TIMESTAMP, 
                to_jsonb(OLD), to_jsonb(NEW)
            );
        END IF;
        RETURN NEW;

    -- =====================================================
    -- DELETE
    -- =====================================================
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AUDIT_LOG" (
            "nama_tabel", "nama_operasi", "data_id", 
            "user_database", "waktu_perubahan", 
            "data_lama", "data_baru"
        )
        VALUES (
            TG_TABLE_NAME, TG_OP, v_data_id, 
            CURRENT_USER, CURRENT_TIMESTAMP, 
            to_jsonb(OLD), NULL
        );
        RETURN OLD;

    END IF;

    RETURN NULL;
END;
$$;

-- Menerapkan ke WORK_ORDER
CREATE TRIGGER  trg_audit_work_order
AFTER INSERT OR UPDATE OR DELETE ON "WORK_ORDER"
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Menerapkan ke STOK_CABANG
CREATE TRIGGER trg_audit_stok_cabang
AFTER INSERT OR UPDATE OR DELETE ON "STOK_CABANG"
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Menerapkan ke WO_SUKU_CADANG
CREATE TRIGGER trg_audit_wo_suku_cadang
AFTER INSERT OR UPDATE OR DELETE ON "WO_SUKU_CADANG"
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =========================================================
-- 2. Trigger Mencegah Tanggal Work Order Lebih Besar dari Tanggal Saat Ini
-- =========================================================

-- Membuat fungsi untuk validasi tanggal
CREATE OR REPLACE FUNCTION trg_fn_cegah_tanggal_wo_masa_depan()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_tgl_masuk > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Tanggal masuk work order tidak boleh lebih besar dari tanggal saat ini.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Membuat trigger pada tabel WORK_ORDER
CREATE TRIGGER trg_cegah_tanggal_wo
BEFORE INSERT OR UPDATE ON "WORK_ORDER"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_cegah_tanggal_wo_masa_depan();


-- =========================================================
-- 3. Trigger Mengurangi Stok Suku Cadang
-- =========================================================

-- Membuat fungsi untuk mengurangi stok
CREATE OR REPLACE FUNCTION trg_fn_kurangi_stok()
RETURNS TRIGGER AS $$
DECLARE
    v_cabang_kode VARCHAR(10);
BEGIN
    -- Mengambil kode cabang tempat work order diproses
    SELECT cabang_kode INTO v_cabang_kode
    FROM "WORK_ORDER"
    WHERE work_no = NEW.work_no;

    -- Mengurangi jumlah stok di cabang tersebut
    UPDATE "STOK_CABANG"
    SET stok_qty = stok_qty - NEW.suku_cadang_qty
    WHERE cabang_kode = v_cabang_kode 
      AND suku_cadang_kode = NEW.suku_cadang_kode;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Membuat trigger pada tabel WO_SUKU_CADANG
CREATE TRIGGER trg_kurangi_stok_suku_cadang
AFTER INSERT ON "WO_SUKU_CADANG"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_kurangi_stok();


-- =========================================================
-- 4. Stored Procedure Menampilkan Riwayat Servis
-- =========================================================

CREATE OR REPLACE FUNCTION sp_riwayat_servis(p_motor_nopol VARCHAR)
RETURNS TABLE (
    work_no VARCHAR,
    tgl_masuk TIMESTAMPTZ,
    tgl_selesai TIMESTAMPTZ,
    status VARCHAR,
    keluhan TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.work_no, w.work_tgl_masuk, w.work_tgl_selesai, w.work_status, w.work_keluhan
    FROM "WORK_ORDER" w
    WHERE w.motor_nopol = p_motor_nopol
    ORDER BY w.work_tgl_masuk DESC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 5. Stored Procedure Menampilkan Daftar Work Order (Rentang Tanggal & Cabang)
-- =========================================================

CREATE OR REPLACE FUNCTION sp_daftar_wo_cabang(
    p_tgl_awal TIMESTAMPTZ,
    p_tgl_akhir TIMESTAMPTZ,
    p_cabang_kode VARCHAR
)
RETURNS TABLE (
    work_no VARCHAR,
    tgl_masuk TIMESTAMPTZ,
    motor_nopol VARCHAR,
    keluhan TEXT,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.work_no, w.work_tgl_masuk, w.motor_nopol, w.work_keluhan, w.work_status
    FROM "WORK_ORDER" w
    WHERE w.cabang_kode = p_cabang_kode
      AND w.work_tgl_masuk BETWEEN p_tgl_awal AND p_tgl_akhir
    ORDER BY w.work_tgl_masuk ASC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 6.Stored Procedure Menghitung Total Tagihan
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_hitung_total_tagihan(
    IN p_work_no VARCHAR,
    OUT p_total_tagihan INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_jasa INT := 0;
    v_total_suku_cadang INT := 0;
    v_diskon INT := 0;
BEGIN
    -- 1. Hitung total biaya jasa servis
    SELECT COALESCE(SUM(js.jasa_biaya), 0) INTO v_total_jasa
    FROM "WO_JASA" wj
    JOIN "JASA_SERVIS" js ON wj.jasa_kode = js.jasa_kode
    WHERE wj.work_no = p_work_no;

    -- 2. Hitung total suku cadang
    SELECT COALESCE(SUM(ws.suku_cadang_jumlah), 0) INTO v_total_suku_cadang
    FROM "WO_SUKU_CADANG" ws
    WHERE ws.work_no = p_work_no;

    -- 3. Ambil nilai diskon dari work order
    SELECT COALESCE(pembayaran_diskon, 0) INTO v_diskon
    FROM "WORK_ORDER"
    WHERE work_no = p_work_no;

    -- 4. Kalkulasi hasil akhir
    p_total_tagihan := (v_total_jasa + v_total_suku_cadang) - v_diskon;
END;
$$;

-- =========================================================
-- 7.Function Menghitung Status Garansi
-- =========================================================

CREATE OR REPLACE FUNCTION fn_status_garansi_by_wo(
    p_work_no VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_tgl_selesai TIMESTAMPTZ;
    v_jumlah_hari INT;
    v_tgl_kadaluarsa TIMESTAMPTZ;
BEGIN
    -- Mengambil tanggal selesai dari WORK_ORDER dan jumlah hari dari GARANSI
    SELECT w.work_tgl_selesai, g.garansi_jumlah_hari 
    INTO v_tgl_selesai, v_jumlah_hari
    FROM "WORK_ORDER" w
    LEFT JOIN "GARANSI" g ON w.work_no = g.work_no
    WHERE w.work_no = p_work_no;

    -- Validasi: Jika work order tidak ditemukan atau tidak memiliki garansi
    IF v_tgl_selesai IS NULL OR v_jumlah_hari IS NULL THEN
        RETURN 'Tidak Ada Garansi / Data Tidak Valid';
    END IF;

    -- Menambahkan jumlah hari ke tanggal selesai
    v_tgl_kadaluarsa := v_tgl_selesai + (v_jumlah_hari || ' days')::interval;

    -- Evaluasi perbandingan waktu
    IF CURRENT_TIMESTAMP <= v_tgl_kadaluarsa THEN
        RETURN 'Garansi Aktif';
    ELSE
        RETURN 'Garansi Kadaluarsa';
    END IF;
END;
$$ LANGUAGE plpgsql;
	
	