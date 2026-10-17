const db = require('../config/db');

const ROLE_ALIASES = {
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

const BASE_USERS_CTE = `
  WITH account_catalog AS (
    SELECT
      1 AS sort_order,
      'user_owner'::VARCHAR AS username,
      'role_owner'::VARCHAR AS db_role,
      'owner'::VARCHAR AS role,
      'Owner'::VARCHAR AS role_label,
      'OwnerKalawa123'::VARCHAR AS default_password,
      'PG008'::VARCHAR AS pegawai_id,
      'CB001'::VARCHAR AS default_cabang_kode,
      'Hendra Setiawan (Owner)'::VARCHAR AS override_nama,
      'owner@kalawa-service.co.id'::VARCHAR AS email
    UNION ALL
    SELECT
      2,
      'user_admin_cabang',
      'role_admin_cabang',
      'admin_cabang',
      'Admin Cabang',
      'AdminKalawa123',
      'PG001',
      'CB001',
      NULL,
      'rinaldi.admin@kalawa-service.co.id'
    UNION ALL
    SELECT
      3,
      'user_kasir',
      'role_kasir',
      'kasir',
      'Kasir',
      'KasirKalawa123',
      'PG002',
      'CB001',
      NULL,
      'budi.kasir@kalawa-service.co.id'
    UNION ALL
    SELECT
      4,
      'user_mekanik',
      'role_mekanik',
      'mekanik',
      'Mekanik',
      'MekanikKalawa123',
      'PG003',
      'CB001',
      NULL,
      'candra.mekanik@kalawa-service.co.id'
    UNION ALL
    SELECT
      5,
      'user_gudang',
      'role_petugas_gudang',
      'gudang',
      'Petugas Gudang',
      'GudangKalawa123',
      'PG007',
      'CB002',
      NULL,
      'gilang.gudang@kalawa-service.co.id'
    UNION ALL
    SELECT
      6,
      'user_auditor',
      'role_auditor',
      'auditor',
      'Auditor',
      'AuditorKalawa123',
      'PG008',
      'CB003',
      'Hendra Setiawan (Auditor)',
      'auditor@kalawa-service.co.id'
  )
  SELECT
    p.pegawai_id AS id,
    p.pegawai_id,
    p.cabang_kode AS cabang_id,
    p.cabang_kode,
    p.cabang_kode AS kode_cabang,
    c.cabang_nama AS nama_cabang,
    c.cabang_nama,
    'Palangka Raya'::VARCHAR AS kota_cabang,
    ac.username,
    COALESCE(ac.override_nama, p.pegawai_nama) AS nama_lengkap,
    p.pegawai_nama,
    p.pegawai_telp,
    p.pegawai_peran AS pegawai_jabatan,
    p.pegawai_peran,
    ac.email,
    ac.default_password AS password_hash,
    ac.role,
    ac.db_role,
    ac.role_label,
    p.status_aktif,
    EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = ac.db_role) AS pg_role_active
  FROM account_catalog ac
  JOIN "PEGAWAI" p ON p.pegawai_id = ac.pegawai_id
  JOIN "CABANG" c ON c.cabang_kode = p.cabang_kode
`;

class AuthRepository {
  normalizeRoleKey(input) {
    if (!input) return null;
    const key = String(input).trim().toLowerCase();
    return ROLE_ALIASES[key] || key;
  }

  async findByUsername(username) {
    const normalizedRole = this.normalizeRoleKey(username);
    const sql = `
      ${BASE_USERS_CTE}
      WHERE LOWER(ac.username) = LOWER($1)
         OR LOWER(ac.role) = LOWER($2)
         OR LOWER(ac.db_role) = LOWER($1)
         OR LOWER(p.pegawai_id) = LOWER($1)
      ORDER BY ac.sort_order ASC
      LIMIT 1;
    `;
    const { rows } = await db.query(sql, [username, normalizedRole]);
    return rows[0] || null;
  }

  async findByRole(role) {
    const normalizedRole = this.normalizeRoleKey(role);
    const sql = `
      ${BASE_USERS_CTE}
      WHERE ac.role = $1 OR ac.db_role = $2 OR ac.username = $2
      ORDER BY ac.sort_order ASC
      LIMIT 1;
    `;
    const { rows } = await db.query(sql, [normalizedRole, role]);
    return rows[0] || null;
  }

  async findAllActiveDemoUsers() {
    const sql = `
      ${BASE_USERS_CTE}
      ORDER BY ac.sort_order ASC;
    `;
    const { rows } = await db.query(sql);
    return rows.map(({ password_hash, ...user }) => ({
      ...user,
      default_password: password_hash,
    }));
  }
}

module.exports = new AuthRepository();
