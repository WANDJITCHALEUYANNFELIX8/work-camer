const express = require('express');
const router = express.Router();
const { createJob, getJobs, getJobById, getMyOffers } = require('../controllers/jobController');
const { protect, verifiedOnly } = require('../middleware/authMiddleware');

router.get('/', getJobs);
// CORRECTION : routes fixes AVANT les routes dynamiques pour éviter le conflit /my/offers vs /:id
// CORRECTION : utilisation du middleware verifiedOnly au lieu du check dupliqué dans le contrôleur
router.get('/my/offers', protect, getMyOffers);
router.post('/', protect, verifiedOnly, createJob);
router.get('/:id', getJobById);

module.exports = router;
