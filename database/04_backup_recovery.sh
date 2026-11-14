#!/usr/bin/env bash
# ============================================================================
# KALAWA SERVICE — WORKSHOP MANAGEMENT & CORPORATE BILLING ERP (KELOMPOK 1)
# File: 04_backup_recovery.sh
# Deskripsi: Prosedur Otomatisasi Full Backup, Simulasi Bencana Kehilangan Data,
#            Recovery Basis Data (pg_dump / pg_restore / psql), & Verifikasi
# Target: Tugas 4 — Backup & Recovery PostgreSQL (Skema Asli Kelompok 1)
# ============================================================================

set -euo pipefail

# ============================================================================
# KONFIGURASI DATABASE DAN ENVIRONMENT
# ============================================================================

# Lokasi direktori script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Memuat konfigurasi dari backend/.env
ENV_FILE="${PROJECT_ROOT}/backend/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "[ERROR] File backend/.env tidak ditemukan!"
    exit 1
fi

set -a
source "${ENV_FILE}"
set +a

# Konfigurasi koneksi PostgreSQL
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

if [[ -z "${DB_PASSWORD:-}" ]]; then
    echo "[ERROR] DB_PASSWORD belum dikonfigurasi di backend/.env"
    exit 1
fi

export PGPASSWORD="${DB_PASSWORD}"

# Database utama dan database pengujian recovery
PROD_DB="${DB_NAME:-kalawaservice}"
TEST_RECOVERY_DB="${TEST_RECOVERY_DB:-kalawa_db_recovery_test}"

# Lokasi backup selalu berada di database/backups
BACKUP_DIR="${SCRIPT_DIR}/backups"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

SQL_BACKUP_FILE="${BACKUP_DIR}/kalawa_kelompok1_full_backup_${TIMESTAMP}.sql"
CUSTOM_BACKUP_FILE="${BACKUP_DIR}/kalawa_kelompok1_full_backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "Database utama : ${PROD_DB}"
echo "Database test  : ${TEST_RECOVERY_DB}"
echo "Lokasi backup  : ${BACKUP_DIR}"
SQL_BACKUP_FILE="${BACKUP_DIR}/kalawa_kelompok1_full_backup_${TIMESTAMP}.sql"
CUSTOM_BACKUP_FILE="${BACKUP_DIR}/kalawa_kelompok1_full_backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "============================================================================"
echo "[1/5] VERIFIKASI DATA AWAL PADA DATABASE UTAMA (${PROD_DB})"
echo "============================================================================"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${PROD_DB}" -c '
SELECT
    (SELECT COUNT(*) FROM "CABANG") AS total_cabang,
    (SELECT COUNT(*) FROM "PEGAWAI") AS total_pegawai,
    (SELECT COUNT(*) FROM "PELANGGAN") AS total_pelanggan,
    (SELECT COUNT(*) FROM "KONTRAK_KORPORAT") AS total_kontrak_b2b,
    (SELECT COUNT(*) FROM "MOTOR") AS total_motor,
    (SELECT COUNT(*) FROM "SUKU_CADANG") AS total_suku_cadang,
    (SELECT COUNT(*) FROM "STOK_CABANG") AS total_stok_cabang,
    (SELECT COUNT(*) FROM "WORK_ORDER") AS total_work_order,
    (SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF") AS total_tagihan_kolektif,
    (SELECT COUNT(*) FROM "AUDIT_LOG") AS total_audit_log;
'

echo ""
echo "============================================================================"
echo "[2/5] EKSEKUSI FULL BACKUP MENGGUNAKAN pg_dump"
echo "============================================================================"
# A. Backup Format Plain SQL (.sql) - Mencakup DDL, Trigger, View, SP, & Data
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
    --clean --if-exists --no-owner --no-privileges \
    -Fp -f "${SQL_BACKUP_FILE}" "${PROD_DB}"
echo " -> Plain SQL Backup berhasil dibuat : ${SQL_BACKUP_FILE}"

# B. Backup Format Custom Binary Terkompresi (.dump) untuk pg_restore
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
    --no-owner --no-privileges \
    -Fc -f "${CUSTOM_BACKUP_FILE}" "${PROD_DB}"
echo " -> Custom Binary Backup berhasil dibuat: ${CUSTOM_BACKUP_FILE}"

echo ""
echo "============================================================================"
echo "[3/5] PERSIAPAN DATABASE SALINAN & SIMULASI KEHILANGAN DATA (DISASTER)"
echo "============================================================================"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_RECOVERY_DB};"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TEST_RECOVERY_DB};"

