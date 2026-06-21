const { createClient } = require('redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});

client.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  try {
    await client.connect();
    console.log('--- Berhasil terhubung ke Redis Server ---');
  } catch (err) {
    console.error('Gagal koneksi Redis:', err);
  }
})();

module.exports = client;