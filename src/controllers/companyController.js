const db = require('../config/db');

const createCompany = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    const id = `company-${Date.now()}`;
    await db.query('INSERT INTO companies (id, name, description) VALUES ($1, $2, $3)', [id, name, description]);
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
    const resDb = await db.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    return res.status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { createCompany, getAllCompanies, getCompanyById };