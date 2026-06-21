const db = require('../config/db');
const { getCache, setCache } = require('../cache/cacheService');

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
    const cacheKey = `bookmarks_${req.user.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({ status: 'success', data: { bookmarks: cached } });
    }

    const result = await db.query(`
      SELECT bookmarks.*,
             jobs.title,           jobs.description,     jobs.requirements,
             jobs.salary,          jobs.location,
             jobs.company_id  AS job_company_id,
             jobs.category_id AS job_category_id,
             jobs.created_at  AS job_created_at,
             jobs.updated_at  AS job_updated_at,
             companies.name   AS company_name,
             categories.name  AS category_name
      FROM bookmarks
      LEFT JOIN jobs       ON bookmarks.job_id    = jobs.id
      LEFT JOIN companies  ON jobs.company_id     = companies.id
      LEFT JOIN categories ON jobs.category_id   = categories.id
      WHERE bookmarks.user_id = $1
    `, [req.user.id]);
    const bookmarks = result.rows.map(b => {
      return {
        id: b.id,
        jobId: b.job_id,
        userId: b.user_id,
        title: b.title,
        description: b.description,
        requirements: b.requirements,
        salary: b.salary,
        location: b.location,
        company_name: b.company_name,
        category_name: b.category_name
      };
    });

    await setCache(cacheKey, bookmarks, 1800);
    return res.header('X-Data-Source', 'database').status(200).json({ status: 'success', data: { bookmarks } });
  } catch (err) { next(err); }
};

const getProfileApplications = async (req, res, next) => {
  try {
    const resDb = await db.query(`
      SELECT 
        applications.*,
        jobs.title       AS job_title,
        jobs.location    AS job_location,
        jobs.salary      AS job_salary,
        jobs.company_id  AS job_company_id,
        jobs.category_id AS job_category_id,
        companies.name   AS company_name,
        users.email      AS user_email
      FROM applications
      LEFT JOIN jobs      ON applications.job_id  = jobs.id
      LEFT JOIN companies ON jobs.company_id       = companies.id
      LEFT JOIN users     ON applications.user_id  = users.id
      WHERE applications.user_id = $1
    `, [req.user.id]);
    const applications = resDb.rows.map(a => ({ ...a, jobId: a.job_id, userId: a.user_id }));
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

module.exports = { getProfile, getBookmarks, getProfileApplications };