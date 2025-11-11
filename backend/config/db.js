// Contenido simplificado para ./config/db.js
// Contenido de ./config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// --- DEBES INCLUIR ESTAS DECLARACIONES ---
const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'fitai_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'fitai_pass';
const DB_NAME = process.env.DB_NAME || 'fitai_db';
// ------------------------------------------

const pool = mysql.createPool({
    // Ahora estas referencias funcionan:
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

// ... (El resto de tu función connectWithRetry y module.exports)

// Función para intentar conectar con retries (DEBE EXPORTARSE)
async function connectWithRetry(retries = 10, delay = 3000) {
    // ... (Tu lógica de retries sin llamar a Express ni app.listen)
    for (let i = 0; i < retries; i++) {
        // ... (código try/catch)
        if (i + 1 === retries) {
             console.error(`No se pudo conectar a la DB después de ${retries} intentos`);
             process.exit(1);
        }
    }
    console.log(`MySQL pool conectado a ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    return pool; // Devuelve el pool
}

module.exports = { pool, connectWithRetry }; // Exporta el pool y la función