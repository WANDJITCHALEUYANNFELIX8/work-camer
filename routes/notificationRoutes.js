const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, readAllNotifications, clearAllNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', readAllNotifications);
router.put('/:id/read', markAsRead);
router.delete('/', clearAllNotifications);

module.exports = router;
