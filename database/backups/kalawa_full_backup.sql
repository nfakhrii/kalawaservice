--
-- PostgreSQL database dump
--

\restrict B1bBWqduUSm1nJBnUVmTiw0t3a5fdXihNS0AjLeb1vDvN5ppRbJFoiEfWvgS6cM

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."WORK_ORDER" DROP CONSTRAINT IF EXISTS fk_work_order_tagihan;
ALTER TABLE IF EXISTS ONLY public."WORK_ORDER" DROP CONSTRAINT IF EXISTS fk_work_order_motor;
ALTER TABLE IF EXISTS ONLY public."WORK_ORDER" DROP CONSTRAINT IF EXISTS fk_work_order_mekanik;
ALTER TABLE IF EXISTS ONLY public."WORK_ORDER" DROP CONSTRAINT IF EXISTS fk_work_order_cabang;
ALTER TABLE IF EXISTS ONLY public."WO_SUKU_CADANG" DROP CONSTRAINT IF EXISTS fk_wo_sc_work;
ALTER TABLE IF EXISTS ONLY public."WO_SUKU_CADANG" DROP CONSTRAINT IF EXISTS fk_wo_sc_suku_cadang;
ALTER TABLE IF EXISTS ONLY public."WO_MEKANIK" DROP CONSTRAINT IF EXISTS fk_wo_mekanik_work;
ALTER TABLE IF EXISTS ONLY public."WO_MEKANIK" DROP CONSTRAINT IF EXISTS fk_wo_mekanik_mekanik;
ALTER TABLE IF EXISTS ONLY public."WO_JASA" DROP CONSTRAINT IF EXISTS fk_wo_jasa_work;
ALTER TABLE IF EXISTS ONLY public."WO_JASA" DROP CONSTRAINT IF EXISTS fk_wo_jasa_jasa;
ALTER TABLE IF EXISTS ONLY public."TAGIHAN_KOLEKTIF" DROP CONSTRAINT IF EXISTS fk_tagihan_pelanggan;
ALTER TABLE IF EXISTS ONLY public."STOK_CABANG" DROP CONSTRAINT IF EXISTS fk_stok_suku_cadang;
ALTER TABLE IF EXISTS ONLY public."STOK_CABANG" DROP CONSTRAINT IF EXISTS fk_stok_cabang;
ALTER TABLE IF EXISTS ONLY public."SUPPLIER_SUKU_CADANG" DROP CONSTRAINT IF EXISTS fk_ssc_supplier;
ALTER TABLE IF EXISTS ONLY public."SUPPLIER_SUKU_CADANG" DROP CONSTRAINT IF EXISTS fk_ssc_suku_cadang;
ALTER TABLE IF EXISTS ONLY public."RIWAYAT_KEPEMILIKAN" DROP CONSTRAINT IF EXISTS fk_riwayat_pelanggan;
ALTER TABLE IF EXISTS ONLY public."RIWAYAT_KEPEMILIKAN" DROP CONSTRAINT IF EXISTS fk_riwayat_motor;
ALTER TABLE IF EXISTS ONLY public."PELANGGAN" DROP CONSTRAINT IF EXISTS fk_pelanggan_mekanik;
ALTER TABLE IF EXISTS ONLY public."PELANGGAN" DROP CONSTRAINT IF EXISTS fk_pelanggan_cabang;
ALTER TABLE IF EXISTS ONLY public."PEGAWAI" DROP CONSTRAINT IF EXISTS fk_pegawai_cabang;
ALTER TABLE IF EXISTS ONLY public."MOTOR" DROP CONSTRAINT IF EXISTS fk_motor_pelanggan;
ALTER TABLE IF EXISTS ONLY public."MEKANIK" DROP CONSTRAINT IF EXISTS fk_mekanik_pegawai;
ALTER TABLE IF EXISTS ONLY public."KONTRAK_KORPORAT" DROP CONSTRAINT IF EXISTS fk_kontrak_pelanggan;
ALTER TABLE IF EXISTS ONLY public."GARANSI" DROP CONSTRAINT IF EXISTS fk_garansi_work;
DROP TRIGGER IF EXISTS trg_potong_plafon_korporat ON public."WORK_ORDER";
DROP TRIGGER IF EXISTS trg_lunasi_tagihan_kolektif ON public."TAGIHAN_KOLEKTIF";
DROP TRIGGER IF EXISTS trg_kurangi_stok_suku_cadang ON public."WO_SUKU_CADANG";
DROP TRIGGER IF EXISTS trg_kembalikan_stok_suku_cadang ON public."WO_SUKU_CADANG";
DROP TRIGGER IF EXISTS trg_cegah_tanggal_wo ON public."WORK_ORDER";
DROP TRIGGER IF EXISTS trg_audit_work_order ON public."WORK_ORDER";
DROP TRIGGER IF EXISTS trg_audit_wo_suku_cadang ON public."WO_SUKU_CADANG";
DROP TRIGGER IF EXISTS trg_audit_tagihan_kolektif ON public."TAGIHAN_KOLEKTIF";
DROP TRIGGER IF EXISTS trg_audit_stok_cabang ON public."STOK_CABANG";
DROP TRIGGER IF EXISTS trg_audit_kontrak_korporat ON public."KONTRAK_KORPORAT";
ALTER TABLE IF EXISTS ONLY public."WO_SUKU_CADANG" DROP CONSTRAINT IF EXISTS "WO_SUKU_CADANG_pkey";
ALTER TABLE IF EXISTS ONLY public."WO_MEKANIK" DROP CONSTRAINT IF EXISTS "WO_MEKANIK_pkey";
ALTER TABLE IF EXISTS ONLY public."WO_JASA" DROP CONSTRAINT IF EXISTS "WO_JASA_pkey";
ALTER TABLE IF EXISTS ONLY public."WORK_ORDER" DROP CONSTRAINT IF EXISTS "WORK_ORDER_pkey";
ALTER TABLE IF EXISTS ONLY public."TAGIHAN_KOLEKTIF" DROP CONSTRAINT IF EXISTS "TAGIHAN_KOLEKTIF_pkey";
ALTER TABLE IF EXISTS ONLY public."SUPPLIER" DROP CONSTRAINT IF EXISTS "SUPPLIER_pkey";
ALTER TABLE IF EXISTS ONLY public."SUPPLIER_SUKU_CADANG" DROP CONSTRAINT IF EXISTS "SUPPLIER_SUKU_CADANG_pkey";
ALTER TABLE IF EXISTS ONLY public."SUKU_CADANG" DROP CONSTRAINT IF EXISTS "SUKU_CADANG_pkey";
ALTER TABLE IF EXISTS ONLY public."STOK_CABANG" DROP CONSTRAINT IF EXISTS "STOK_CABANG_pkey";
ALTER TABLE IF EXISTS ONLY public."RIWAYAT_KEPEMILIKAN" DROP CONSTRAINT IF EXISTS "RIWAYAT_KEPEMILIKAN_pkey";
ALTER TABLE IF EXISTS ONLY public."PELANGGAN" DROP CONSTRAINT IF EXISTS "PELANGGAN_pkey";
ALTER TABLE IF EXISTS ONLY public."PELANGGAN" DROP CONSTRAINT IF EXISTS "PELANGGAN_pelanggan_no_identitas_key";
ALTER TABLE IF EXISTS ONLY public."PEGAWAI" DROP CONSTRAINT IF EXISTS "PEGAWAI_pkey";
ALTER TABLE IF EXISTS ONLY public."MOTOR" DROP CONSTRAINT IF EXISTS "MOTOR_pkey";
ALTER TABLE IF EXISTS ONLY public."MEKANIK" DROP CONSTRAINT IF EXISTS "MEKANIK_pkey";
ALTER TABLE IF EXISTS ONLY public."KONTRAK_KORPORAT" DROP CONSTRAINT IF EXISTS "KONTRAK_KORPORAT_pkey";
ALTER TABLE IF EXISTS ONLY public."JASA_SERVIS" DROP CONSTRAINT IF EXISTS "JASA_SERVIS_pkey";
ALTER TABLE IF EXISTS ONLY public."GARANSI" DROP CONSTRAINT IF EXISTS "GARANSI_pkey";
ALTER TABLE IF EXISTS ONLY public."CABANG" DROP CONSTRAINT IF EXISTS "CABANG_pkey";
ALTER TABLE IF EXISTS ONLY public."AUDIT_LOG" DROP CONSTRAINT IF EXISTS "AUDIT_LOG_pkey";
ALTER TABLE IF EXISTS public."AUDIT_LOG" ALTER COLUMN audit_id DROP DEFAULT;
DROP TABLE IF EXISTS public."WO_SUKU_CADANG";
DROP TABLE IF EXISTS public."WO_MEKANIK";
DROP TABLE IF EXISTS public."WO_JASA";
DROP VIEW IF EXISTS public."VW_WORK_ORDER_AMAN";
DROP TABLE IF EXISTS public."WORK_ORDER";
DROP VIEW IF EXISTS public."VW_PELANGGAN_AMAN";
DROP TABLE IF EXISTS public."TAGIHAN_KOLEKTIF";
DROP TABLE IF EXISTS public."SUPPLIER_SUKU_CADANG";
DROP TABLE IF EXISTS public."SUPPLIER";
DROP TABLE IF EXISTS public."SUKU_CADANG";
DROP TABLE IF EXISTS public."STOK_CABANG";
DROP TABLE IF EXISTS public."RIWAYAT_KEPEMILIKAN";
DROP TABLE IF EXISTS public."PELANGGAN";
DROP TABLE IF EXISTS public."PEGAWAI";
DROP TABLE IF EXISTS public."MOTOR";
DROP TABLE IF EXISTS public."MEKANIK";
DROP TABLE IF EXISTS public."KONTRAK_KORPORAT";
DROP TABLE IF EXISTS public."JASA_SERVIS";
DROP TABLE IF EXISTS public."GARANSI";
DROP TABLE IF EXISTS public."CABANG";
DROP SEQUENCE IF EXISTS public."AUDIT_LOG_audit_id_seq";
DROP TABLE IF EXISTS public."AUDIT_LOG";
DROP FUNCTION IF EXISTS public.trg_fn_potong_plafon_korporat();
DROP FUNCTION IF EXISTS public.trg_fn_lunasi_tagihan_kolektif();
DROP FUNCTION IF EXISTS public.trg_fn_kurangi_stok();
DROP FUNCTION IF EXISTS public.trg_fn_kembalikan_stok();
DROP FUNCTION IF EXISTS public.trg_fn_cegah_tanggal_wo_masa_depan();
DROP FUNCTION IF EXISTS public.sp_riwayat_servis(p_motor_nopol character varying);
DROP PROCEDURE IF EXISTS public.sp_hitung_total_tagihan(IN p_work_no character varying, OUT p_total_tagihan integer);
DROP FUNCTION IF EXISTS public.sp_daftar_wo_cabang(p_tgl_awal timestamp with time zone, p_tgl_akhir timestamp with time zone, p_cabang_kode character varying);
DROP FUNCTION IF EXISTS public.fn_status_garansi_by_wo(p_work_no character varying);
DROP FUNCTION IF EXISTS public.fn_hitung_total_tagihan(p_work_no character varying);
DROP FUNCTION IF EXISTS public.fn_audit_log();
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: fn_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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
            CURRENT_USER, CURRENT_TIMESTAMP,
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
                CURRENT_USER, CURRENT_TIMESTAMP,
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
            CURRENT_USER, CURRENT_TIMESTAMP,
            to_jsonb(OLD), NULL
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: fn_hitung_total_tagihan(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_hitung_total_tagihan(p_work_no character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total INT := 0;
BEGIN
    CALL sp_hitung_total_tagihan(p_work_no, v_total);
    RETURN GREATEST(COALESCE(v_total, 0), 0);
END;
$$;


--
-- Name: fn_status_garansi_by_wo(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_status_garansi_by_wo(p_work_no character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: sp_daftar_wo_cabang(timestamp with time zone, timestamp with time zone, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sp_daftar_wo_cabang(p_tgl_awal timestamp with time zone, p_tgl_akhir timestamp with time zone, p_cabang_kode character varying) RETURNS TABLE(work_no character varying, tgl_masuk timestamp with time zone, motor_nopol character varying, keluhan text, status character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT w.work_no, w.work_tgl_masuk, w.motor_nopol, w.work_keluhan, w.work_status
    FROM "WORK_ORDER" w
    WHERE w.cabang_kode = p_cabang_kode
      AND w.work_tgl_masuk BETWEEN p_tgl_awal AND p_tgl_akhir
    ORDER BY w.work_tgl_masuk ASC;
END;
$$;


--
-- Name: sp_hitung_total_tagihan(character varying); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_hitung_total_tagihan(IN p_work_no character varying, OUT p_total_tagihan integer)
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


--
-- Name: sp_riwayat_servis(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sp_riwayat_servis(p_motor_nopol character varying) RETURNS TABLE(work_no character varying, tgl_masuk timestamp with time zone, tgl_selesai timestamp with time zone, status character varying, keluhan text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT w.work_no, w.work_tgl_masuk, w.work_tgl_selesai, w.work_status, w.work_keluhan
    FROM "WORK_ORDER" w
    WHERE w.motor_nopol = p_motor_nopol
    ORDER BY w.work_tgl_masuk DESC;
END;
$$;


--
-- Name: trg_fn_cegah_tanggal_wo_masa_depan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_cegah_tanggal_wo_masa_depan() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.work_tgl_masuk > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Tanggal masuk work order tidak boleh lebih besar dari tanggal saat ini.';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_kembalikan_stok(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_kembalikan_stok() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: trg_fn_kurangi_stok(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_kurangi_stok() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: trg_fn_lunasi_tagihan_kolektif(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_lunasi_tagihan_kolektif() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: trg_fn_potong_plafon_korporat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_potong_plafon_korporat() RETURNS trigger
    LANGUAGE plpgsql
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AUDIT_LOG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AUDIT_LOG" (
    audit_id bigint NOT NULL,
    nama_tabel character varying(50) NOT NULL,
    nama_operasi character varying(10) NOT NULL,
    data_id character varying(50) NOT NULL,
    user_database character varying(100) DEFAULT CURRENT_USER NOT NULL,
    waktu_perubahan timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_lama jsonb,
    data_baru jsonb,
    CONSTRAINT chk_audit_operasi CHECK (((nama_operasi)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);


--
-- Name: AUDIT_LOG_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AUDIT_LOG_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AUDIT_LOG_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AUDIT_LOG_audit_id_seq" OWNED BY public."AUDIT_LOG".audit_id;


--
-- Name: CABANG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CABANG" (
    cabang_kode character varying(10) NOT NULL,
    cabang_nama character varying(100) NOT NULL,
    cabang_alamat character varying(255) NOT NULL,
    cabang_telp character varying(20) NOT NULL,
    jam_buka time without time zone NOT NULL,
    jam_tutup time without time zone NOT NULL,
    kapasitas_slot integer NOT NULL,
    CONSTRAINT chk_cabang_jam CHECK ((jam_tutup > jam_buka)),
    CONSTRAINT chk_cabang_kapasitas CHECK ((kapasitas_slot > 0))
);


--
-- Name: GARANSI; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GARANSI" (
    garansi_id character varying(10) NOT NULL,
    work_no character varying(15) NOT NULL,
    garansi_jumlah_hari integer NOT NULL,
    garansi_keterangan character varying(255) NOT NULL,
    CONSTRAINT chk_garansi_hari CHECK ((garansi_jumlah_hari > 0))
);


--
-- Name: JASA_SERVIS; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JASA_SERVIS" (
    jasa_kode character varying(10) NOT NULL,
    jasa_uraian character varying(150) NOT NULL,
    jasa_biaya integer NOT NULL,
    CONSTRAINT chk_jasa_biaya CHECK ((jasa_biaya >= 0))
);


--
-- Name: KONTRAK_KORPORAT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KONTRAK_KORPORAT" (
    kontrak_id character varying(15) NOT NULL,
    pelanggan_id character varying(10) NOT NULL,
    tgl_mulai date NOT NULL,
    tgl_akhir date NOT NULL,
    kuota_motor integer DEFAULT 10 NOT NULL,
    diskon_kontrak_persen integer DEFAULT 0 NOT NULL,
    status_kontrak character varying(20) DEFAULT 'Aktif'::character varying NOT NULL,
    CONSTRAINT chk_kontrak_diskon CHECK (((diskon_kontrak_persen >= 0) AND (diskon_kontrak_persen <= 100))),
    CONSTRAINT chk_kontrak_kuota CHECK ((kuota_motor > 0)),
    CONSTRAINT chk_kontrak_status CHECK (((status_kontrak)::text = ANY ((ARRAY['Aktif'::character varying, 'Berakhir'::character varying, 'Dibekukan'::character varying])::text[]))),
    CONSTRAINT chk_kontrak_tanggal CHECK ((tgl_akhir >= tgl_mulai))
);


--
-- Name: MEKANIK; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MEKANIK" (
    mekanik_id character varying(10) NOT NULL,
    mekanik_keahlian character varying(100) NOT NULL
);


--
-- Name: MOTOR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MOTOR" (
    motor_nopol character varying(15) NOT NULL,
    pelanggan_id character varying(10) NOT NULL,
    motor_no_rangka character varying(50) NOT NULL,
    motor_no_mesin character varying(50) NOT NULL,
    motor_merek character varying(50) NOT NULL,
    motor_tipe character varying(50) NOT NULL,
    motor_tahun integer NOT NULL,
    motor_warna character varying(30) NOT NULL,
    motor_kilometer integer DEFAULT 0,
    CONSTRAINT chk_motor_kilometer CHECK ((motor_kilometer >= 0)),
    CONSTRAINT chk_motor_tahun CHECK (((motor_tahun >= 1900) AND (motor_tahun <= 2100)))
);


--
-- Name: PEGAWAI; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PEGAWAI" (
    pegawai_id character varying(10) NOT NULL,
    cabang_kode character varying(10) NOT NULL,
    pegawai_nama character varying(100) NOT NULL,
    pegawai_telp character varying(20) NOT NULL,
    pegawai_peran character varying(30) NOT NULL,
    tanggal_mulai date NOT NULL,
    status_aktif boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_pegawai_peran CHECK (((pegawai_peran)::text = ANY ((ARRAY['Admin'::character varying, 'Kasir'::character varying, 'Mekanik Umum'::character varying, 'Mekanik Spesialis'::character varying, 'Petugas Gudang'::character varying])::text[])))
);


--
-- Name: PELANGGAN; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PELANGGAN" (
    pelanggan_id character varying(10) NOT NULL,
    pelanggan_nama character varying(100) NOT NULL,
    pelanggan_telp character varying(20) NOT NULL,
    pelanggan_jenis_identitas character varying(20) NOT NULL,
    pelanggan_no_identitas character varying(50) NOT NULL,
    pelanggan_alamat character varying(255) NOT NULL,
    pelanggan_cab_favorit character varying(10),
    mekanik_id_pilihan character varying(10),
    pelanggan_tipe character varying(20) DEFAULT 'Individu'::character varying NOT NULL,
    plafon_kredit integer DEFAULT 0 NOT NULL,
    sisa_plafon integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_pelanggan_identitas CHECK (((pelanggan_jenis_identitas)::text = ANY ((ARRAY['KTP'::character varying, 'SIM'::character varying, 'Paspor'::character varying, 'NPWP'::character varying, 'NIB'::character varying])::text[]))),
    CONSTRAINT chk_pelanggan_tipe CHECK (((pelanggan_tipe)::text = ANY ((ARRAY['Individu'::character varying, 'Korporat'::character varying])::text[]))),
    CONSTRAINT chk_plafon_kredit CHECK (((plafon_kredit >= 0) AND (sisa_plafon >= 0) AND (sisa_plafon <= plafon_kredit)))
);


--
-- Name: COLUMN "PELANGGAN".pelanggan_cab_favorit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PELANGGAN".pelanggan_cab_favorit IS 'Cabang favorit pelanggan';


--
-- Name: COLUMN "PELANGGAN".mekanik_id_pilihan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."PELANGGAN".mekanik_id_pilihan IS 'Mekanik pilihan atau favorit pelanggan';


--
-- Name: RIWAYAT_KEPEMILIKAN; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RIWAYAT_KEPEMILIKAN" (
    riwayat_id character varying(10) NOT NULL,
    motor_nopol character varying(15) NOT NULL,
    pelanggan_id character varying(10) NOT NULL,
    tanggal_mulai date NOT NULL,
    tanggal_selesai date,
    CONSTRAINT chk_riwayat_tanggal CHECK ((tanggal_selesai >= tanggal_mulai))
);


