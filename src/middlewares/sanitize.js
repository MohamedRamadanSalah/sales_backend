/**
 * Input Sanitization Middleware
 * Strips HTML tags from all string values in req.body to prevent XSS
 */
const stripTags = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
};

const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            cleaned[key] = stripTags(value);
        } else if (typeof value === 'object' && value !== null) {
            cleaned[key] = sanitizeObject(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
};

const sanitize = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};

module.exports = sanitize;
