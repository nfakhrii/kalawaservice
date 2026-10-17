const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Konversi tipe OID 1700 (NUMERIC / DECIMAL) dan OID 20 (BIGINT / COUNT) ke Number di JavaScript
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'kalawa_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Menjalankan ulang ke-5 file SQL Kelompok 1 secara berurutan:
 * 1. Kelompok1_schema.sql
 * 2. Kelompok1_insert.sql
 * 3. Kelompok1_admin_security.sql
 * 4. Kelompok1_programming.sql
 * 5. Kelompok1_migration_tugas4.sql
 */
async function resetAndSeedDatabase() {
  const dbDir = path.resolve(__dirname, '../../../database');
  const files = [
    'Kelompok1_schema.sql',
    'Kelompok1_insert.sql',
    'Kelompok1_admin_security.sql',
    'Kelompok1_programming.sql',
    'Kelompok1_migration_tugas4.sql',
  ];

  const client = await pool.connect();
  try {
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    for (const file of files) {
      const sqlPath = path.join(dbDir, file);
      let sqlContent = fs.readFileSync(sqlPath, 'utf8');

      // Karena role di PostgreSQL bersifat cluster-wide, pastikan CREATE ROLE / CREATE USER
      // pada Kelompok1_admin_security.sql berjalan idempoten tanpa mengubah file asli di disk.
      if (file === 'Kelompok1_admin_security.sql') {
        sqlContent = sqlContent.replace(
          /CREATE\s+(ROLE|USER)\s+([^;]+);/gi,
          'DO $$$$ BEGIN CREATE $1 $2; EXCEPTION WHEN duplicate_object THEN NULL; END $$$$;'
        );
      }

      await client.query(sqlContent);
    }

    return { success: true, executedFiles: files };
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  resetAndSeedDatabase,
};
