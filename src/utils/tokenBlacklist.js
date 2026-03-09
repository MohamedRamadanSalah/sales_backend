/**
 * Token Blacklist
 * In-memory store for invalidated JWT tokens (logout/password change).
 * In production, replace with Redis for persistence across restarts and scaling.
 *
 * Usage:
 *   blacklistToken(jti, expiresInSeconds) — add a token to the blacklist
 *   isBlacklisted(jti) — check if a token has been revoked
 */

const blacklist = new Map();

// Clean up expired blacklist entries every 10 minutes
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of blacklist.entries()) {
        if (now >= expiresAt) {
            blacklist.delete(token);
        }
    }
}, 10 * 60 * 1000);

if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Add a token to the blacklist
 * @param {string} token - The JWT token string (or its jti)
 * @param {number} expiresInMs - Time in ms until the token naturally expires
 */
function blacklistToken(token, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
    blacklist.set(token, Date.now() + expiresInMs);
}

/**
 * Check if a token is blacklisted
 * @param {string} token - The JWT token string (or its jti)
 * @returns {boolean}
 */
function isBlacklisted(token) {
    if (!blacklist.has(token)) return false;
    // Auto-clean if expired
    if (Date.now() >= blacklist.get(token)) {
        blacklist.delete(token);
        return false;
    }
    return true;
}

/**
 * Clear all blacklisted tokens (useful for testing)
 */
function clearBlacklist() {
    blacklist.clear();
}

module.exports = { blacklistToken, isBlacklisted, clearBlacklist };
