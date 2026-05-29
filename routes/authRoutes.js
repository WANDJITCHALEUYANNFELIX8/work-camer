const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, verifyCNI, getMe, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rate limiting strict sur les routes d'authentification publiques
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-cni', protect, verifyCNI);
router.get('/me', protect, getMe);
router.get('/profile/:userId', protect, getUserProfile);

module.exports = router;
