const express = require('express');
const router = express.Router();
const { getConversationHistory, getActiveChats } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// CORRECTION : convention uniforme — router.use(protect) pour toutes les routes du fichier
router.use(protect);

// CORRECTION : route fixe /active/chats AVANT la route dynamique /:userId
router.get('/active/chats', getActiveChats);
router.get('/:userId', getConversationHistory);

module.exports = router;
