const express = require('express');
const router = express.Router();
const { applyJob, getJobApplications, updateApplicationStatus, getMySubmissions } = require('../controllers/applicationController');
const { protect, verifiedOnly } = require('../middleware/authMiddleware');

// CORRECTION : routes fixes AVANT les routes dynamiques
// CORRECTION : verifiedOnly sur applyJob via middleware au lieu du check dans le contrôleur
router.post('/',                  protect, verifiedOnly, applyJob);
router.get('/my/submissions',     protect, getMySubmissions);
router.get('/job/:jobId',         protect, getJobApplications);
router.put('/:id',                protect, updateApplicationStatus);

module.exports = router;