--
-- Name: STOK_CABANG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."STOK_CABANG" (
    cabang_kode character varying(10) NOT NULL,
    suku_cadang_kode character varying(10) NOT NULL,
    stok_qty integer DEFAULT 0 NOT NULL,
    stok_minimum integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_stok_minimum CHECK ((stok_minimum >= 0)),
    CONSTRAINT chk_stok_qty CHECK ((stok_qty >= 0))
);


--
-- Name: SUKU_CADANG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SUKU_CADANG" (
    suku_cadang_kode character varying(10) NOT NULL,
    suku_cadang_nama character varying(100) NOT NULL,
    suku_cadang_harga_satuan integer NOT NULL,
    CONSTRAINT chk_suku_cadang_harga CHECK ((suku_cadang_harga_satuan >= 0))
);


--
-- Name: SUPPLIER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SUPPLIER" (
    supplier_id character varying(10) NOT NULL,
    supplier_nama character varying(100) NOT NULL,
    supplier_telp character varying(20) NOT NULL,
    supplier_alamat character varying(255) NOT NULL
);


--
-- Name: SUPPLIER_SUKU_CADANG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SUPPLIER_SUKU_CADANG" (
    supplier_id character varying(10) NOT NULL,
    suku_cadang_kode character varying(10) NOT NULL
);


