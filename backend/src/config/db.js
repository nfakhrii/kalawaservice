const { Pool, Client } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Fakhri120206',
  database: process.env.DB_NAME || 'kalawa_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

const ALLOWED_DB_USERS_AND_ROLES = new Set([
  'user_owner',
  'user_admin_cabang',
  'user_kasir',
  'user_mekanik',
  'user_gudang',
  'user_auditor',
  'role_owner',
  'role_admin_cabang',
  'role_kasir',
  'role_mekanik',
  'role_petugas_gudang',
  'role_auditor',
]);

const requestUserStorage = new AsyncLocalStorage();

function runWithUserContext(user, fn) {
  return requestUserStorage.run(user, fn);
}

function getCurrentUserContext() {
  return requestUserStorage.getStore() || null;
}

function resolveValidatedDbIdentity(userOrRole) {
  if (!userOrRole) return null;
  const candidate =
    typeof userOrRole === 'string'
      ? userOrRole.trim()
      : userOrRole.username || userOrRole.db_role || null;
  if (candidate && ALLOWED_DB_USERS_AND_ROLES.has(candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Eksekusi query SQL menggunakan SET LOCAL ROLE sesuai akun PostgreSQL asli
 * dari Kelompok1_admin_security.sql agar:
 * 1. GRANT/REVOKE dievaluasi langsung oleh PostgreSQL (error 42501 jika melanggar)
 * 2. CURRENT_USER pada trigger fn_audit_log() mencatat akun sesungguhnya di "AUDIT_LOG"
 */
async function queryAsUser(dbUserOrRole, text, params = []) {
  const identity = resolveValidatedDbIdentity(dbUserOrRole);
  if (!identity) {
    throw new Error(`Invalid database role/user: ${dbUserOrRole}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${identity}`);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.query('RESET ROLE').catch(() => {});
    client.release();
  }
}

/**
 * Eksekusi blok transaksi multi-query dengan SET LOCAL ROLE otomatis bila ada konteks user
 */
async function withTransaction(callback, explicitUserOrRole = null) {
  const activeUser = explicitUserOrRole || getCurrentUserContext();
  const identity = resolveValidatedDbIdentity(activeUser);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (identity) {
      await client.query(`SET LOCAL ROLE ${identity}`);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.query('RESET ROLE').catch(() => {});
    client.release();
  }
}

/**
 * Verifikasi kredensial username & password langsung ke engine PostgreSQL (pg_authid)
 * tanpa tabel user tambahan dan tanpa menyimpan password plaintext di kode.
 */
async function verifyPostgresCredentials(username, password) {
  if (!ALLOWED_DB_USERS_AND_ROLES.has(username)) {
    const err = new Error('Invalid PostgreSQL user account');
    err.code = '28P01';
    throw err;
  }

  const tempClient = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'kalawa_db',
    user: username,
    password: String(password),
    connectionTimeoutMillis: 5000,
  });

  try {
    await tempClient.connect();
    return true;
  } finally {
    await tempClient.end().catch(() => {});
  }
}

/**
 * Helper query utama. Jika dipanggil dalam konteks HTTP request terautentikasi,
 * otomatis mengeksekusi query menggunakan SET LOCAL ROLE <username>.
 */
const query = (text, params = []) => {
  const currentUser = getCurrentUserContext();
  const identity = resolveValidatedDbIdentity(currentUser);
  if (identity) {
    return queryAsUser(identity, text, params);
  }
  return pool.query(text, params);
};

/**
 * Utility untuk me-reset dan mengisi ulang database ke-5 file SQL Kelompok 1
 * secara berurutan (digunakan oleh fitur Reset Demo Data pada System Diagnostics).
 * Dijalankan sebagai superuser pool (tanpa SET LOCAL ROLE).
 */
async function resetAndSeedDatabase() {
  const dbDir = path.resolve(__dirname, '../../../database');
  const schemaSql = fs.readFileSync(path.join(dbDir, 'Kelompok1_schema.sql'), 'utf8');
  const insertSql = fs.readFileSync(path.join(dbDir, 'Kelompok1_insert.sql'), 'utf8');
  const securitySql = fs.readFileSync(path.join(dbDir, 'Kelompok1_admin_security.sql'), 'utf8');
  const programmingSql = fs.readFileSync(path.join(dbDir, 'Kelompok1_programming.sql'), 'utf8');
  const migrationSql = fs.readFileSync(path.join(dbDir, 'Kelompok1_migration_tugas4.sql'), 'utf8');

  const idempotentSecuritySql = securitySql
    .replace(
      /CREATE\s+ROLE\s+([a-zA-Z0-9_]+)(?:\s+NOLOGIN)?\s*;/gi,
      "DO $$$$ BEGIN CREATE ROLE $1 NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$$$;"
    )
    .replace(
      /CREATE\s+USER\s+([a-zA-Z0-9_]+)[\s\r\n]+WITH\s+PASSWORD\s+'([^']+)'\s*;/gi,
      "DO $$$$ BEGIN CREATE USER $1 WITH PASSWORD '$2'; EXCEPTION WHEN duplicate_object THEN ALTER USER $1 WITH PASSWORD '$2'; END $$$$;"
    );

  const client = await pool.connect();
  try {
    await client.query('RESET ROLE').catch(() => {});
    await client.query(`
      DROP VIEW IF EXISTS "VW_WORK_ORDER_AMAN" CASCADE;
      DROP VIEW IF EXISTS "VW_PELANGGAN_AMAN" CASCADE;
      DROP TABLE IF EXISTS
        "AUDIT_LOG",
        "GARANSI",
        "WO_SUKU_CADANG",
        "WO_JASA",
        "WO_MEKANIK",
        "WORK_ORDER",
        "TAGIHAN_KOLEKTIF",
        "KONTRAK_KORPORAT",
        "STOK_CABANG",
        "SUPPLIER_SUKU_CADANG",
        "SUKU_CADANG",
        "SUPPLIER",
        "JASA_SERVIS",
        "RIWAYAT_KEPEMILIKAN",
        "MOTOR",
        "PELANGGAN",
        "MEKANIK",
        "PEGAWAI",
        "CABANG"
      CASCADE;
    `);
    await client.query(schemaSql);
    await client.query(insertSql);
    await client.query(idempotentSecuritySql);
    await client.query(programmingSql);
    await client.query(migrationSql);
    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  queryAsUser,
  withTransaction,
  verifyPostgresCredentials,
  runWithUserContext,
  getCurrentUserContext,
  ALLOWED_DB_USERS_AND_ROLES,
  resetAndSeedDatabase,
};
