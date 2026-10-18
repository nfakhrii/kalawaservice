const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');
const { verifyPostgresCredentials } = require('../config/db');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'kalawa-service-enterprise-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        pegawai_id: user.pegawai_id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        db_role: user.db_role,
        cabang_id: user.cabang_id,
        kode_cabang: user.kode_cabang,
        nama_cabang: user.nama_cabang,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  sanitizeUser(user) {
    return {
      id: user.id,
      pegawai_id: user.pegawai_id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      jabatan: user.jabatan,
      role: user.role,
      db_role: user.db_role,
      cabang_id: user.cabang_id,
      kode_cabang: user.kode_cabang,
      nama_cabang: user.nama_cabang,
      kota: user.kota,
    };
  }

  async login(username, password) {
    if (!username || !password) {
      throw new AppError('Username dan password wajib diisi.', 400, 'MISSING_CREDENTIALS');
    }

    const user = await authRepository.findByUsername(username.trim());
    if (!user) {
      throw new AppError(
        `Akun PostgreSQL '${username}' tidak ditemukan dalam daftar role Kelompok 1.`,
        401,
        'INVALID_CREDENTIALS'
      );
    }

    try {
      await verifyPostgresCredentials(user.username, password);
    } catch (pgErr) {
      throw new AppError(
        `Autentikasi PostgreSQL gagal untuk akun '${user.username}': password tidak valid (SQLSTATE ${pgErr.code || '28P01'}).`,
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const token = this.generateToken(user);
    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async quickSwitchRole(role) {
    const isDemoSwitchEnabled =
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_DEMO_QUICK_SWITCH !== 'false';

    if (!isDemoSwitchEnabled) {
      throw new AppError(
        'Fitur Demo Quick-Switch Role dinonaktifkan pada environment ini.',
        403,
        'DEMO_QUICK_SWITCH_DISABLED'
      );
    }

    const validRoles = [
      'owner',
      'admin_cabang',
      'kasir',
      'mekanik',
      'gudang',
      'auditor',
      'user_owner',
      'user_admin_cabang',
      'user_kasir',
      'user_mekanik',
      'user_gudang',
      'user_auditor',
    ];
    const cleanRole = String(role || '').trim().toLowerCase();
    if (!validRoles.includes(cleanRole)) {
      throw new AppError(
        `Role '${role}' tidak valid. Pilih salah satu dari: owner, admin_cabang, kasir, mekanik, gudang, atau auditor.`,
        400,
        'INVALID_ROLE'
      );
    }

    const user = await authRepository.findByRole(cleanRole);
    if (!user) {
      throw new AppError(`Akun demo untuk role '${role}' tidak ditemukan.`, 404, 'USER_NOT_FOUND');
    }

    const token = this.generateToken(user);
    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async getDemoUsers() {
    const users = await authRepository.getAllDemoUsers();
    return users.map((u) => this.sanitizeUser(u));
  }
}

module.exports = new AuthService();
