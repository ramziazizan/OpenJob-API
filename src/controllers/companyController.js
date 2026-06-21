const db = require('../config/db');
const { getCache, setCache, deleteCache } = require('../cache/cacheService');

const createCompany = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const location = req.body.location || req.body.location_city || req.body.location_type;
    if (!name || !description) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const id = `company-${Date.now()}`;
    await db.query('INSERT INTO companies (id, name, description, location) VALUES ($1, $2, $3, $4)', [id, name, description, location || null]);
    return res.status(201).json({ status: 'success', data: { companyId: id, id: id } });
  } catch (err) { next(err); }
};

const getAllCompanies = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM companies');
    return res.status(200).json({ status: 'success', data: { companies: resDb.rows } });
  } catch (err) { next(err); }
};

const getCompanyById = async (req, res, next) => {
  try {
    const cacheKey = `company_${req.params.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({ status: 'success', data: cached });
    }

    const resDb = await db.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await setCache(cacheKey, resDb.rows[0], 1800);
    return res.header('X-Data-Source', 'database').status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

const updateCompany = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const { name, description } = req.body;
    const location = req.body.location || req.body.location_city || req.body.location_type;
    if (!name || !description) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    await db.query('UPDATE companies SET name = $1, description = $2, location = $3 WHERE id = $4', [name, description, location || null, req.params.id]);

    // Invalidasi cache SEBELUM mengirim response agar tidak ada race condition
    await deleteCache(`company_${req.params.id}`);
    await deleteCache('companies_list');

    return res.status(200).json({ status: 'success', message: 'Berhasil diperbarui' });
  } catch (err) { next(err); }
};

const deleteCompany = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM companies WHERE id = $1', [req.params.id]);

    // Invalidasi cache SEBELUM mengirim response
    await deleteCache(`company_${req.params.id}`);
    await deleteCache('companies_list');

    return res.status(200).json({ status: 'success', message: 'Berhasil dihapus' });
  } catch (err) { next(err); }
};

module.exports = { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany };