const { pool } = require('../db');
const logger = require('../utils/logger');

/**
 * Create a notification in the database
 * @param {number} userId - recipient user ID
 * @param {string} eventType - type of event (property_approved, order_accepted, etc.)
 * @param {object} messages - { ar: '...', en: '...' } for title and message
 * @param {string} referenceType - 'property', 'order', etc.
 * @param {number} referenceId - ID of the referenced entity
 */
async function createNotification(userId, eventType, messages, referenceType, referenceId) {
  try {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO notifications (
          user_id, event_type, 
          title_ar, title_en, 
          message_ar, message_en,
          reference_type, reference_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const result = await client.query(query, [
        userId,
        eventType,
        messages.title_ar,
        messages.title_en,
        messages.message_ar,
        messages.message_en,
        referenceType || null,
        referenceId || null,
      ]);

      logger.info(`Notification created for user ${userId}`, {
        eventType,
        referenceType,
        referenceId,
      });

      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating notification', { error: error.message, userId, eventType });
    throw error;
  }
}

module.exports = {
  createNotification,
};
