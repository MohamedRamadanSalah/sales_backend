const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/tokenBlacklist');

// ─── Authenticate: Verify JWT Token ───
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const isArabic = req.language === 'ar';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: isArabic ? 'يرجى تسجيل الدخول أولاً' : 'Authentication required. Please login first.'
        });
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been revoked (logout / password change)
    if (isBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            error: isArabic ? 'تم تسجيل الخروج. يرجى تسجيل الدخول مجدداً' : 'Token has been revoked. Please login again.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role }
        req.token = token;  // Store raw token for logout blacklisting
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: isArabic ? 'الجلسة انتهت، يرجى تسجيل الدخول مجدداً' : 'Session expired. Please login again.'
        });
    }
};

// ─── Authorize: Check user role ───
const authorize = (...roles) => {
    return (req, res, next) => {
        const isArabic = req.language === 'ar';

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: isArabic ? 'ليس لديك صلاحية للقيام بهذا الإجراء' : 'You do not have permission to perform this action.'
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
