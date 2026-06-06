const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const job = require('../controllers/jobController');
const company = require('../controllers/companyController');
const category = require('../controllers/categoryController');
const api = require('../controllers/apiController');

const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/users', auth.register);
router.post('/authentications', auth.login);
router.get('/users/:id', auth.getUserById);

router.post('/companies', authMiddleware, company.createCompany);
router.get('/companies', company.getAllCompanies);
router.get('/companies/:id', company.getCompanyById);
router.put('/companies/:id', authMiddleware, company.updateCompany);
router.delete('/companies/:id', authMiddleware, company.deleteCompany);

router.post('/categories', authMiddleware, category.createCategory);
router.get('/categories', category.getAllCategories);
router.get('/categories/:id', category.getCategoryById);
router.put('/categories/:id', authMiddleware, category.updateCategory);
router.delete('/categories/:id', authMiddleware, category.deleteCategory);

router.post('/jobs', authMiddleware, job.createJob);
router.get('/jobs', job.getAllJobs);
router.get('/jobs/:id', job.getJobById);
router.put('/jobs/:id', authMiddleware, job.updateJob);
router.delete('/jobs/:id', authMiddleware, job.deleteJob);

router.post('/applications', authMiddleware, job.applyJob);
router.get('/applications', job.getAllApplications);
router.get('/applications/:id', job.getApplicationById);

router.get('/profile', authMiddleware, api.getProfile);
router.post('/jobs/:id/bookmark', authMiddleware, job.addBookmark);
router.get('/bookmarks', authMiddleware, api.getBookmarks);

module.exports = router;