const express = require('express');
const { authenticate } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

/**
 * All notifications routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/notifications
 * List current user's notifications with pagination and unread filter
 */
router.get('/', notificationController.listNotifications);

/**
 * GET /api/notifications/count
 * Get unread notification count (for bell icon badge)
 */
router.get('/count', notificationController.getUnreadCount);

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
