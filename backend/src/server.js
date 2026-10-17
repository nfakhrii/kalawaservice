const app = require('./app');
const { pool, resetAndSeedDatabase } = require('./config/db');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Verifikasi koneksi PostgreSQL & pastikan tabel sudah terinisialisasi
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'work_order'
      ) AS initialized;
    `);

    if (!check.rows[0].initialized) {
      console.log('[Kalawa Backend] Skema belum ditemukan, menginisialisasi database otomatis...');
      await resetAndSeedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`====================================================================`);
      console.log(`  Kalawa Service ERP Backend running on http://localhost:${PORT}/api`);
      console.log(`  Database: PostgreSQL (${process.env.DB_NAME || 'kalawa_db'}) via pg.Pool`);
      console.log(`====================================================================`);
    });
  } catch (err) {
    console.error('[Kalawa Backend] Gagal menjalankan server:', err.message);
    process.exit(1);
  }
}

startServer();

