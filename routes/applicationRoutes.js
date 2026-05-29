const express = require('express');
const router = express.Router();
const { applyJob, getJobApplications, updateApplicationStatus, getMySubmissions } = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, applyJob);
router.get('/my/submissions', protect, getMySubmissions);
router.get('/job/:jobId', protect, getJobApplications);
router.put('/:id', protect, updateApplicationStatus);

module.exports = router;
