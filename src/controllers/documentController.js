const db = require('../config/db');

const uploadDocument = async (req, res, next) => {
  try {
    // Kalau nggak ada file yang di-upload atau formatnya salah
    if (!req.file) {
      return res.status(400).json({ status: 'failed', message: 'File is required' });
    }

    const filename = req.file.filename;
    const id = `doc-${Date.now()}`;

    // Insert ke tabel documents
    await db.query('INSERT INTO documents (id, filename) VALUES ($1, $2)', [id, filename]);

    return res.status(201).json({
      status: 'success',
      data: {
        file: filename,
        id: id,
        documentId: id
      }
    });
  } catch (err) {
    next(err);
  }
};

const getAllDocuments = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM documents');
    return res.status(200).json({
      status: 'success',
      data: {
        documents: result.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Document not found' });
    }
    return res.status(200).json({
      status: 'success',
      data: {
        document: result.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, getAllDocuments, getDocumentById };