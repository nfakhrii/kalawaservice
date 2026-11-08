const jwt = require("jsonwebtoken");
const authRepository = require("../repositories/authRepository");
const {
  verifyPostgresCredentials,
  createDatabaseSession,
  destroyDatabaseSession,
} = require("../config/db");
const AppError = require("../utils/AppError");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "24h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET minimal 32 karakter wajib diatur di backend/.env"
  );
}

class AuthService {
  generateToken(user, sessionId) {
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
        sid: sessionId,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: "HS256",
      }
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
      throw new AppError(
        "Username dan password wajib diisi.",
        400,
        "MISSING_CREDENTIALS"
      );
    }

    const user = await authRepository.findByUsername(String(username).trim());

    if (!user) {
      throw new AppError(
        "Username atau password tidak valid.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    try {
      await verifyPostgresCredentials(user.username, password);
    } catch (_) {
      throw new AppError(
        "Username atau password PostgreSQL tidak valid.",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    let sessionId = null;

    try {
      sessionId = await createDatabaseSession(user.username, password);

      const token = this.generateToken(user, sessionId);

      return {
        token,
        user: this.sanitizeUser(user),
      };
    } catch (err) {
      if (sessionId) {
        await destroyDatabaseSession(sessionId).catch(() => {});
      }

      throw err;
    }
  }

  async logout(sessionId) {
    await destroyDatabaseSession(sessionId);
  }

  async quickSwitchRole() {
    throw new AppError(
      "Quick-Switch dinonaktifkan. Silakan login menggunakan akun PostgreSQL asli.",
      403,
      "QUICK_SWITCH_DISABLED"
    );
  }

  async getDemoUsers() {
    const users = await authRepository.getAllDemoUsers();
    return users.map((user) => this.sanitizeUser(user));
  }
}

module.exports = new AuthService();
