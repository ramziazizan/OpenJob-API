const db = require('../config/db');

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }
    const id = `category-${Date.now()}`;
    await db.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [id, name]);
    return res.status(201).json({ status: 'success', data: { categoryId: id, id: id } });
  } catch (err) { next(err); }
};

const getAllCategories = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM categories');
    return res.status(200).json({ status: 'success', data: { categories: resDb.rows } });
  } catch (err) { next(err); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const resDb = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });
    return res.status(200).json({ status: 'success', data: resDb.rows[0] });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }
    const check = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('UPDATE categories SET name = $1 WHERE id = $2', [name, req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Berhasil diperbarui' });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    return res.status(200).json({ status: 'success', message: 'Berhasil dihapus' });
  } catch (err) { next(err); }
};

module.exports = { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory };