const { Pool, Client } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "kalawa_db",
  connectionTimeoutMillis: 5000,
};

if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("DB_USER dan DB_PASSWORD wajib diatur di backend/.env");
}

// Khusus metadata login, startup, dan administrasi internal.
// JANGAN gunakan pool ini untuk operasi bisnis user.
const pool = new Pool({
  ...DB_CONFIG,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[Admin Pool Error]", err.message);
});

const ALLOWED_DB_USERS_AND_ROLES = new Set([
  // Akun lama
  "user_owner",
  "user_admin_cabang",
  "user_kasir",
  "user_mekanik",
  "user_gudang",
  "user_auditor",

  // Akun baru
  "user_admin_pg008",
  "user_admin_pg009",
  "user_kasir_pg010",
  "user_kasir_pg011",
  "user_gudang_pg012",
  "user_gudang_pg013",
  "user_mekanik_pg004",
  "user_mekanik_pg005",
  "user_mekanik_pg006",

  // Role PostgreSQL
  "role_owner",
  "role_admin_cabang",
  "role_kasir",
  "role_mekanik",
  "role_petugas_gudang",
  "role_auditor",
]);

const LOGIN_USERS = new Set([
  // Akun lama
  "user_owner",
  "user_admin_cabang",
  "user_kasir",
  "user_mekanik",
  "user_gudang",
  "user_auditor",

  // Akun baru
  "user_admin_pg008",
  "user_admin_pg009",
  "user_kasir_pg010",
  "user_kasir_pg011",
  "user_gudang_pg012",
  "user_gudang_pg013",
  "user_mekanik_pg004",
  "user_mekanik_pg005",
  "user_mekanik_pg006",
]);

const requestUserStorage = new AsyncLocalStorage();
const databaseSessions = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_SESSIONS = 30;

function runWithUserContext(user, fn) {
  return requestUserStorage.run(user, fn);
}

function getCurrentUserContext() {
  return requestUserStorage.getStore() || null;
}

function resolveValidatedDbIdentity(value) {
  if (!value) return null;

  const candidate =
    typeof value === "string"
      ? value.trim()
      : value.username || value.db_role || null;

  return ALLOWED_DB_USERS_AND_ROLES.has(candidate) ? candidate : null;
}

function makeAuthError(message) {
  const err = new Error(message);
  err.statusCode = 401;
  err.status = 401;
  err.code = "DATABASE_SESSION_EXPIRED";
  return err;
}

