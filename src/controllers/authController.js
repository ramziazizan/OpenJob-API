const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res, next) => {
  try {
    const { username, name, fullname, email, password } = req.body;
    const userVal = username || name || fullname;
    if (!userVal || !email || !password || password.length < 6) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    const id = `user-${Date.now()}`;
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4)', [id, userVal, email, hash]);
    return res.status(201).json({ status: 'success', data: { userId: id, id: id } });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) return res.status(401).json({ status: 'failed', message: 'Kredensial tidak valid' });
    const token = jwt.sign({ id: result.rows[0].id }, process.env.ACCESS_TOKEN_KEY || 'rahasia', { expiresIn: '1h' });
    return res.status(201).json({ status: 'success', data: { accessToken: token, refreshToken: token } });
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    return res.status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { register, login, getUserById };