# Muat kondisi awal ke database salinan terlebih dahulu
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RECOVERY_DB}" -f "${SQL_BACKUP_FILE}" > /dev/null

echo " -> Simulasi insiden kehilangan data (TRUNCATE & DELETE tidak sengaja pada tabel transaksi Kelompok 1)..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RECOVERY_DB}" -c '
TRUNCATE TABLE "TAGIHAN_KOLEKTIF", "GARANSI", "WO_SUKU_CADANG", "WO_JASA", "WO_MEKANIK", "WORK_ORDER" CASCADE;
'

echo " -> Jumlah baris SETELAH insiden kehilangan data (SEBELUM Recovery):"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RECOVERY_DB}" -c '
SELECT
    (SELECT COUNT(*) FROM "WORK_ORDER") AS wo_setelah_bencana,
    (SELECT COUNT(*) FROM "WO_SUKU_CADANG") AS part_wo_setelah_bencana,
    (SELECT COUNT(*) FROM "WO_JASA") AS jasa_wo_setelah_bencana,
    (SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF") AS tagihan_b2b_setelah_bencana;
'

echo ""
echo "============================================================================"
echo "[4/5] EKSEKUSI DATABASE RECOVERY (PEMULIHAN DARI FILE BACKUP)"
echo "============================================================================"
pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
    --clean --if-exists --no-owner --no-privileges \
    -d "${TEST_RECOVERY_DB}" "${CUSTOM_BACKUP_FILE}"

echo " -> Proses Recovery menggunakan pg_restore selesai dengan sukses."

echo ""
echo "============================================================================"
echo "[5/5] VERIFIKASI INTEGRITAS DATA PASCA-RECOVERY (SELECT COUNT(*))"
echo "============================================================================"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RECOVERY_DB}" -c '
SELECT '\''CABANG'\'' AS nama_tabel, COUNT(*) AS jumlah_baris_pulih FROM "CABANG"
UNION ALL
SELECT '\''PEGAWAI'\'', COUNT(*) FROM "PEGAWAI"
UNION ALL
SELECT '\''MEKANIK'\'', COUNT(*) FROM "MEKANIK"
UNION ALL
SELECT '\''PELANGGAN (total)'\'', COUNT(*) FROM "PELANGGAN"
UNION ALL
SELECT '\''PELANGGAN (Korporat B2B)'\'', COUNT(*) FROM "PELANGGAN" WHERE pelanggan_tipe = '\''Korporat'\''
UNION ALL
SELECT '\''KONTRAK_KORPORAT'\'', COUNT(*) FROM "KONTRAK_KORPORAT"
UNION ALL
SELECT '\''MOTOR'\'', COUNT(*) FROM "MOTOR"
UNION ALL
SELECT '\''RIWAYAT_KEPEMILIKAN'\'', COUNT(*) FROM "RIWAYAT_KEPEMILIKAN"
UNION ALL
SELECT '\''JASA_SERVIS'\'', COUNT(*) FROM "JASA_SERVIS"
UNION ALL
SELECT '\''SUPPLIER'\'', COUNT(*) FROM "SUPPLIER"
UNION ALL
SELECT '\''SUKU_CADANG'\'', COUNT(*) FROM "SUKU_CADANG"
UNION ALL
SELECT '\''STOK_CABANG'\'', COUNT(*) FROM "STOK_CABANG"
UNION ALL
SELECT '\''WORK_ORDER'\'', COUNT(*) FROM "WORK_ORDER"
UNION ALL
SELECT '\''WO_MEKANIK'\'', COUNT(*) FROM "WO_MEKANIK"
UNION ALL
SELECT '\''WO_JASA'\'', COUNT(*) FROM "WO_JASA"
UNION ALL
SELECT '\''WO_SUKU_CADANG'\'', COUNT(*) FROM "WO_SUKU_CADANG"
UNION ALL
SELECT '\''GARANSI'\'', COUNT(*) FROM "GARANSI"
UNION ALL
SELECT '\''TAGIHAN_KOLEKTIF'\'', COUNT(*) FROM "TAGIHAN_KOLEKTIF"
UNION ALL
SELECT '\''AUDIT_LOG'\'', COUNT(*) FROM "AUDIT_LOG";
'

echo ""
echo "[SUKSES] Seluruh prosedur Full Backup, Simulasi Kehilangan Data, dan Recovery Skema Kelompok 1 terverifikasi 100%!"