--
-- Name: TAGIHAN_KOLEKTIF; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TAGIHAN_KOLEKTIF" (
    tagihan_id character varying(15) NOT NULL,
    pelanggan_id character varying(10) NOT NULL,
    periode_bulan character varying(20) NOT NULL,
    total_tagihan integer DEFAULT 0 NOT NULL,
    status_tagihan character varying(20) DEFAULT 'Belum Dibayar'::character varying NOT NULL,
    tgl_jatuh_tempo date NOT NULL,
    tgl_lunas timestamp with time zone,
    CONSTRAINT chk_tagihan_status CHECK (((status_tagihan)::text = ANY ((ARRAY['Belum Dibayar'::character varying, 'Lunas'::character varying])::text[]))),
    CONSTRAINT chk_tagihan_total CHECK ((total_tagihan >= 0))
);


--
-- Name: VW_PELANGGAN_AMAN; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."VW_PELANGGAN_AMAN" AS
 SELECT pelanggan_id,
    pelanggan_nama,
    pelanggan_telp,
    pelanggan_cab_favorit,
    mekanik_id_pilihan,
    pelanggan_tipe,
    plafon_kredit,
    sisa_plafon
   FROM public."PELANGGAN";


--
-- Name: WORK_ORDER; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WORK_ORDER" (
    work_no character varying(15) NOT NULL,
    work_tgl_masuk timestamp with time zone NOT NULL,
    work_tgl_selesai timestamp with time zone,
    work_status character varying(20) DEFAULT 'Dibuat'::character varying NOT NULL,
    work_keluhan text NOT NULL,
    cabang_kode character varying(10) NOT NULL,
    motor_nopol character varying(15) NOT NULL,
    mekanik_id character varying(10) NOT NULL,
    pembayaran_diskon integer DEFAULT 0,
    pembayaran_metode character varying(20) DEFAULT 'Tunai'::character varying NOT NULL,
    pembayaran_status character varying(20) DEFAULT 'Belum Lunas'::character varying NOT NULL,
    tagihan_id character varying(15),
    CONSTRAINT chk_pembayaran_diskon CHECK ((pembayaran_diskon >= 0)),
    CONSTRAINT chk_pembayaran_metode CHECK (((pembayaran_metode)::text = ANY ((ARRAY['Tunai'::character varying, 'Debit'::character varying, 'Kredit'::character varying, 'QRIS'::character varying, 'Transfer'::character varying, 'Tagihan Kolektif'::character varying])::text[]))),
    CONSTRAINT chk_pembayaran_status CHECK (((pembayaran_status)::text = ANY ((ARRAY['Belum Lunas'::character varying, 'Lunas'::character varying, 'Dibatalkan'::character varying])::text[]))),
    CONSTRAINT chk_work_status CHECK (((work_status)::text = ANY ((ARRAY['Dibuat'::character varying, 'Diproses'::character varying, 'Antre'::character varying, 'Dikerjakan'::character varying, 'Selesai'::character varying, 'Dibayar'::character varying, 'Dibatalkan'::character varying])::text[]))),
    CONSTRAINT chk_work_tanggal CHECK (((work_tgl_selesai IS NULL) OR (work_tgl_selesai >= work_tgl_masuk)))
);


