const { pool } = require('./config/db');

async function checkRutines() {
  try {
    // Consultar todas las rutinas con sus datos básicos
    const [rutines] = await pool.query(
      'SELECT id, nom, data_creacio FROM Rutines'
    );

    console.log('=== Rutinas ===');
    console.table(rutines);

    // Consultar los ejercicios asociados a cada rutina
    const [exercicis] = await pool.query(
      'SELECT id, id_rutina, nom_exercicis, n_repeticions FROM Exercicis_Rutina'
    );

    console.log('\n=== Ejercicios asociados ===');
    console.table(exercicis);

  } catch (err) {
    console.error('❌ Error consultando la base de datos:', err);
  } finally {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('\nConexión cerrada.');
    }
  }
}

checkRutines();
