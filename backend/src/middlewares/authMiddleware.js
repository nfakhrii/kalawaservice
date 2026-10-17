const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'kalawa-service-enterprise-secret-key-2026';

const ROLE_NORMALIZER = {
  owner: 'owner',
  role_owner: 'owner',
  user_owner: 'owner',
  admin_cabang: 'admin_cabang',
  role_admin_cabang: 'admin_cabang',
  user_admin_cabang: 'admin_cabang',
  kasir: 'kasir',
  role_kasir: 'kasir',
  user_kasir: 'kasir',
  mekanik: 'mekanik',
  role_mekanik: 'mekanik',
  user_mekanik: 'mekanik',
  gudang: 'gudang',
  petugas_gudang: 'gudang',
  role_petugas_gudang: 'gudang',
  user_gudang: 'gudang',
  auditor: 'auditor',
  role_auditor: 'auditor',
  user_auditor: 'auditor',
};

function normalizeRole(role) {
  if (!role) return '';
  const key = String(role).trim().toLowerCase();
  return ROLE_NORMALIZER[key] || key;
}

/**
 * Middleware Autentikasi JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Akses ditolak: Token autentikasi JWT tidak ditemukan pada header Authorization.',
        401,
        'UNAUTHORIZED_MISSING_TOKEN'
      )
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(
      new AppError(
        'Sesi tidak valid atau token JWT telah kedaluwarsa.',
        401,
        'UNAUTHORIZED_INVALID_TOKEN'
      )
    );
  }
}

/**
 * Middleware Role-Based Access Control (RBAC) — Skenario Debugging #4
 * Menolak akses dengan HTTP 403 Forbidden jika role user tidak terdaftar pada allowedRoles.
 * Role 'owner' (role_owner) adalah superuser di Kelompok1_admin_security.sql dan memiliki akses penuh.
 */
function authorizeRoles(...allowedRoles) {
  const normalizedAllowed = new Set(allowedRoles.map(normalizeRole));
  // Owner memiliki hak akses penuh pada seluruh modul sesuai Kelompok1_admin_security.sql
  normalizedAllowed.add('owner');

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        new AppError('Identitas role pengguna tidak terdeteksi.', 401, 'UNAUTHORIZED')
      );
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.has(userRole)) {
      return next(
        new AppError(
          `Akses Ditolak (403 Forbidden): Role '${req.user.db_role || req.user.role}' (${req.user.username}) tidak memiliki hak akses (privilege) untuk menjalankan operasi pada endpoint '${req.method} ${req.originalUrl}'. Role yang diizinkan: [${Array.from(normalizedAllowed).join(', ')}].`,
          403,
          'FORBIDDEN_INSUFFICIENT_PRIVILEGE',
          {
            currentUser: req.user.username,
            currentRole: req.user.role,
            dbRole: req.user.db_role || `role_${userRole}`,
            requiredRoles: Array.from(normalizedAllowed),
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
  normalizeRole,
  JWT_SECRET,
};