--
-- Name: COLUMN "WORK_ORDER".mekanik_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WORK_ORDER".mekanik_id IS 'Mekanik penanggung jawab utama';


--
-- Name: COLUMN "WORK_ORDER".pembayaran_diskon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WORK_ORDER".pembayaran_diskon IS 'Diskon yang diberikan pada transaksi work order';


--
-- Name: COLUMN "WORK_ORDER".pembayaran_metode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WORK_ORDER".pembayaran_metode IS 'Metode pembayaran work order';


--
-- Name: COLUMN "WORK_ORDER".pembayaran_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WORK_ORDER".pembayaran_status IS 'Status pembayaran work order';


--
-- Name: VW_WORK_ORDER_AMAN; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."VW_WORK_ORDER_AMAN" AS
 SELECT work_no,
    work_tgl_masuk,
    work_tgl_selesai,
    work_status,
    work_keluhan,
    cabang_kode,
    motor_nopol,
    mekanik_id,
    tagihan_id
   FROM public."WORK_ORDER";


--
-- Name: WO_JASA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WO_JASA" (
    work_no character varying(15) NOT NULL,
    jasa_kode character varying(10) NOT NULL
);


--
-- Name: WO_MEKANIK; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WO_MEKANIK" (
    work_no character varying(15) NOT NULL,
    mekanik_id character varying(10) NOT NULL,
    peran_mekanik character varying(30) DEFAULT 'Pembantu'::character varying NOT NULL,
    CONSTRAINT chk_peran_mekanik CHECK (((peran_mekanik)::text = ANY ((ARRAY['Penanggung Jawab'::character varying, 'Pembantu'::character varying])::text[])))
);


--
-- Name: WO_SUKU_CADANG; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WO_SUKU_CADANG" (
    work_no character varying(15) NOT NULL,
    suku_cadang_kode character varying(10) NOT NULL,
    suku_cadang_qty integer NOT NULL,
    suku_cadang_jumlah integer NOT NULL,
    CONSTRAINT chk_wo_sc_jumlah CHECK ((suku_cadang_jumlah >= 0)),
    CONSTRAINT chk_wo_sc_qty CHECK ((suku_cadang_qty > 0))
);


--
-- Name: AUDIT_LOG audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUDIT_LOG" ALTER COLUMN audit_id SET DEFAULT nextval('public."AUDIT_LOG_audit_id_seq"'::regclass);


--
-- Data for Name: AUDIT_LOG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AUDIT_LOG" (audit_id, nama_tabel, nama_operasi, data_id, user_database, waktu_perubahan, data_lama, data_baru) FROM stdin;
1	KONTRAK_KORPORAT	INSERT	KK001	postgres	2026-10-18 01:03:13.737557+07	\N	{"tgl_akhir": "2026-12-31", "tgl_mulai": "2026-01-01", "kontrak_id": "KK001", "kuota_motor": 25, "pelanggan_id": "PL007", "status_kontrak": "Aktif", "diskon_kontrak_persen": 10}
2	KONTRAK_KORPORAT	INSERT	KK002	postgres	2026-10-18 01:03:13.737557+07	\N	{"tgl_akhir": "2026-12-31", "tgl_mulai": "2026-01-01", "kontrak_id": "KK002", "kuota_motor": 15, "pelanggan_id": "PL008", "status_kontrak": "Aktif", "diskon_kontrak_persen": 5}
3	TAGIHAN_KOLEKTIF	INSERT	TK001	postgres	2026-10-18 01:03:13.737557+07	\N	{"tgl_lunas": null, "tagihan_id": "TK001", "pelanggan_id": "PL007", "periode_bulan": "2026-09", "total_tagihan": 585000, "status_tagihan": "Belum Dibayar", "tgl_jatuh_tempo": "2026-10-25"}
4	WORK_ORDER	INSERT	WO009	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO009", "mekanik_id": "PG003", "tagihan_id": "TK001", "cabang_kode": "CB001", "motor_nopol": "KH8001BK", "work_status": "Selesai", "work_keluhan": "Servis rutin armada kurir & ganti kampas rem depan + oli mesin", "work_tgl_masuk": "2026-09-12T08:30:00+07:00", "work_tgl_selesai": "2026-09-12T11:00:00+07:00", "pembayaran_diskon": 20000, "pembayaran_metode": "Tagihan Kolektif", "pembayaran_status": "Belum Lunas"}
5	WORK_ORDER	INSERT	WO010	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO010", "mekanik_id": "PG003", "tagihan_id": "TK001", "cabang_kode": "CB001", "motor_nopol": "KH8002BK", "work_status": "Selesai", "work_keluhan": "Perawatan CVT & penggantian V-Belt armada kurir ekspres", "work_tgl_masuk": "2026-09-14T09:15:00+07:00", "work_tgl_selesai": "2026-09-14T12:00:00+07:00", "pembayaran_diskon": 30000, "pembayaran_metode": "Tagihan Kolektif", "pembayaran_status": "Belum Lunas"}
6	WORK_ORDER	INSERT	WO011	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO011", "mekanik_id": "PG005", "tagihan_id": null, "cabang_kode": "CB002", "motor_nopol": "KH9001PR", "work_status": "Selesai", "work_keluhan": "Tune up & servis sistem injeksi armada rental eksekutif (siap ditagihkan kolektif)", "work_tgl_masuk": "2026-09-18T10:00:00+07:00", "work_tgl_selesai": "2026-09-18T12:30:00+07:00", "pembayaran_diskon": 15000, "pembayaran_metode": "Tagihan Kolektif", "pembayaran_status": "Belum Lunas"}
7	WORK_ORDER	INSERT	WO012	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO012", "mekanik_id": "PG004", "tagihan_id": null, "cabang_kode": "CB002", "motor_nopol": "KH9002PR", "work_status": "Dikerjakan", "work_keluhan": "Pengecekan kelistrikan & ganti oli mesin unit rental", "work_tgl_masuk": "2026-09-19T09:00:00+07:00", "work_tgl_selesai": null, "pembayaran_diskon": 0, "pembayaran_metode": "Tagihan Kolektif", "pembayaran_status": "Belum Lunas"}
8	WORK_ORDER	INSERT	WO013	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO013", "mekanik_id": "PG003", "tagihan_id": null, "cabang_kode": "CB001", "motor_nopol": "KH1010FF", "work_status": "Antre", "work_keluhan": "Servis berkala & pengecekan rem belakang", "work_tgl_masuk": "2026-09-20T08:30:00+07:00", "work_tgl_selesai": null, "pembayaran_diskon": 0, "pembayaran_metode": "Tunai", "pembayaran_status": "Belum Lunas"}
9	WO_SUKU_CADANG	INSERT	WO009-SC001	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO009", "suku_cadang_qty": 1, "suku_cadang_kode": "SC001", "suku_cadang_jumlah": 55000}
10	STOK_CABANG	UPDATE	CB001-SC001	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 30, "cabang_kode": "CB001", "stok_minimum": 5, "suku_cadang_kode": "SC001"}	{"stok_qty": 29, "cabang_kode": "CB001", "stok_minimum": 5, "suku_cadang_kode": "SC001"}
11	WO_SUKU_CADANG	INSERT	WO009-SC004	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO009", "suku_cadang_qty": 1, "suku_cadang_kode": "SC004", "suku_cadang_jumlah": 85000}
12	STOK_CABANG	UPDATE	CB001-SC004	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 15, "cabang_kode": "CB001", "stok_minimum": 3, "suku_cadang_kode": "SC004"}	{"stok_qty": 14, "cabang_kode": "CB001", "stok_minimum": 3, "suku_cadang_kode": "SC004"}
13	WO_SUKU_CADANG	INSERT	WO010-SC008	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO010", "suku_cadang_qty": 1, "suku_cadang_kode": "SC008", "suku_cadang_jumlah": 150000}
14	STOK_CABANG	UPDATE	CB001-SC008	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 10, "cabang_kode": "CB001", "stok_minimum": 2, "suku_cadang_kode": "SC008"}	{"stok_qty": 9, "cabang_kode": "CB001", "stok_minimum": 2, "suku_cadang_kode": "SC008"}
15	WO_SUKU_CADANG	INSERT	WO010-SC009	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO010", "suku_cadang_qty": 1, "suku_cadang_kode": "SC009", "suku_cadang_jumlah": 90000}
16	WO_SUKU_CADANG	INSERT	WO011-SC001	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO011", "suku_cadang_qty": 1, "suku_cadang_kode": "SC001", "suku_cadang_jumlah": 55000}
17	STOK_CABANG	UPDATE	CB002-SC001	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 25, "cabang_kode": "CB002", "stok_minimum": 5, "suku_cadang_kode": "SC001"}	{"stok_qty": 24, "cabang_kode": "CB002", "stok_minimum": 5, "suku_cadang_kode": "SC001"}
18	WO_SUKU_CADANG	INSERT	WO011-SC006	postgres	2026-10-18 01:03:13.737557+07	\N	{"work_no": "WO011", "suku_cadang_qty": 1, "suku_cadang_kode": "SC006", "suku_cadang_jumlah": 60000}
19	STOK_CABANG	UPDATE	CB002-SC006	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 20, "cabang_kode": "CB002", "stok_minimum": 4, "suku_cadang_kode": "SC006"}	{"stok_qty": 19, "cabang_kode": "CB002", "stok_minimum": 4, "suku_cadang_kode": "SC006"}
20	STOK_CABANG	UPDATE	CB001-SC008	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 9, "cabang_kode": "CB001", "stok_minimum": 2, "suku_cadang_kode": "SC008"}	{"stok_qty": 1, "cabang_kode": "CB001", "stok_minimum": 5, "suku_cadang_kode": "SC008"}
21	STOK_CABANG	UPDATE	CB001-SC007	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 15, "cabang_kode": "CB001", "stok_minimum": 3, "suku_cadang_kode": "SC007"}	{"stok_qty": 2, "cabang_kode": "CB001", "stok_minimum": 5, "suku_cadang_kode": "SC007"}
22	STOK_CABANG	UPDATE	CB002-SC010	postgres	2026-10-18 01:03:13.737557+07	{"stok_qty": 8, "cabang_kode": "CB002", "stok_minimum": 2, "suku_cadang_kode": "SC010"}	{"stok_qty": 1, "cabang_kode": "CB002", "stok_minimum": 3, "suku_cadang_kode": "SC010"}
23	STOK_CABANG	INSERT	CB001-SC015	postgres	2026-10-18 01:03:13.737557+07	\N	{"stok_qty": 2, "cabang_kode": "CB001", "stok_minimum": 5, "suku_cadang_kode": "SC015"}
\.


