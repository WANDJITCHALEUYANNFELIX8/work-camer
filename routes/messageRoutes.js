const express = require('express');
const router = express.Router();
const { getConversationHistory, getActiveChats } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// Toutes les routes de messagerie nécessitent d'être connecté
router.use(protect);

// IMPORTANT : /active/chats doit être déclaré AVANT /:userId
router.get('/active/chats', getActiveChats);
router.get('/:userId', getConversationHistory);

module.exports = router;