async function verifyPostgresCredentials(username, password) {
  if (!LOGIN_USERS.has(username)) {
    const err = new Error("Akun PostgreSQL tidak diizinkan.");
    err.code = "28P01";
    throw err;
  }

  const client = new Client({
    ...DB_CONFIG,
    user: username,
    password: String(password),
  });

  try {
    await client.connect();

    const result = await client.query("SELECT SESSION_USER AS username");

    if (result.rows[0]?.username !== username) {
      throw new Error("Identitas sesi PostgreSQL tidak sesuai.");
    }

    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

async function createDatabaseSession(username, password) {
  if (!LOGIN_USERS.has(username)) {
    throw makeAuthError("Akun PostgreSQL tidak valid.");
  }

  if (databaseSessions.size >= MAX_ACTIVE_SESSIONS) {
    throw new Error("Batas sesi aktif tercapai. Coba lagi nanti.");
  }

  const userPool = new Pool({
    ...DB_CONFIG,
    user: username,
    password: String(password),
    max: 3,
    idleTimeoutMillis: 30000,
  });

  userPool.on("error", (err) => {
    console.error(`[Pool ${username}]`, err.message);
  });

  try {
    // Validasi bahwa pool benar-benar dapat digunakan.
    const result = await userPool.query("SELECT SESSION_USER AS username");

    if (result.rows[0]?.username !== username) {
      throw new Error("Identitas koneksi PostgreSQL tidak sesuai.");
    }
  } catch (err) {
    await userPool.end().catch(() => {});
    throw err;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");

  databaseSessions.set(sessionId, {
    username,
    userPool,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return sessionId;
}

function getDatabaseSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return null;
  }

  const session = databaseSessions.get(sessionId);

  if (!session) return null;

  if (Date.now() >= session.expiresAt) {
    databaseSessions.delete(sessionId);
    session.userPool.end().catch(() => {});
    return null;
  }

  return session;
}

async function destroyDatabaseSession(sessionId) {
  const session = databaseSessions.get(sessionId);

  if (!session) return;

  databaseSessions.delete(sessionId);

  await session.userPool.end();
}

async function destroyAllDatabaseSessions() {
  const ids = [...databaseSessions.keys()];

  await Promise.all(
    ids.map((id) => destroyDatabaseSession(id).catch(() => {}))
  );
}

// Bersihkan sesi kedaluwarsa secara berkala.
const cleanupTimer = setInterval(() => {
  for (const sessionId of databaseSessions.keys()) {
    getDatabaseSession(sessionId);
  }
}, 60 * 1000);

cleanupTimer.unref();

function getRequestDatabaseSession() {
  const user = getCurrentUserContext();

  if (!user?.username || !user?.sid) {
    throw makeAuthError("Konteks autentikasi PostgreSQL tidak ditemukan.");
  }

  const session = getDatabaseSession(user.sid);

  if (!session || session.username !== user.username) {
    throw makeAuthError("Sesi PostgreSQL tidak aktif. Silakan login kembali.");
  }

  return session;
}

// Tidak lagi menggunakan SET ROLE.
// Semua query dijalankan oleh akun PostgreSQL login.
async function queryAsUser(dbUserOrRole, text, params = []) {
  const session = getRequestDatabaseSession();
  const requested = resolveValidatedDbIdentity(dbUserOrRole);

  if (
    requested &&
    requested !== session.username &&
    requested !== getCurrentUserContext()?.db_role
  ) {
    throw makeAuthError(
      "Tidak boleh menggunakan identitas database user lain."
    );
  }

  return session.userPool.query(text, params);
}

async function withTransaction(callback, explicitUserOrRole = null) {
  const session = getRequestDatabaseSession();

  if (explicitUserOrRole !== null) {
    const requested = resolveValidatedDbIdentity(explicitUserOrRole);

    if (
      requested !== session.username &&
      requested !== getCurrentUserContext()?.db_role
    ) {
      throw makeAuthError("Identitas transaksi tidak sesuai dengan sesi.");
    }
  }

  const client = await session.userPool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function query(text, params = []) {
  const session = getRequestDatabaseSession();

  return session.userPool.query(text, params);
}

/**
 * Utility untuk me-reset dan mengisi ulang database menggunakan
 * 7 file SQL Kelompok 1 secara berurutan.
 *
 * Digunakan oleh fitur Reset Demo Data pada System Diagnostics.
 * Dijalankan menggunakan koneksi admin pool (tanpa SET LOCAL ROLE).
 */
async function resetAndSeedDatabase() {
  const dbDir = path.resolve(__dirname, "../../../database");

  const executedFiles = [
    "Kelompok1_schema.sql",
    "Kelompok1_insert.sql",
    "Kelompok1_admin_security.sql",
    "Kelompok1_programming.sql",
    "Kelompok1_migration_tugas4.sql",
    "Kelompok1_migration_security_corporate.sql",
    "Kelompok1_migration_security_registry.sql",
  ];

  // Baca semua file SQL secara sinkron (karena hanya dijalankan sekali saat reset)
  const schemaSql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_schema.sql"),
    "utf8"
  );
  const insertSql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_insert.sql"),
    "utf8"
  );
  const securitySql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_admin_security.sql"),
    "utf8"
  );
  const programmingSql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_programming.sql"),
    "utf8"
  );
  const migrationSql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_migration_tugas4.sql"),
    "utf8"
  );
  const securityCorporateSql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_migration_security_corporate.sql"),
    "utf8"
  );
  const securityRegistrySql = fs.readFileSync(
    path.join(dbDir, "Kelompok1_migration_security_registry.sql"),
    "utf8"
  );

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
    await client.query("RESET ROLE").catch(() => {});
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
    await client.query(securityCorporateSql);
    await client.query(securityRegistrySql);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      executedFiles,
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
  resolveValidatedDbIdentity,
  ALLOWED_DB_USERS_AND_ROLES,
  resetAndSeedDatabase,
  createDatabaseSession,
  getDatabaseSession,
  destroyDatabaseSession,
  destroyAllDatabaseSessions,
};
