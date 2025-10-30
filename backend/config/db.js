const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'fitai_user',
  password: process.env.DB_PASSWORD || 'fitai_pass',
  database: process.env.DB_NAME || 'fitai_db',
  port: process.env.DB_PORT || 3306 
});

async function query(sql, params) {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
}

module.exports = { pool, query };
