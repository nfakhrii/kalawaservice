const { resetAndSeedDatabase, pool } = require('../config/db');

(async () => {
  try {
    console.log('[Kalawa DB] Menjalankan reset skema, migrasi korporat, dan seed data...');
    const result = await resetAndSeedDatabase();
    console.log('[Kalawa DB] Berhasil mengeksekusi:', result.executedFiles.join(', '));
    process.exit(0);
  } catch (err) {
    console.error('[Kalawa DB] Gagal melakukan reset database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

