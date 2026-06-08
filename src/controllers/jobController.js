const db = require('../config/db');

const getJobById = async (req, res, next) => {
  try {
    const resDb = await db.query(
      `SELECT jobs.*, companies.name AS company_name, categories.name AS category_name 
       FROM jobs 
       LEFT JOIN companies ON jobs.company_id = companies.id 
       LEFT JOIN categories ON jobs.category_id = categories.id 
       WHERE jobs.id = $1`,
      [req.params.id]
    );
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    const j = resDb.rows[0];
    return res.status(200).json({ status: 'success', data: { ...j, companyId: j.company_id, categoryId: j.category_id } });
  } catch (err) { next(err); }
};

const getAllJobs = async (req, res, next) => {
  try {
    const searchVal = req.query.q || req.query.search || req.query.query;
    const companyVal = req.query.company || req.query.company_name || req.query.companyName || req.query['company-name'];
    const titleVal = req.query.title || req.query.title_name || req.query.job_title || req.query['job-title'];
    const categoryVal = req.query.category || req.query.category_name || req.query['category-name'];
    const locationVal = req.query.location || req.query.location_city || req.query.location_type || req.query['location-city'] || req.query['location-type'];

    let queryText = `
      SELECT jobs.*, companies.name AS company_name, categories.name AS category_name 
      FROM jobs 
      LEFT JOIN companies ON jobs.company_id = companies.id 
      LEFT JOIN categories ON jobs.category_id = categories.id
    `;
    const queryParams = [];
    const conditions = [];

    if (searchVal) {
      queryParams.push(`%${searchVal}%`);
      const idx = queryParams.length;
      conditions.push(`(jobs.title ILIKE $${idx} OR jobs.description ILIKE $${idx} OR companies.name ILIKE $${idx})`);
    }

    if (companyVal) {
      queryParams.push(`%${companyVal}%`);
      conditions.push(`companies.name ILIKE $${queryParams.length}`);
    }

    if (titleVal) {
      queryParams.push(`%${titleVal}%`);
      conditions.push(`jobs.title ILIKE $${queryParams.length}`);
    }

    if (categoryVal) {
      queryParams.push(`%${categoryVal}%`);
      conditions.push(`categories.name ILIKE $${queryParams.length}`);
    }

    if (locationVal) {
      queryParams.push(`%${locationVal}%`);
      conditions.push(`jobs.location ILIKE $${queryParams.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    const resDb = await db.query(queryText, queryParams);
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id, categoryId: j.category_id }));
    return res.status(200).json({ status: 'success', data: { jobs } });
  } catch (err) { next(err); }
};

const applyJob = async (req, res, next) => {
  try {
    const id = `app-${Date.now()}`;
    await db.query('INSERT INTO applications (id, job_id, user_id, status) VALUES ($1, $2, $3, $4)', [id, req.body.jobId || req.body.job_id, req.user.id, 'pending']);
    return res.status(201).json({ status: 'success', data: { applicationId: id, id: id } });
  } catch (err) { next(err); }
};

const createJob = async (req, res, next) => {
  try {
    const companyId = req.body.companyId || req.body.company_id;
    const categoryId = req.body.categoryId || req.body.category_id;
    const location = req.body.location || req.body.location_city || req.body.location_type;
    const salary = req.body.salary || (req.body.salary_min && req.body.salary_max ? `${req.body.salary_min} - ${req.body.salary_max}` : (req.body.salary_min || req.body.salary_max || null));
    const { title, description, requirements } = req.body;

    if (!companyId || !categoryId || !title || !description || !location) {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    const compCheck = await db.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    const catCheck = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (compCheck.rows.length === 0 || catCheck.rows.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    const id = `job-${Date.now()}`;
    await db.query(
      'INSERT INTO jobs (id, company_id, category_id, title, description, requirements, salary, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, companyId, categoryId, title, description, requirements, salary, location]
    );

    return res.status(201).json({ status: 'success', data: { jobId: id, id: id } });
  } catch (err) { next(err); }
};

const updateJob = async (req, res, next) => {
  try {
    const companyId = req.body.companyId || req.body.company_id;
    const categoryId = req.body.categoryId || req.body.category_id;
    const location = req.body.location || req.body.location_city || req.body.location_type;
    const salary = req.body.salary || (req.body.salary_min && req.body.salary_max ? `${req.body.salary_min} - ${req.body.salary_max}` : (req.body.salary_min || req.body.salary_max || null));
    const { title, description, requirements } = req.body;

    if (!companyId || !categoryId || !title || !description || !location) {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    const check = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const compCheck = await db.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    const catCheck = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (compCheck.rows.length === 0 || catCheck.rows.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    await db.query(
      'UPDATE jobs SET company_id = $1, category_id = $2, title = $3, description = $4, requirements = $5, salary = $6, location = $7 WHERE id = $8',
      [companyId, categoryId, title, description, requirements, salary, location, req.params.id]
    );

    return res.status(200).json({ status: 'success', message: 'Berhasil diperbarui' });
  } catch (err) { next(err); }
};

const deleteJob = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Berhasil dihapus' });
  } catch (err) { next(err); }
};

const getAllApplications = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM applications');
    const applications = resDb.rows.map(a => ({ ...a, jobId: a.job_id, userId: a.user_id }));
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const getApplicationById = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    const a = resDb.rows[0];
    return res.status(200).json({ status: 'success', data: { ...a, jobId: a.job_id, userId: a.user_id } });
  } catch (err) { next(err); }
};

const addBookmark = async (req, res, next) => {
  try {
    const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Lowongan tidak ditemukan' });

    const id = `bookmark-${Date.now()}`;
    await db.query('INSERT INTO bookmarks (id, user_id, job_id) VALUES ($1, $2, $3)', [id, req.user.id, req.params.id]);

    return res.status(201).json({ status: 'success', message: 'Lowongan berhasil dibookmark', data: { id } });
  } catch (err) { next(err); }
};

const getJobsByCompany = async (req, res, next) => {
  try {
    const resDb = await db.query(
      `SELECT jobs.*, companies.name AS company_name, categories.name AS category_name 
       FROM jobs 
       LEFT JOIN companies ON jobs.company_id = companies.id 
       LEFT JOIN categories ON jobs.category_id = categories.id 
       WHERE jobs.company_id = $1`,
      [req.params.companyId]
    );
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id, categoryId: j.category_id }));
    return res.status(200).json({ status: 'success', data: { jobs } });
  } catch (err) { next(err); }
};

const getJobsByCategory = async (req, res, next) => {
  try {
    const resDb = await db.query(
      `SELECT jobs.*, companies.name AS company_name, categories.name AS category_name 
       FROM jobs 
       LEFT JOIN companies ON jobs.company_id = companies.id 
       LEFT JOIN categories ON jobs.category_id = categories.id 
       WHERE jobs.category_id = $1`,
      [req.params.categoryId]
    );
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id, categoryId: j.category_id }));
    return res.status(200).json({ status: 'success', data: { jobs } });
  } catch (err) { next(err); }
};

const getApplicationsByJob = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM applications WHERE job_id = $1', [req.params.jobId]);
    const applications = resDb.rows.map(a => ({ ...a, jobId: a.job_id, userId: a.user_id }));
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const getApplicationsByUser = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM applications WHERE user_id = $1', [req.params.userId]);
    const applications = resDb.rows.map(a => ({ ...a, jobId: a.job_id, userId: a.user_id }));
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const check = await db.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('UPDATE applications SET status = $1 WHERE id = $2', [status, req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Berhasil diperbarui' });
  } catch (err) { next(err); }
};

const deleteApplication = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Berhasil dihapus' });
  } catch (err) { next(err); }
};

const deleteBookmark = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM bookmarks WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Bookmark berhasil dihapus' });
  } catch (err) { next(err); }
};

const getBookmarkById = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM bookmarks WHERE id = $1 AND job_id = $2', [req.params.bookmarkId, req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    return res.status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getJobById, getAllJobs, applyJob, createJob, updateJob, deleteJob, getAllApplications, getApplicationById, addBookmark, getJobsByCompany, getJobsByCategory, getApplicationsByUser, getApplicationsByJob, updateApplicationStatus, deleteApplication, deleteBookmark, getBookmarkById };