const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.message, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.id : null,
    });

    const isArabic = req.language === 'ar';

    if (process.env.NODE_ENV === 'test') {
        logger.debug('TEST ERROR', { stack: err.stack });
    }

    let statusCode = 500;
    let message = isArabic ? 'حدث خطأ داخلي في الخادم' : 'Internal Server Error';

    // Explicit throw errors take precedence
    if (err.statusCode) {
        statusCode = err.statusCode;
        message = isArabic && err.message_ar ? err.message_ar : err.message;
    }
    // Joi Validation Errors
    else if (err.isJoi) {
        statusCode = 400;
        message = err.details.map(detail => detail.message).join(', ');
    }

    res.status(statusCode).json({
        success: false,
        error: message,
    });
};

module.exports = errorHandler;
