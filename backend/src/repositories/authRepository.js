const { pool } = require("../config/db");

/**
 * Pemetaan akun login PostgreSQL ke identitas aplikasi.
 *
 * - 13 akun pegawai
 * - 1 akun owner
 * - 1 akun auditor
 *
 * Password diverifikasi langsung oleh PostgreSQL.
 * Tidak ada password yang disimpan di repository ini.
 */
const KELOMPOK1_PG_ACCOUNTS = [
  // Akun khusus
  {
    id: "OWNER",
    pegawai_id: null,
    username: "user_owner",
    role: "owner",
    db_role: "role_owner",
    fallback_nama: "Owner Kalawa Service",
    fallback_jabatan: "Owner / Pemilik Bengkel",
    cabang_kode: null,
  },
  {
    id: "AUDITOR",
    pegawai_id: null,
    username: "user_auditor",
    role: "auditor",
    db_role: "role_auditor",
    fallback_nama: "Auditor Kalawa Service",
    fallback_jabatan: "Auditor Internal",
    cabang_kode: null,
  },

  // Admin cabang
  {
    id: "PG001",
    pegawai_id: "PG001",
    username: "user_admin_cabang",
    role: "admin_cabang",
    db_role: "role_admin_cabang",
    cabang_kode: "CB001",
  },
  {
    id: "PG008",
    pegawai_id: "PG008",
    username: "user_admin_pg008",
    role: "admin_cabang",
    db_role: "role_admin_cabang",
    cabang_kode: "CB003",
  },
  {
    id: "PG009",
    pegawai_id: "PG009",
    username: "user_admin_pg009",
    role: "admin_cabang",
    db_role: "role_admin_cabang",
    cabang_kode: "CB002",
  },

  // Kasir
  {
    id: "PG002",
    pegawai_id: "PG002",
    username: "user_kasir",
    role: "kasir",
    db_role: "role_kasir",
    cabang_kode: "CB001",
  },
  {
    id: "PG010",
    pegawai_id: "PG010",
    username: "user_kasir_pg010",
    role: "kasir",
    db_role: "role_kasir",
    cabang_kode: "CB002",
  },
  {
    id: "PG011",
    pegawai_id: "PG011",
    username: "user_kasir_pg011",
    role: "kasir",
    db_role: "role_kasir",
    cabang_kode: "CB003",
  },

  // Mekanik
  {
    id: "PG003",
    pegawai_id: "PG003",
    username: "user_mekanik",
    role: "mekanik",
    db_role: "role_mekanik",
    cabang_kode: "CB001",
  },
  {
    id: "PG004",
    pegawai_id: "PG004",
    username: "user_mekanik_pg004",
    role: "mekanik",
    db_role: "role_mekanik",
    cabang_kode: "CB002",
  },
  {
    id: "PG005",
    pegawai_id: "PG005",
    username: "user_mekanik_pg005",
    role: "mekanik",
    db_role: "role_mekanik",
    cabang_kode: "CB002",
  },
  {
    id: "PG006",
    pegawai_id: "PG006",
    username: "user_mekanik_pg006",
    role: "mekanik",
    db_role: "role_mekanik",
    cabang_kode: "CB003",
  },

  // Petugas gudang
  {
    id: "PG007",
    pegawai_id: "PG007",
    username: "user_gudang",
    role: "gudang",
    db_role: "role_petugas_gudang",
    cabang_kode: "CB002",
  },
  {
    id: "PG012",
    pegawai_id: "PG012",
    username: "user_gudang_pg012",
    role: "gudang",
    db_role: "role_petugas_gudang",
    cabang_kode: "CB001",
  },
  {
    id: "PG013",
    pegawai_id: "PG013",
    username: "user_gudang_pg013",
    role: "gudang",
    db_role: "role_petugas_gudang",
    cabang_kode: "CB003",
  },
];

class AuthRepository {
  async hydrateAccountMetadata(accountDef) {
    if (!accountDef) return null;

    const sql = `
      SELECT
        r.rolname AS verified_pg_role,
        pg.pegawai_id,
        pg.pegawai_nama,
        pg.pegawai_peran,
        pg.status_aktif,
        c.cabang_kode,
        c.cabang_nama
      FROM pg_roles r
      LEFT JOIN "PEGAWAI" pg
        ON pg.pegawai_id = $2
      LEFT JOIN "CABANG" c
        ON c.cabang_kode = pg.cabang_kode
      WHERE r.rolname = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [
      accountDef.username,
      accountDef.pegawai_id,
    ]);

    const row = rows[0];
    if (!row) return null;

    // Akun pegawai wajib memiliki data pegawai aktif
    // dan cabang yang valid.
    if (accountDef.pegawai_id) {
      if (
        row.pegawai_id !== accountDef.pegawai_id ||
        row.status_aktif !== true ||
        !row.cabang_kode ||
        row.cabang_kode !== accountDef.cabang_kode
      ) {
        return null;
      }
    }

    return {
      id: accountDef.id,
      pegawai_id: accountDef.pegawai_id,
      username: accountDef.username,
      nama_lengkap:
        row.pegawai_nama || accountDef.fallback_nama || accountDef.username,
      jabatan:
        row.pegawai_peran || accountDef.fallback_jabatan || accountDef.role,
      role: accountDef.role,
      db_role: accountDef.db_role,
      cabang_id: row.cabang_kode || null,
      kode_cabang: row.cabang_kode || null,
      nama_cabang: row.cabang_nama || null,
      kota: "Palangka Raya",
    };
  }

  async findByUsername(username) {
    const clean = String(username || "")
      .trim()
      .toLowerCase();

    // Login hanya menggunakan username PostgreSQL yang unik.
    const found = KELOMPOK1_PG_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === clean
    );

    if (!found) return null;

    return this.hydrateAccountMetadata(found);
  }

  async findByRole(role) {
    const clean = String(role || "")
      .trim()
      .toLowerCase();

    // Role tidak lagi mewakili satu pengguna tertentu.
    // Hindari memilih akun pertama secara ambigu.
    const matches = KELOMPOK1_PG_ACCOUNTS.filter(
      (acc) =>
        acc.role.toLowerCase() === clean || acc.db_role.toLowerCase() === clean
    );

    if (matches.length !== 1) return null;

    return this.hydrateAccountMetadata(matches[0]);
  }

  async getAllDemoUsers() {
    const results = await Promise.all(
      KELOMPOK1_PG_ACCOUNTS.map((acc) => this.hydrateAccountMetadata(acc))
    );

    return results.filter(Boolean);
  }
}

module.exports = new AuthRepository();