--
-- Data for Name: CABANG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CABANG" (cabang_kode, cabang_nama, cabang_alamat, cabang_telp, jam_buka, jam_tutup, kapasitas_slot) FROM stdin;
CB001	Kalawa Service Pahandut	Jl. Diponegoro No. 15, Pahandut	081234567801	08:00:00	17:00:00	20
CB002	Kalawa Service Jekan Raya	Jl. Rajawali No. 25, Jekan Raya	081234567802	08:00:00	17:00:00	18
CB003	Kalawa Service Bukit Batu	Jl. Cilik Riwut Km. 12, Bukit Batu	081234567803	08:00:00	17:00:00	15
\.


--
-- Data for Name: GARANSI; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GARANSI" (garansi_id, work_no, garansi_jumlah_hari, garansi_keterangan) FROM stdin;
GR001	WO001	14	Garansi servis mesin selama 14 hari setelah pekerjaan selesai.
GR002	WO002	14	Garansi sistem injeksi selama 14 hari setelah pekerjaan selesai.
GR003	WO008	30	Garansi pekerjaan transmisi selama 30 hari setelah pekerjaan selesai.
GR004	WO009	30	Garansi servis armada korporat PT Borneo Kurir Ekspres selama 30 hari.
GR005	WO010	30	Garansi CVT & V-Belt armada korporat PT Borneo Kurir Ekspres selama 30 hari.
\.


--
-- Data for Name: JASA_SERVIS; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JASA_SERVIS" (jasa_kode, jasa_uraian, jasa_biaya) FROM stdin;
JS001	Servis ringan	75000
JS002	Ganti oli mesin	25000
JS003	Ganti oli gardan	20000
JS004	Tune up	120000
JS005	Servis sistem injeksi	150000
JS006	Servis rem depan	80000
JS007	Servis rem belakang	75000
JS008	Servis CVT	130000
JS009	Servis kelistrikan	100000
JS010	Servis transmisi	175000
\.


--
-- Data for Name: KONTRAK_KORPORAT; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."KONTRAK_KORPORAT" (kontrak_id, pelanggan_id, tgl_mulai, tgl_akhir, kuota_motor, diskon_kontrak_persen, status_kontrak) FROM stdin;
KK001	PL007	2026-01-01	2026-12-31	25	10	Aktif
KK002	PL008	2026-01-01	2026-12-31	15	5	Aktif
\.


--
-- Data for Name: MEKANIK; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MEKANIK" (mekanik_id, mekanik_keahlian) FROM stdin;
PG003	Servis dan perawatan umum
PG004	Servis dan perawatan umum
PG005	Sistem injeksi dan kelistrikan
PG006	Mesin dan transmisi
\.


--
-- Data for Name: MOTOR; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MOTOR" (motor_nopol, pelanggan_id, motor_no_rangka, motor_no_mesin, motor_merek, motor_tipe, motor_tahun, motor_warna, motor_kilometer) FROM stdin;
KH1001AA	PL001	MH1JFZ12345670001	JFZ123450001	Honda	Vario 125	2021	Hitam	18500
KH1002AA	PL001	MH1JFZ12345670002	JFZ123450002	Honda	Beat	2020	Merah	22000
KH1003BB	PL002	MH1PCX12345670003	PCX123450003	Honda	PCX 160	2022	Putih	12000
KH1004BB	PL002	MH1VAR12345670004	VAR123450004	Honda	Vario 150	2019	Biru	28500
KH1005CC	PL003	MH3NMX12345670005	NMX123450005	Yamaha	NMAX	2021	Hitam	19500
KH1006CC	PL003	MH3R15X1234567006	R15X123450006	Yamaha	R15	2020	Biru	24000
KH1007DD	PL004	MH1GEN12345670007	GEN123450007	Honda	Genio	2022	Putih	11000
KH1008EE	PL005	MH3MIO12345670008	MIO123450008	Yamaha	Mio M3	2019	Merah	31000
KH1009EE	PL005	MH3LEX12345670009	LEX123450009	Yamaha	Lexi	2021	Abu-abu	17000
KH1010FF	PL006	MH1SCO1234567010	SCO123450010	Honda	Scoopy	2023	Cokelat	8000
KH8001BK	PL007	MH1JFZ99000008001	JFZ9908001	Honda	Beat Street Fleet	2024	Hitam	28400
KH8002BK	PL007	MH1JFZ99000008002	JFZ9908002	Honda	Vario 125 Kurir	2024	Merah	31200
KH9001PR	PL008	MH3NMX88000009001	NMX8809001	Yamaha	NMAX 155 Executive	2025	Biru	15600
KH9002PR	PL008	MH1PCX88000009002	PCX8809002	Honda	PCX 160 Rental	2025	Putih	11200
\.


--
-- Data for Name: PEGAWAI; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PEGAWAI" (pegawai_id, cabang_kode, pegawai_nama, pegawai_telp, pegawai_peran, tanggal_mulai, status_aktif) FROM stdin;
PG001	CB001	Rinaldi Rizwar	081300000001	Admin	2023-01-10	t
PG002	CB001	Budi Santoso	081300000002	Kasir	2023-02-15	t
PG003	CB001	Candra Hasibuan	081300000003	Mekanik Umum	2022-08-01	t
PG004	CB002	Dedi Kurniawan	081300000004	Mekanik Umum	2022-09-12	t
PG005	CB002	Renaldy Pratama	081300000005	Mekanik Spesialis	2023-03-20	t
PG006	CB003	Fajar Hidayat	081300000006	Mekanik Spesialis	2023-04-10	t
PG007	CB002	Gilang Ramadhan	081300000007	Petugas Gudang	2023-05-05	t
PG008	CB003	Hendra Setiawan	081300000008	Admin	2024-01-08	t
\.


