const Redis = require('ioredis');

// Terhubung ke Redis Cloud (Upstash) menggunakan URL dari .env
const redis = new Redis(process.env.REDIS_URL);

// Menangani event error dari Redis agar aplikasi tidak crash
redis.on('error', (error) => {
  console.error('Redis Connection Error:', error.message);
});

const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('getCache Error:', err.message);
    return null; // Fallback jika Redis error
  }
};

const setCache = async (key, value, expirationInSecond = 1800) => {
  try {
    // Simpan cache dengan durasi expired (1800 detik / 30 menit)
    await redis.set(key, JSON.stringify(value), 'EX', expirationInSecond);
  } catch (err) {
    console.error('setCache Error:', err.message);
  }
};

const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('deleteCache Error:', err.message);
  }
};

module.exports = { getCache, setCache, deleteCache };