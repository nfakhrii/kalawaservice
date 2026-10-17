const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');
const AppError = require('../utils/AppError');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

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
        role_label: user.role_label,
        cabang_id: user.cabang_id,
        cabang_kode: user.cabang_kode,
        kode_cabang: user.kode_cabang,
        nama_cabang: user.nama_cabang,
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  async login(username, password) {
    if (!username) {
      throw new AppError('Username wajib diisi.', 400, 'VALIDATION_ERROR');
    }

    const user = await authRepository.findByUsername(username);
    if (!user) {
      throw new AppError(`Pengguna '${username}' tidak ditemukan.`, 401, 'INVALID_CREDENTIALS');
    }

    // Validasi password (mendukung password Kelompok 1 dari Kelompok1_admin_security.sql maupun 'kalawa123')
    if (
      password &&
      password !== 'kalawa123' &&
      password !== user.password_hash
    ) {
      throw new AppError('Password yang dimasukkan tidak sesuai.', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    return {
      token,
      user: {
        ...safeUser,
        default_password: password_hash,
      },
    };
  }

  async quickSwitchRole(role) {
    const normalizedRole = authRepository.normalizeRoleKey(role);
    const validRoles = ['owner', 'admin_cabang', 'kasir', 'mekanik', 'gudang', 'auditor'];
    if (!validRoles.includes(normalizedRole)) {
      throw new AppError(
        `Role '${role}' tidak valid. Pilihan role Kelompok 1: [${validRoles.join(', ')}].`,
        400,
        'INVALID_ROLE'
      );
    }

    const user = await authRepository.findByRole(normalizedRole);
    if (!user) {
      throw new AppError(`Tidak ditemukan user aktif untuk role '${role}'.`, 404, 'USER_NOT_FOUND');
    }

    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    return {
      token,
      user: {
        ...safeUser,
        default_password: password_hash,
      },
    };
  }

  async getDemoUsers() {
    return await authRepository.findAllActiveDemoUsers();
  }
}

module.exports = new AuthService();