--
-- Data for Name: PELANGGAN; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PELANGGAN" (pelanggan_id, pelanggan_nama, pelanggan_telp, pelanggan_jenis_identitas, pelanggan_no_identitas, pelanggan_alamat, pelanggan_cab_favorit, mekanik_id_pilihan, pelanggan_tipe, plafon_kredit, sisa_plafon) FROM stdin;
PL001	Ahmad Fauzi	082100000001	KTP	6271010101010001	Jl. Seth Adji No. 10, Palangka Raya	CB001	PG003	Individu	0	0
PL002	Siti Rahma	082100000002	KTP	6271010101010002	Jl. G. Obos No. 20, Palangka Raya	CB002	PG005	Individu	0	0
PL003	Rizky Maulana	082100000003	SIM	2893-8659-235790	Jl. Rajawali No. 35, Palangka Raya	CB002	PG004	Individu	0	0
PL004	Dewi Lestari	082100000004	KTP	6271010101010004	Jl. Yos Sudarso No. 18, Palangka Raya	CB001	PG003	Individu	0	0
PL005	Bayu Pratama	082100000005	KTP	6271010101010005	Jl. Bukit Keminting No. 12, Palangka Raya	CB003	PG006	Individu	0	0
PL006	Nadia Putri	082100000006	SIM	3058-2890-538990	Jl. Cilik Riwut No. 45, Palangka Raya	CB003	PG006	Individu	0	0
PL007	PT Borneo Kurir Ekspres	08115200777	NPWP	01.345.678.9-711.000	Jl. Tjilik Riwut Km. 4.5 No. 88, Palangka Raya	CB001	PG003	Korporat	25000000	24415000
PL008	CV Palangka Rental Motor	08115200888	NPWP	02.888.999.1-711.000	Jl. Imam Bonjol No. 19, Palangka Raya	CB002	PG005	Korporat	15000000	15000000
\.


--
-- Data for Name: RIWAYAT_KEPEMILIKAN; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RIWAYAT_KEPEMILIKAN" (riwayat_id, motor_nopol, pelanggan_id, tanggal_mulai, tanggal_selesai) FROM stdin;
RW001	KH1001AA	PL001	2023-01-01	\N
RW002	KH1002AA	PL001	2023-02-01	\N
RW003	KH1003BB	PL002	2023-03-01	\N
RW004	KH1004BB	PL002	2023-04-01	\N
RW005	KH1005CC	PL003	2023-05-01	\N
RW006	KH1006CC	PL003	2023-06-01	\N
RW007	KH1007DD	PL004	2023-07-01	\N
RW008	KH1008EE	PL005	2023-08-01	\N
RW009	KH1009EE	PL005	2023-09-01	\N
RW010	KH1010FF	PL006	2024-01-01	\N
RW011	KH8001BK	PL007	2024-02-01	\N
RW012	KH8002BK	PL007	2024-02-01	\N
RW013	KH9001PR	PL008	2025-01-15	\N
RW014	KH9002PR	PL008	2025-01-15	\N
\.


--
-- Data for Name: STOK_CABANG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."STOK_CABANG" (cabang_kode, suku_cadang_kode, stok_qty, stok_minimum) FROM stdin;
CB001	SC003	20	5
CB002	SC005	15	3
CB002	SC009	12	3
CB003	SC002	20	5
CB003	SC011	10	2
CB003	SC012	8	2
CB003	SC013	10	2
CB003	SC014	7	2
CB003	SC015	15	3
CB001	SC001	29	5
CB001	SC004	14	3
CB002	SC001	24	5
CB002	SC006	19	4
CB001	SC008	1	5
CB001	SC007	2	5
CB002	SC010	1	3
CB001	SC015	2	5
\.


--
-- Data for Name: SUKU_CADANG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SUKU_CADANG" (suku_cadang_kode, suku_cadang_nama, suku_cadang_harga_satuan) FROM stdin;
SC001	Oli Mesin 10W-40	55000
SC002	Oli Gardan	20000
SC003	Busi	25000
SC004	Kampas Rem Depan	85000
SC005	Kampas Rem Belakang	75000
SC006	Filter Udara	60000
SC007	Filter Oli	35000
SC008	V-Belt	150000
SC009	Roller CVT	90000
SC010	Aki Motor	250000
SC011	Lampu Depan LED	80000
SC012	Kampas Kopling	175000
SC013	Rantai Motor	160000
SC014	Gear Set	220000
SC015	Injector Cleaner	45000
\.


--
-- Data for Name: SUPPLIER; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SUPPLIER" (supplier_id, supplier_nama, supplier_telp, supplier_alamat) FROM stdin;
SP001	PT Sumber Motor Jaya	081400000001	Jl. Ahmad Yani No. 10, Palangka Raya
SP002	CV Mitra Sparepart	081400000002	Jl. RTA Milono No. 20, Palangka Raya
SP003	PT Karya Otomotif	081400000003	Jl. G. Obos No. 30, Palangka Raya
SP004	CV Berkah Motor	081400000004	Jl. Rajawali No. 40, Palangka Raya
SP005	PT Prima Suku Cadang	081400000005	Jl. Cilik Riwut No. 50, Palangka Raya
\.


--
-- Data for Name: SUPPLIER_SUKU_CADANG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SUPPLIER_SUKU_CADANG" (supplier_id, suku_cadang_kode) FROM stdin;
SP001	SC001
SP001	SC002
SP001	SC003
SP002	SC004
SP002	SC005
SP002	SC006
SP003	SC007
SP003	SC008
SP003	SC009
SP004	SC010
SP004	SC011
SP004	SC012
SP005	SC013
SP005	SC014
SP005	SC015
SP001	SC006
SP002	SC008
SP003	SC010
\.


--
-- Data for Name: TAGIHAN_KOLEKTIF; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TAGIHAN_KOLEKTIF" (tagihan_id, pelanggan_id, periode_bulan, total_tagihan, status_tagihan, tgl_jatuh_tempo, tgl_lunas) FROM stdin;
TK001	PL007	2026-09	585000	Belum Dibayar	2026-10-25	\N
\.


--
-- Data for Name: WORK_ORDER; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WORK_ORDER" (work_no, work_tgl_masuk, work_tgl_selesai, work_status, work_keluhan, cabang_kode, motor_nopol, mekanik_id, pembayaran_diskon, pembayaran_metode, pembayaran_status, tagihan_id) FROM stdin;
WO001	2026-09-01 08:15:00+07	2026-09-01 11:30:00+07	Selesai	Mesin terasa kurang bertenaga dan suara mesin kasar	CB001	KH1001AA	PG003	10000	Tunai	Lunas	\N
WO002	2026-09-02 09:00:00+07	2026-09-02 13:00:00+07	Selesai	Motor sulit dihidupkan dan indikator injeksi menyala	CB002	KH1003BB	PG005	15000	QRIS	Lunas	\N
WO003	2026-09-03 08:30:00+07	2026-09-03 10:00:00+07	Selesai	Rem depan berbunyi saat digunakan	CB002	KH1005CC	PG004	0	Transfer	Lunas	\N
WO004	2026-09-04 10:00:00+07	2026-09-04 14:00:00+07	Selesai	CVT terasa bergetar ketika berakselerasi	CB001	KH1002AA	PG003	20000	Debit	Lunas	\N
WO005	2026-09-05 08:45:00+07	2026-09-05 11:15:00+07	Selesai	Kelistrikan lampu depan bermasalah	CB003	KH1007DD	PG006	0	Tunai	Lunas	\N
WO006	2026-09-06 09:30:00+07	2026-09-06 12:00:00+07	Selesai	Motor membutuhkan perawatan berkala	CB003	KH1008EE	PG006	10000	QRIS	Lunas	\N
WO007	2026-09-07 08:20:00+07	2026-09-07 10:30:00+07	Selesai	Rem belakang kurang pakem	CB002	KH1006CC	PG004	0	Transfer	Lunas	\N
WO008	2026-09-08 09:00:00+07	2026-09-08 12:30:00+07	Selesai	Motor mengalami masalah pada sistem transmisi	CB003	KH1009EE	PG006	25000	Kredit	Lunas	\N
WO009	2026-09-12 08:30:00+07	2026-09-12 11:00:00+07	Selesai	Servis rutin armada kurir & ganti kampas rem depan + oli mesin	CB001	KH8001BK	PG003	20000	Tagihan Kolektif	Belum Lunas	TK001
WO010	2026-09-14 09:15:00+07	2026-09-14 12:00:00+07	Selesai	Perawatan CVT & penggantian V-Belt armada kurir ekspres	CB001	KH8002BK	PG003	30000	Tagihan Kolektif	Belum Lunas	TK001
WO011	2026-09-18 10:00:00+07	2026-09-18 12:30:00+07	Selesai	Tune up & servis sistem injeksi armada rental eksekutif (siap ditagihkan kolektif)	CB002	KH9001PR	PG005	15000	Tagihan Kolektif	Belum Lunas	\N
WO012	2026-09-19 09:00:00+07	\N	Dikerjakan	Pengecekan kelistrikan & ganti oli mesin unit rental	CB002	KH9002PR	PG004	0	Tagihan Kolektif	Belum Lunas	\N
WO013	2026-09-20 08:30:00+07	\N	Antre	Servis berkala & pengecekan rem belakang	CB001	KH1010FF	PG003	0	Tunai	Belum Lunas	\N
\.


