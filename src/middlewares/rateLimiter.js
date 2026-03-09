/**
 * In-memory Rate Limiter (no Redis required)
 * Tracks requests per IP address with configurable windows
 */
const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > data.windowMs) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Allow Node.js to exit even if this timer is still active (prevents Jest worker leak)
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window size in milliseconds
 */
const rateLimit = (maxRequests = 100, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}:${req.baseUrl || req.path}`;
        const now = Date.now();

        let record = rateLimitStore.get(key);

        if (!record || now - record.windowStart > windowMs) {
            record = { count: 1, windowStart: now, windowMs };
            rateLimitStore.set(key, record);
            return next();
        }

        record.count++;

        if (record.count > maxRequests) {
            const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
            res.set('Retry-After', retryAfter);
            const isArabic = req.language === 'ar';
            return res.status(429).json({
                success: false,
                error: isArabic
                    ? 'تم تجاوز الحد الأقصى للطلبات. حاول مرة أخرى لاحقاً'
                    : 'Too many requests. Please try again later.',
                retryAfter,
            });
        }

        next();
    };
};

// Pre-configured limiters
const authLimiter = rateLimit(10, 60 * 1000);     // 10 req/min for auth
const apiLimiter = rateLimit(100, 60 * 1000);      // 100 req/min general
const strictLimiter = rateLimit(5, 60 * 1000);     // 5 req/min for sensitive ops

/**
 * Clear all rate limit records (useful for testing)
 */
function clearRateLimitStore() {
    rateLimitStore.clear();
}

module.exports = { rateLimit, authLimiter, apiLimiter, strictLimiter, clearRateLimitStore };
