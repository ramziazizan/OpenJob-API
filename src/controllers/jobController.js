const db = require('../config/db');

const getJobById = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    const j = resDb.rows[0];
    return res.status(200).json({ status: 'success', data: { ...j, companyId: j.company_id, categoryId: j.category_id } });
  } catch (err) { next(err); }
};

const getAllJobs = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM jobs');
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

module.exports = { getJobById, getAllJobs, applyJob };