--
-- Data for Name: WO_JASA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WO_JASA" (work_no, jasa_kode) FROM stdin;
WO001	JS001
WO001	JS002
WO002	JS004
WO002	JS005
WO003	JS006
WO004	JS008
WO004	JS002
WO005	JS009
WO006	JS004
WO006	JS002
WO007	JS007
WO008	JS010
WO009	JS001
WO009	JS006
WO010	JS008
WO010	JS002
WO011	JS004
WO011	JS005
WO012	JS002
WO013	JS001
\.


--
-- Data for Name: WO_MEKANIK; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WO_MEKANIK" (work_no, mekanik_id, peran_mekanik) FROM stdin;
WO001	PG003	Penanggung Jawab
WO001	PG004	Pembantu
WO002	PG005	Penanggung Jawab
WO002	PG006	Pembantu
WO003	PG004	Penanggung Jawab
WO004	PG003	Penanggung Jawab
WO005	PG006	Penanggung Jawab
WO006	PG006	Penanggung Jawab
WO007	PG004	Penanggung Jawab
WO008	PG006	Penanggung Jawab
WO009	PG003	Penanggung Jawab
WO010	PG003	Penanggung Jawab
WO011	PG005	Penanggung Jawab
WO012	PG004	Penanggung Jawab
WO013	PG003	Penanggung Jawab
\.


--
-- Data for Name: WO_SUKU_CADANG; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WO_SUKU_CADANG" (work_no, suku_cadang_kode, suku_cadang_qty, suku_cadang_jumlah) FROM stdin;
WO001	SC001	1	55000
WO001	SC003	1	25000
WO002	SC015	2	90000
WO002	SC003	1	25000
WO003	SC004	1	85000
WO004	SC008	1	150000
WO004	SC009	1	90000
WO005	SC011	1	80000
WO006	SC001	1	55000
WO007	SC005	1	75000
WO008	SC012	1	175000
WO008	SC014	1	220000
WO009	SC001	1	55000
WO009	SC004	1	85000
WO010	SC008	1	150000
WO010	SC009	1	90000
WO011	SC001	1	55000
WO011	SC006	1	60000
\.


--
-- Name: AUDIT_LOG_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AUDIT_LOG_audit_id_seq"', 23, true);


--
-- Name: AUDIT_LOG AUDIT_LOG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUDIT_LOG"
    ADD CONSTRAINT "AUDIT_LOG_pkey" PRIMARY KEY (audit_id);


--
-- Name: CABANG CABANG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CABANG"
    ADD CONSTRAINT "CABANG_pkey" PRIMARY KEY (cabang_kode);


--
-- Name: GARANSI GARANSI_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GARANSI"
    ADD CONSTRAINT "GARANSI_pkey" PRIMARY KEY (garansi_id, work_no);


--
-- Name: JASA_SERVIS JASA_SERVIS_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JASA_SERVIS"
    ADD CONSTRAINT "JASA_SERVIS_pkey" PRIMARY KEY (jasa_kode);


--
-- Name: KONTRAK_KORPORAT KONTRAK_KORPORAT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KONTRAK_KORPORAT"
    ADD CONSTRAINT "KONTRAK_KORPORAT_pkey" PRIMARY KEY (kontrak_id);


--
-- Name: MEKANIK MEKANIK_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MEKANIK"
    ADD CONSTRAINT "MEKANIK_pkey" PRIMARY KEY (mekanik_id);


--
-- Name: MOTOR MOTOR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MOTOR"
    ADD CONSTRAINT "MOTOR_pkey" PRIMARY KEY (motor_nopol);


--
-- Name: PEGAWAI PEGAWAI_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PEGAWAI"
    ADD CONSTRAINT "PEGAWAI_pkey" PRIMARY KEY (pegawai_id);


--
-- Name: PELANGGAN PELANGGAN_pelanggan_no_identitas_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PELANGGAN"
    ADD CONSTRAINT "PELANGGAN_pelanggan_no_identitas_key" UNIQUE (pelanggan_no_identitas);


--
-- Name: PELANGGAN PELANGGAN_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PELANGGAN"
    ADD CONSTRAINT "PELANGGAN_pkey" PRIMARY KEY (pelanggan_id);


--
-- Name: RIWAYAT_KEPEMILIKAN RIWAYAT_KEPEMILIKAN_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RIWAYAT_KEPEMILIKAN"
    ADD CONSTRAINT "RIWAYAT_KEPEMILIKAN_pkey" PRIMARY KEY (riwayat_id);


--
-- Name: STOK_CABANG STOK_CABANG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."STOK_CABANG"
    ADD CONSTRAINT "STOK_CABANG_pkey" PRIMARY KEY (cabang_kode, suku_cadang_kode);


--
-- Name: SUKU_CADANG SUKU_CADANG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SUKU_CADANG"
    ADD CONSTRAINT "SUKU_CADANG_pkey" PRIMARY KEY (suku_cadang_kode);


--
-- Name: SUPPLIER_SUKU_CADANG SUPPLIER_SUKU_CADANG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SUPPLIER_SUKU_CADANG"
    ADD CONSTRAINT "SUPPLIER_SUKU_CADANG_pkey" PRIMARY KEY (supplier_id, suku_cadang_kode);


--
-- Name: SUPPLIER SUPPLIER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SUPPLIER"
    ADD CONSTRAINT "SUPPLIER_pkey" PRIMARY KEY (supplier_id);


--
-- Name: TAGIHAN_KOLEKTIF TAGIHAN_KOLEKTIF_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TAGIHAN_KOLEKTIF"
    ADD CONSTRAINT "TAGIHAN_KOLEKTIF_pkey" PRIMARY KEY (tagihan_id);


--
-- Name: WORK_ORDER WORK_ORDER_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WORK_ORDER"
    ADD CONSTRAINT "WORK_ORDER_pkey" PRIMARY KEY (work_no);


--
-- Name: WO_JASA WO_JASA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_JASA"
    ADD CONSTRAINT "WO_JASA_pkey" PRIMARY KEY (work_no, jasa_kode);


--
-- Name: WO_MEKANIK WO_MEKANIK_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_MEKANIK"
    ADD CONSTRAINT "WO_MEKANIK_pkey" PRIMARY KEY (work_no, mekanik_id);


--
-- Name: WO_SUKU_CADANG WO_SUKU_CADANG_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_SUKU_CADANG"
    ADD CONSTRAINT "WO_SUKU_CADANG_pkey" PRIMARY KEY (work_no, suku_cadang_kode);


--
-- Name: KONTRAK_KORPORAT trg_audit_kontrak_korporat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_kontrak_korporat AFTER INSERT OR DELETE OR UPDATE ON public."KONTRAK_KORPORAT" FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: STOK_CABANG trg_audit_stok_cabang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_stok_cabang AFTER INSERT OR DELETE OR UPDATE ON public."STOK_CABANG" FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: TAGIHAN_KOLEKTIF trg_audit_tagihan_kolektif; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_tagihan_kolektif AFTER INSERT OR DELETE OR UPDATE ON public."TAGIHAN_KOLEKTIF" FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: WO_SUKU_CADANG trg_audit_wo_suku_cadang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_wo_suku_cadang AFTER INSERT OR DELETE OR UPDATE ON public."WO_SUKU_CADANG" FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: WORK_ORDER trg_audit_work_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_work_order AFTER INSERT OR DELETE OR UPDATE ON public."WORK_ORDER" FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();


