const multer = require('multer');
const path = require('path');

// 1. Tentukan lokasi simpan dan nama file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads')); // File disimpan di folder uploads/ root proyek
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Format nama file: dokumen-waktu.pdf
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filter cuma boleh PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diperbolehkan!'), false);
  }
};

// 3. Bungkus semua aturan (Maksimal 1MB)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1 MB dalam satuan bytes
  },
  fileFilter: fileFilter
});

module.exports = upload;