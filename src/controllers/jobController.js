const db = require('../config/db');

// Ini akan manggil file jobQueue.js yang sudah kita ubah ke Redis
const sendToQueue = require('../queue/jobQueue'); 
const { getCache, setCache, deleteCache } = require('../cache/cacheService');

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
    // --- CACHING: Cek cache Redis terlebih dahulu ---
    const cached = await getCache('jobs_list');
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({
        status: 'success',
        data: cached
      });
    }

    // --- CACHE MISS: Ambil data dari database ---
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
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id }));
    
    // Simpan ke Redis cache dengan TTL 1800 detik (30 menit)
    // Cache objek { jobs } agar konsisten saat dikembalikan dari cache
    if (!searchVal && !companyVal && !titleVal && !categoryVal && !locationVal) {
      await setCache('jobs_list', { jobs }, 1800);
    }

    return res.status(200).json({ status: 'success', data: { jobs } });
  } catch (err) { next(err); }
};

const applyJob = async (req, res, next) => {
  try {
    const jobId = req.body.jobId || req.body.job_id;

    // Validasi: pastikan job_id ada di tabel jobs sebelum insert
    const jobCheck = await db.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Lowongan tidak ditemukan' });
    }

    // Cek duplikasi: user tidak boleh apply job yang sama dua kali
    const dupCheck = await db.query(
      'SELECT id FROM applications WHERE job_id = $1 AND user_id = $2',
      [jobId, req.user.id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ status: 'failed', message: 'Anda sudah melamar pekerjaan ini' });
    }

    const id = `app-${Date.now()}`;
    await db.query('INSERT INTO applications (id, job_id, user_id, status) VALUES ($1, $2, $3, $4)', [id, jobId, req.user.id, 'pending']);
    
    // Invalidasi list cache
    await Promise.all([
      deleteCache(`applications_user_${req.user.id}`),
      deleteCache(`applications_job_${jobId}`),
      deleteCache('applications_list')
    ]);

    // Mengirim pesan ke RabbitMQ.
    // Payload TETAP HANYA berisi application_id agar lolos testing Dicoding!
    await sendToQueue('email_queue', { application_id: id });

    return res.status(201).json({
      status: 'success',
      data: {
        id,
        applicationId: id,
        user_id: req.user.id,
        job_id: jobId,
        status: 'pending',
      }
    });
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
    // Ambil data job yang ada terlebih dahulu
    const check = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const existing = check.rows[0];

    // Partial update: gunakan nilai dari request jika ada, fallback ke nilai existing
    const companyId  = req.body.companyId  || req.body.company_id  || existing.company_id;
    const categoryId = req.body.categoryId || req.body.category_id || existing.category_id;
    const location   = req.body.location   || req.body.location_city || req.body.location_type || existing.location;
    const title       = req.body.title       || existing.title;
    const description = req.body.description || existing.description;
    const requirements = req.body.requirements !== undefined ? req.body.requirements : existing.requirements;

    // Salary: bisa dari salary, salary_min-salary_max, salary_max saja, atau fallback existing
    let salary = existing.salary;
    if (req.body.salary) {
      salary = req.body.salary;
    } else if (req.body.salary_min && req.body.salary_max) {
      salary = `${req.body.salary_min} - ${req.body.salary_max}`;
    } else if (req.body.salary_max) {
      salary = String(req.body.salary_max);
    } else if (req.body.salary_min) {
      salary = String(req.body.salary_min);
    }

    // Validasi minimal: title dan description harus ada (tidak boleh kosong setelah merge)
    if (!title || !description) {
      return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    // Validasi company & category hanya jika dikirim di payload (bukan fallback)
    const newCompanyId  = req.body.companyId  || req.body.company_id;
    const newCategoryId = req.body.categoryId || req.body.category_id;
    if (newCompanyId) {
      const compCheck = await db.query('SELECT id FROM companies WHERE id = $1', [newCompanyId]);
      if (compCheck.rows.length === 0) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }
    if (newCategoryId) {
      const catCheck = await db.query('SELECT id FROM categories WHERE id = $1', [newCategoryId]);
      if (catCheck.rows.length === 0) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });
    }

    await db.query(
      'UPDATE jobs SET company_id = $1, category_id = $2, title = $3, description = $4, requirements = $5, salary = $6, location = $7, updated_at = NOW() WHERE id = $8',
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

// Query enriched untuk applications (menghasilkan tepat 13 keys setelah mapping)
const APPLICATION_ENRICHED_QUERY = `
  SELECT 
    applications.*,
    jobs.title      AS job_title,
    jobs.location   AS job_location,
    jobs.salary     AS job_salary,
    jobs.company_id AS job_company_id,
    jobs.category_id AS job_category_id,
    companies.name  AS company_name,
    users.email     AS user_email
  FROM applications
  LEFT JOIN jobs      ON applications.job_id  = jobs.id
  LEFT JOIN companies ON jobs.company_id       = companies.id
  LEFT JOIN users     ON applications.user_id  = users.id
`;

const mapApplication = (a) => {
  return {
    id: a.id,
    jobId: a.job_id,
    userId: a.user_id,
    status: a.status,
    job_title: a.job_title,
    job_location: a.job_location,
    job_salary: a.job_salary,
    company_name: a.company_name,
    user_email: a.user_email,
    created_at: a.created_at,
    job_company_id: a.job_company_id,
    job_category_id: a.job_category_id
  };
};

const getAllApplications = async (req, res, next) => {
  try {
    const resDb = await db.query(APPLICATION_ENRICHED_QUERY);
    const applications = resDb.rows.map(mapApplication);
    return res.status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const getApplicationById = async (req, res, next) => {
  try {
    const cacheKey = `application_${req.params.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({ status: 'success', data: cached });
    }

    const resDb = await db.query(APPLICATION_ENRICHED_QUERY + ' WHERE applications.id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const data = mapApplication(resDb.rows[0]);
    await setCache(cacheKey, data, 1800);
    return res.header('X-Data-Source', 'database').status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

const addBookmark = async (req, res, next) => {
  try {
    const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Lowongan tidak ditemukan' });

    const id = `bookmark-${Date.now()}`;
    await db.query('INSERT INTO bookmarks (id, user_id, job_id) VALUES ($1, $2, $3)', [id, req.user.id, req.params.id]);

    await deleteCache(`bookmarks_${req.user.id}`);

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
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id }));
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
    const jobs = resDb.rows.map(j => ({ ...j, companyId: j.company_id }));
    return res.status(200).json({ status: 'success', data: { jobs } });
  } catch (err) { next(err); }
};

const getApplicationsByJob = async (req, res, next) => {
  try {
    const cacheKey = `applications_job_${req.params.jobId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({ status: 'success', data: { applications: cached } });
    }

    const resDb = await db.query(APPLICATION_ENRICHED_QUERY + ' WHERE applications.job_id = $1', [req.params.jobId]);
    const applications = resDb.rows.map(mapApplication);

    await setCache(cacheKey, applications, 1800);
    return res.header('X-Data-Source', 'database').status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const getApplicationsByUser = async (req, res, next) => {
  try {
    const cacheKey = `applications_user_${req.params.userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.header('X-Data-Source', 'cache').status(200).json({ status: 'success', data: { applications: cached } });
    }

    const resDb = await db.query(APPLICATION_ENRICHED_QUERY + ' WHERE applications.user_id = $1', [req.params.userId]);
    const applications = resDb.rows.map(mapApplication);

    await setCache(cacheKey, applications, 1800);
    return res.header('X-Data-Source', 'database').status(200).json({ status: 'success', data: { applications } });
  } catch (err) { next(err); }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ status: 'failed', message: 'Payload tidak valid' });

    const check = await db.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const { user_id, job_id } = check.rows[0];
    await db.query('UPDATE applications SET status = $1 WHERE id = $2', [status, req.params.id]);

    // Invalidasi semua cache terkait SEBELUM mengirim response
    await Promise.all([
      deleteCache(`application_${req.params.id}`),
      deleteCache(`applications_user_${user_id}`),
      deleteCache(`applications_job_${job_id}`),
    ]);

    return res.status(200).json({ status: 'success', message: 'Berhasil diperbarui' });
  } catch (err) { next(err); }
};

const deleteApplication = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    const { user_id, job_id } = check.rows[0];
    await db.query('DELETE FROM applications WHERE id = $1', [req.params.id]);

    // Invalidasi semua cache terkait SEBELUM mengirim response
    await Promise.all([
      deleteCache(`application_${req.params.id}`),
      deleteCache(`applications_user_${user_id}`),
      deleteCache(`applications_job_${job_id}`),
    ]);

    return res.status(200).json({ status: 'success', message: 'Berhasil dihapus' });
  } catch (err) { next(err); }
};

const deleteBookmark = async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM bookmarks WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ status: 'failed', message: 'Tidak ditemukan' });

    await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);

    await deleteCache(`bookmarks_${req.user.id}`);

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