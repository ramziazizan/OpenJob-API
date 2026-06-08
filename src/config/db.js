require('dotenv').config();
const { Pool } = require('pg');

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

module.exports = pool;

pool.connect((err, client, release) => {
  if (err) {
    console.error('DATABASE GAGAL KONEKSI:', err.message);
  } else {
    console.log('DATABASE BERHASIL TERKONEKSI!');
    release();
  }
});

module.exports = pool;