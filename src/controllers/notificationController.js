const { pool } = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/notifications
 * List current user's notifications
 */
exports.listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const unread_only = req.query.unread_only;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (unread_only === 'true' || unread_only === true) {
      query += ' AND is_read = FALSE';
      countQuery += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';

    const [notificationsResult, countResult] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const pages = Math.ceil(total / limit);

    res.json({
      notifications: notificationsResult.rows,
      unread_count: await getUnreadCount(userId),
      pagination: { page, limit, total, pages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/count
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);
    res.json({ unread_count: count });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [notificationId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Get unread count for a user
 */
async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('Error getting unread count', { userId, error: error.message });
    return 0;
  }
}
