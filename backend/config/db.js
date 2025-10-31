<<<<<<< HEAD
// db.js
=======
require('dotenv').config();
>>>>>>> origin/backend-develop
const mysql = require('mysql2/promise');
const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'fitai_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'fitai_pass';
const DB_NAME = process.env.DB_NAME || 'fitai_db';

const pool = mysql.createPool({
<<<<<<< HEAD
  host: process.env.DB_HOST || 'db', 
  
  user: process.env.DB_USER || 'fitai_user',
  
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'fitai_pass', 
  
  database: process.env.DB_DATABASE || process.env.MYSQL_DATABASE || 'fitai_db', 
  
  port: process.env.DB_PORT || 3306 
});

async function query(sql, params) {
    const [rows, fields] = await pool.execute(sql, params); 
    return rows;
}

module.exports = { pool, query };
=======
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

pool.getConnection()
  .then(conn => {
    console.log(`MySQL pool conectado a ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    conn.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err.message || err);
  });

module.exports = { pool };
// ...existing code...
>>>>>>> origin/backend-develop
