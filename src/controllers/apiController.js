const db = require('../config/db');

const getProfile = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) { next(err); }
};

const getBookmarks = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM bookmarks WHERE user_id = $1', [req.user.id]);
    return res.status(200).json({ status: 'success', data: { bookmarks: result.rows } });
  } catch (err) { next(err); }
};

module.exports = { getProfile, getBookmarks };