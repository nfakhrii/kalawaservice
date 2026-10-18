const { pool } = require('../config/db');

/**
 * Daftar whitelist resmi 6 akun PostgreSQL dari Kelompok1_admin_security.sql
 * beserta pemetaan ke pegawai_id ("PEGAWAI") dan cabang_kode ("CABANG").
 * TIDAK ADA password plaintext maupun password_hash yang disimpan di sini;
 * verifikasi password dilakukan langsung oleh engine PostgreSQL (pg_authid).
 */
const KELOMPOK1_PG_ACCOUNTS = [
  {
    id: 'PG000',
    pegawai_id: null,
    username: 'user_owner',
    role: 'owner',
    db_role: 'role_owner',
    fallback_nama: 'Hendra Setiawan (Owner Kalawa)',
    fallback_jabatan: 'Owner / Pemilik Bengkel',
    cabang_kode: 'CB001',
  },
  {
    id: 'PG001',
    pegawai_id: 'PG001',
    username: 'user_admin_cabang',
    role: 'admin_cabang',
    db_role: 'role_admin_cabang',
    fallback_nama: 'Rinaldi Rizwar',
    fallback_jabatan: 'Admin Cabang',
    cabang_kode: 'CB001',
  },
  {
    id: 'PG002',
    pegawai_id: 'PG002',
    username: 'user_kasir',
    role: 'kasir',
    db_role: 'role_kasir',
    fallback_nama: 'Budi Santoso',
    fallback_jabatan: 'Kasir Bengkel',
    cabang_kode: 'CB001',
  },
  {
    id: 'PG003',
    pegawai_id: 'PG003',
    username: 'user_mekanik',
    role: 'mekanik',
    db_role: 'role_mekanik',
    fallback_nama: 'Candra Hasibuan',
    fallback_jabatan: 'Mekanik Spesialis',
    cabang_kode: 'CB001',
  },
  {
    id: 'PG007',
    pegawai_id: 'PG007',
    username: 'user_gudang',
    role: 'gudang',
    db_role: 'role_petugas_gudang',
    fallback_nama: 'Gilang Ramadhan',
    fallback_jabatan: 'Petugas Gudang Suku Cadang',
    cabang_kode: 'CB002',
  },
  {
    id: 'PG008',
    pegawai_id: 'PG008',
    username: 'user_auditor',
    role: 'auditor',
    db_role: 'role_auditor',
    fallback_nama: 'Hendra Setiawan (Auditor)',
    fallback_jabatan: 'Auditor Internal',
    cabang_kode: 'CB003',
  },
];

class AuthRepository {
  async hydrateAccountMetadata(accountDef) {
    if (!accountDef) return null;

    const sql = `
      SELECT
        pg.pegawai_id,
        pg.pegawai_nama,
        pg.pegawai_peran,
        c.cabang_kode,
        c.cabang_nama,
        'Palangka Raya'::VARCHAR AS kota,
        r.rolname AS verified_pg_role
      FROM pg_roles r
      LEFT JOIN "PEGAWAI" pg ON pg.pegawai_id = $2
      LEFT JOIN "CABANG" c ON c.cabang_kode = $3
      WHERE r.rolname = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [
      accountDef.username,
      accountDef.pegawai_id,
      accountDef.cabang_kode,
    ]);
    const row = rows[0] || {};

    return {
      id: accountDef.id,
      pegawai_id: accountDef.pegawai_id,
      username: accountDef.username,
      nama_lengkap: row.pegawai_nama || accountDef.fallback_nama,
      jabatan: row.pegawai_peran || accountDef.fallback_jabatan,
      role: accountDef.role,
      db_role: accountDef.db_role,
      cabang_id: row.cabang_kode || accountDef.cabang_kode,
      kode_cabang: row.cabang_kode || accountDef.cabang_kode,
      nama_cabang: row.cabang_nama || 'Kalawa Service Pahandut',
      kota: row.kota || 'Palangka Raya',
    };
  }

  async findByUsername(username) {
    const clean = String(username || '').trim().toLowerCase();
    const found = KELOMPOK1_PG_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === clean ||
        acc.role.toLowerCase() === clean ||
        acc.db_role.toLowerCase() === clean
    );
    if (!found) return null;
    return await this.hydrateAccountMetadata(found);
  }

  async findByRole(role) {
    return await this.findByUsername(role);
  }

  async getAllDemoUsers() {
    const results = await Promise.all(
      KELOMPOK1_PG_ACCOUNTS.map((acc) => this.hydrateAccountMetadata(acc))
    );
    return results.filter(Boolean);
  }
}

module.exports = new AuthRepository();
