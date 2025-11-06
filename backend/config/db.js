require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'fitai_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'fitai_pass';
const DB_NAME = process.env.DB_NAME || 'fitai_db';

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// Función para intentar conectar con retries
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log(`MySQL pool conectado a ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
      conn.release();
      return;
    } catch (err) {
      console.error(`Intento ${i + 1} fallido: ${err.message || err}`);
      console.log(`Reintentando en ${delay / 1000} segundos...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error(`No se pudo conectar a la DB después de ${retries} intentos`);
  process.exit(1); // salir si no se conecta
}

// Ejecutar la conexión antes de iniciar el servidor
connectWithRetry().then(() => {
  const express = require('express');
  const app = express();

  app.get('/', (req, res) => res.send('Servidor Express funcionando'));

  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => console.log(`Servidor Express en puerto ${PORT}`));
});

module.exports = { pool };
