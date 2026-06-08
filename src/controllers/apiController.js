const db = require('../config/db');

const getProfile = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT users.id, profiles.full_name AS name, users.email, users.role FROM users LEFT JOIN profiles ON users.id = profiles.user_id WHERE users.id = $1',
      [req.user.id]
    );
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) { next(err); }
};

const getBookmarks = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM bookmarks WHERE user_id = $1', [req.user.id]);
    return res.status(200).json({ status: 'success', data: { bookmarks: result.rows } });
  } catch (err) { next(err); }
};

const getProfileApplications = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM applications WHERE user_id = $1', [req.user.id]);
    const applications = resDb.rows.map(a => ({ ...a, jobId: a.job_id, userId: a.user_id }));
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

module.exports = { getProfile, getBookmarks, getProfileApplications };