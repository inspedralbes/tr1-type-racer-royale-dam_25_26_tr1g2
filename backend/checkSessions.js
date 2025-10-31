const { pool } = require('./config/db');

async function check(code = 'LXZ52M') {
  try {
    const [rows] = await pool.query(
      'SELECT id, codi_acces, estat, data_creacio, creador_id FROM SessionsVersus WHERE codi_acces = ?',
      [code]
    );
    console.log('Resultados:', rows);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    if (pool && typeof pool.end === 'function') await pool.end();
  }
}

check(process.argv[2]);