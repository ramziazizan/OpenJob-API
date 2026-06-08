const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { validateUser, validateLogin } = require('../utils/validation');

const register = async (req, res, next) => {
  try {
    const { username, name, fullname, email, password } = req.body;
    const userVal = username || name || fullname;
    if (!userVal || !email || !password || password.length < 6) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const emailCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ status: 'failed', message: 'Email sudah digunakan' });
    }

    const id = `user-${Date.now()}`;
    const profileId = `profile-${Date.now()}`;
    const hash = await bcrypt.hash(password, 10);

    await db.query('BEGIN');
    await db.query('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)', [id, email, hash]);
    await db.query('INSERT INTO profiles (id, user_id, full_name) VALUES ($1, $2, $3)', [profileId, id, userVal]);
    await db.query('COMMIT');

    return res.status(201).json({ status: 'success', data: { userId: id, id: id } });
  } catch (err) {
    // Check if transaction was started and needs rollback
    try {
      await db.query('ROLLBACK');
    } catch (_) {}
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) return res.status(401).json({ status: 'failed', message: 'Kredensial tidak valid' });
    const accessToken = jwt.sign({ id: result.rows[0].id }, process.env.ACCESS_TOKEN_KEY || 'rahasia', { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: result.rows[0].id }, process.env.REFRESH_TOKEN_KEY || 'rahasia_refresh');

    await db.query('INSERT INTO authentications (token) VALUES ($1)', [refreshToken]);

    return res.status(200).json({ status: 'success', data: { accessToken, refreshToken } });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const tokenCheck = await db.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);
    if (tokenCheck.rows.length === 0) return res.status(400).json({ status: 'failed', message: 'Refresh token tidak valid' });

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY || 'rahasia_refresh');
      const accessToken = jwt.sign({ id: decoded.id }, process.env.ACCESS_TOKEN_KEY || 'rahasia', { expiresIn: '1h' });
      return res.status(200).json({ status: 'success', data: { accessToken } });
    } catch (err) {
      return res.status(400).json({ status: 'failed', message: 'Refresh token tidak valid' });
    }
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const tokenCheck = await db.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);
    if (tokenCheck.rows.length === 0) return res.status(400).json({ status: 'failed', message: 'Refresh token tidak valid' });

    await db.query('DELETE FROM authentications WHERE token = $1', [refreshToken]);
    return res.status(200).json({ status: 'success', message: 'Refresh token berhasil dihapus' });
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const resDb = await db.query(
      'SELECT users.id, profiles.full_name AS name, users.email, users.role FROM users LEFT JOIN profiles ON users.id = profiles.user_id WHERE users.id = $1',
      [req.params.id]
    );
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    return res.status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { register, login, getUserById, refresh, logout };