--
-- Name: WORK_ORDER trg_cegah_tanggal_wo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cegah_tanggal_wo BEFORE INSERT OR UPDATE ON public."WORK_ORDER" FOR EACH ROW EXECUTE FUNCTION public.trg_fn_cegah_tanggal_wo_masa_depan();


--
-- Name: WO_SUKU_CADANG trg_kembalikan_stok_suku_cadang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kembalikan_stok_suku_cadang AFTER DELETE ON public."WO_SUKU_CADANG" FOR EACH ROW EXECUTE FUNCTION public.trg_fn_kembalikan_stok();


--
-- Name: WO_SUKU_CADANG trg_kurangi_stok_suku_cadang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kurangi_stok_suku_cadang AFTER INSERT ON public."WO_SUKU_CADANG" FOR EACH ROW EXECUTE FUNCTION public.trg_fn_kurangi_stok();


--
-- Name: TAGIHAN_KOLEKTIF trg_lunasi_tagihan_kolektif; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lunasi_tagihan_kolektif BEFORE UPDATE ON public."TAGIHAN_KOLEKTIF" FOR EACH ROW EXECUTE FUNCTION public.trg_fn_lunasi_tagihan_kolektif();


--
-- Name: WORK_ORDER trg_potong_plafon_korporat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_potong_plafon_korporat AFTER UPDATE ON public."WORK_ORDER" FOR EACH ROW EXECUTE FUNCTION public.trg_fn_potong_plafon_korporat();


--
-- Name: GARANSI fk_garansi_work; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GARANSI"
    ADD CONSTRAINT fk_garansi_work FOREIGN KEY (work_no) REFERENCES public."WORK_ORDER"(work_no);


--
-- Name: KONTRAK_KORPORAT fk_kontrak_pelanggan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KONTRAK_KORPORAT"
    ADD CONSTRAINT fk_kontrak_pelanggan FOREIGN KEY (pelanggan_id) REFERENCES public."PELANGGAN"(pelanggan_id) ON DELETE CASCADE;


--
-- Name: MEKANIK fk_mekanik_pegawai; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MEKANIK"
    ADD CONSTRAINT fk_mekanik_pegawai FOREIGN KEY (mekanik_id) REFERENCES public."PEGAWAI"(pegawai_id);


--
-- Name: MOTOR fk_motor_pelanggan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MOTOR"
    ADD CONSTRAINT fk_motor_pelanggan FOREIGN KEY (pelanggan_id) REFERENCES public."PELANGGAN"(pelanggan_id);


--
-- Name: PEGAWAI fk_pegawai_cabang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PEGAWAI"
    ADD CONSTRAINT fk_pegawai_cabang FOREIGN KEY (cabang_kode) REFERENCES public."CABANG"(cabang_kode);


--
-- Name: PELANGGAN fk_pelanggan_cabang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PELANGGAN"
    ADD CONSTRAINT fk_pelanggan_cabang FOREIGN KEY (pelanggan_cab_favorit) REFERENCES public."CABANG"(cabang_kode);


--
-- Name: PELANGGAN fk_pelanggan_mekanik; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PELANGGAN"
    ADD CONSTRAINT fk_pelanggan_mekanik FOREIGN KEY (mekanik_id_pilihan) REFERENCES public."MEKANIK"(mekanik_id);


--
-- Name: RIWAYAT_KEPEMILIKAN fk_riwayat_motor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RIWAYAT_KEPEMILIKAN"
    ADD CONSTRAINT fk_riwayat_motor FOREIGN KEY (motor_nopol) REFERENCES public."MOTOR"(motor_nopol);


--
-- Name: RIWAYAT_KEPEMILIKAN fk_riwayat_pelanggan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RIWAYAT_KEPEMILIKAN"
    ADD CONSTRAINT fk_riwayat_pelanggan FOREIGN KEY (pelanggan_id) REFERENCES public."PELANGGAN"(pelanggan_id);


--
-- Name: SUPPLIER_SUKU_CADANG fk_ssc_suku_cadang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SUPPLIER_SUKU_CADANG"
    ADD CONSTRAINT fk_ssc_suku_cadang FOREIGN KEY (suku_cadang_kode) REFERENCES public."SUKU_CADANG"(suku_cadang_kode);


--
-- Name: SUPPLIER_SUKU_CADANG fk_ssc_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SUPPLIER_SUKU_CADANG"
    ADD CONSTRAINT fk_ssc_supplier FOREIGN KEY (supplier_id) REFERENCES public."SUPPLIER"(supplier_id);


--
-- Name: STOK_CABANG fk_stok_cabang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."STOK_CABANG"
    ADD CONSTRAINT fk_stok_cabang FOREIGN KEY (cabang_kode) REFERENCES public."CABANG"(cabang_kode);


--
-- Name: STOK_CABANG fk_stok_suku_cadang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."STOK_CABANG"
    ADD CONSTRAINT fk_stok_suku_cadang FOREIGN KEY (suku_cadang_kode) REFERENCES public."SUKU_CADANG"(suku_cadang_kode);


--
-- Name: TAGIHAN_KOLEKTIF fk_tagihan_pelanggan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TAGIHAN_KOLEKTIF"
    ADD CONSTRAINT fk_tagihan_pelanggan FOREIGN KEY (pelanggan_id) REFERENCES public."PELANGGAN"(pelanggan_id) ON DELETE RESTRICT;


--
-- Name: WO_JASA fk_wo_jasa_jasa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_JASA"
    ADD CONSTRAINT fk_wo_jasa_jasa FOREIGN KEY (jasa_kode) REFERENCES public."JASA_SERVIS"(jasa_kode);


--
-- Name: WO_JASA fk_wo_jasa_work; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_JASA"
    ADD CONSTRAINT fk_wo_jasa_work FOREIGN KEY (work_no) REFERENCES public."WORK_ORDER"(work_no) ON DELETE CASCADE;


--
-- Name: WO_MEKANIK fk_wo_mekanik_mekanik; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_MEKANIK"
    ADD CONSTRAINT fk_wo_mekanik_mekanik FOREIGN KEY (mekanik_id) REFERENCES public."MEKANIK"(mekanik_id);


--
-- Name: WO_MEKANIK fk_wo_mekanik_work; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_MEKANIK"
    ADD CONSTRAINT fk_wo_mekanik_work FOREIGN KEY (work_no) REFERENCES public."WORK_ORDER"(work_no) ON DELETE CASCADE;


--
-- Name: WO_SUKU_CADANG fk_wo_sc_suku_cadang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_SUKU_CADANG"
    ADD CONSTRAINT fk_wo_sc_suku_cadang FOREIGN KEY (suku_cadang_kode) REFERENCES public."SUKU_CADANG"(suku_cadang_kode);


--
-- Name: WO_SUKU_CADANG fk_wo_sc_work; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WO_SUKU_CADANG"
    ADD CONSTRAINT fk_wo_sc_work FOREIGN KEY (work_no) REFERENCES public."WORK_ORDER"(work_no) ON DELETE CASCADE;


--
-- Name: WORK_ORDER fk_work_order_cabang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WORK_ORDER"
    ADD CONSTRAINT fk_work_order_cabang FOREIGN KEY (cabang_kode) REFERENCES public."CABANG"(cabang_kode);


--
-- Name: WORK_ORDER fk_work_order_mekanik; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WORK_ORDER"
    ADD CONSTRAINT fk_work_order_mekanik FOREIGN KEY (mekanik_id) REFERENCES public."MEKANIK"(mekanik_id);


--
-- Name: WORK_ORDER fk_work_order_motor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WORK_ORDER"
    ADD CONSTRAINT fk_work_order_motor FOREIGN KEY (motor_nopol) REFERENCES public."MOTOR"(motor_nopol);


--
-- Name: WORK_ORDER fk_work_order_tagihan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WORK_ORDER"
    ADD CONSTRAINT fk_work_order_tagihan FOREIGN KEY (tagihan_id) REFERENCES public."TAGIHAN_KOLEKTIF"(tagihan_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict B1bBWqduUSm1nJBnUVmTiw0t3a5fdXihNS0AjLeb1vDvN5ppRbJFoiEfWvgS6cM

