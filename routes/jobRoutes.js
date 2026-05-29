const express = require('express');
const router = express.Router();
const { createJob, getJobs, getJobById, getMyOffers } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getJobs);
router.post('/', protect, createJob);
// IMPORTANT : /my/offers doit être déclaré AVANT /:id
// sinon Express interprète "my" comme un ID MongoDB (CastError)
router.get('/my/offers', protect, getMyOffers);
router.get('/:id', getJobById);

module.exports = router;
