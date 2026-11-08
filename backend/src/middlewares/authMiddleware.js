const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const { runWithUserContext, getDatabaseSession } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET tidak valid.");
}

/**
 * Middleware untuk memverifikasi JWT Token di header Authorization
 * sekaligus mengikat konteks request ke akun PostgreSQL asli (SET LOCAL ROLE)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError(
        "Token autentikasi tidak ditemukan.",
        401,
        "UNAUTHORIZED_MISSING_TOKEN"
      )
    );
  }

  const token = authHeader.slice(7);

  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (_) {
    return next(
      new AppError(
        "Token tidak valid atau kedaluwarsa.",
        401,
        "UNAUTHORIZED_INVALID_TOKEN"
      )
    );
  }

  const session = getDatabaseSession(decoded.sid);

  if (!session || session.username !== decoded.username) {
    return next(
      new AppError(
        "Sesi PostgreSQL sudah tidak aktif. Silakan login kembali.",
        401,
        "DATABASE_SESSION_EXPIRED"
      )
    );
  }

  req.user = decoded;

  return runWithUserContext(decoded, () => next());
}

/**
 * SKENARIO DEBUGGING #4: User Tanpa Privilege (RBAC Violation) -> HTTP 403 Forbidden
 * Memvalidasi role pengguna terhadap daftar role yang diizinkan pada endpoint terkait.
 * Selaras dengan 6 Role di Kelompok1_admin_security.sql:
 * - owner (user_owner / role_owner)
 * - admin_cabang (user_admin_cabang / role_admin_cabang)
 * - kasir (user_kasir / role_kasir)
 * - mekanik (user_mekanik / role_mekanik)
 * - gudang (user_gudang / role_petugas_gudang)
 * - auditor (user_auditor / role_auditor)
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        new AppError(
          "Identitas pengguna tidak terautentikasi.",
          401,
          "UNAUTHORIZED_USER"
        )
      );
    }

    const rawRole = String(req.user.role || "").toLowerCase();
    const rawDbRole = String(
      req.user.db_role || `role_${rawRole}`
    ).toLowerCase();
    const rawUsername = String(req.user.username || "").toLowerCase();

    const allowedSet = new Set(
      allowedRoles.map((r) => String(r).toLowerCase().trim())
    );

    const isAllowed =
      allowedSet.has(rawRole) ||
      allowedSet.has(rawDbRole) ||
      allowedSet.has(rawUsername) ||
      allowedSet.has(`role_${rawRole}`) ||
      allowedSet.has(`user_${rawRole}`) ||
      ((rawRole === "owner" ||
        rawDbRole === "role_owner" ||
        rawUsername === "user_owner") &&
        (allowedSet.has("owner") ||
          allowedSet.has("role_owner") ||
          allowedSet.has("user_owner")));

    if (!isAllowed) {
      return next(
        new AppError(
          `Akses Ditolak (RBAC Violation): Akun '${
            req.user.username
          }' dengan role '${rawRole}' (${rawDbRole}) tidak memiliki hak akses (privilege) untuk menjalankan operasi ini. Role yang diizinkan: [${allowedRoles.join(
            ", "
          )}].`,
          403,
          "FORBIDDEN_INSUFFICIENT_PRIVILEGE",
          {
            currentUser: req.user.username,
            currentRole: rawRole,
            currentDbRole: rawDbRole,
            requiredRoles: allowedRoles,
            endpoint: `${req.method} ${req.originalUrl}`,
          }
        )
      );
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
