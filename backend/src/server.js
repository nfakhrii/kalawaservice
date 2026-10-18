const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { pool, resetAndSeedDatabase } = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

async function bootstrapServer() {
  try {
    // 1. Test PostgreSQL Connection
    const client = await pool.connect();
    client.release();

    // 2. Check if Kelompok 1 tables & Tugas 4 migration exist; if not, initialize automatically
    const tableCheck = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('WORK_ORDER', 'KONTRAK_KORPORAT');
    `);

    if (Number(tableCheck.rows[0].cnt) < 2) {
      console.log('[Database Bootstrap]: Initializing Kalawa Service Kelompok 1 schema, security, programming & Tugas 4 migration...');
      await resetAndSeedDatabase();
      console.log('[Database Bootstrap]: Database initialized and seeded successfully.');
    }

    app.listen(PORT, () => {
      console.log(`====================================================================`);
      console.log(` Kalawa Service Enterprise Backend API running on port ${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================================`);
    });
  } catch (err) {
    console.error('[Fatal Startup Error]: Failed to connect or initialize PostgreSQL:', err.message);
    process.exit(1);
  }
}

bootstrapServer();
