require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', 
});

async function makeDatabase() {
  try {
    await client.connect();
    await client.query('CREATE DATABASE openjob;');
    console.log('DATABASE "openjob" SUKSES DIBUAT!');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database "openjob" ternyata udah ada!');
    } else {
      console.error('Gagal bikin DB:', err.message);
    }
  } finally {
    await client.end();
  }
}

makeDatabase();