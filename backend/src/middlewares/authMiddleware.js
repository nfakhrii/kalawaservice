const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { runWithUserContext } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'kalawa-service-enterprise-secret-key-2026';

/**
 * Middleware untuk memverifikasi JWT Token di header Authorization
 * sekaligus mengikat konteks request ke akun PostgreSQL asli (SET LOCAL ROLE)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Akses ditolak: Token autentikasi (Bearer JWT) tidak ditemukan.',
        401,
        'UNAUTHORIZED_MISSING_TOKEN'
      )
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return runWithUserContext(decoded, () => next());
  } catch (_err) {
    return next(
      new AppError(
        'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.',
        401,
        'UNAUTHORIZED_INVALID_TOKEN'
      )
    );
  }
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
          'Identitas pengguna tidak terautentikasi.',
          401,
          'UNAUTHORIZED_USER'
        )
      );
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return next(
        new AppError(
          `Akses Ditolak (RBAC Violation): Akun '${req.user.username}' dengan role '${userRole}' (${req.user.db_role || 'role_' + userRole}) tidak memiliki hak akses (privilege) untuk menjalankan operasi ini. Role yang diizinkan: [${allowedRoles.join(', ')}].`,
          403,
          'FORBIDDEN_INSUFFICIENT_PRIVILEGE',
          {
            currentUser: req.user.username,
            currentRole: userRole,
            currentDbRole: req.user.db_role,
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
