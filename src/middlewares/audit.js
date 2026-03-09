/**
 * Audit Trail Middleware
 * Logs significant user actions to the audit_logs table
 */
const { pool } = require('../db');
const logger = require('../utils/logger');

const logAudit = async (userId, action, entity, entityId, details = null, ip = null) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
        );
    } catch (err) {
        // Don't let audit logging failures break the app
        logger.error('Audit log failed', { error: err.message, action, entity, entityId });
    }
};

/**
 * Express middleware that attaches audit helper to req
 */
const auditMiddleware = (req, res, next) => {
    const ip = req.ip || (req.socket && req.socket.remoteAddress);
    req.audit = (action, entity, entityId, details) => {
        const userId = req.user ? req.user.id : null;
        return logAudit(userId, action, entity, entityId, details, ip);
    };
    next();
};

module.exports = { auditMiddleware, logAudit };
