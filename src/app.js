require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Utilities
const validateEnv = require('./utils/validateEnv');
const logger = require('./utils/logger');
const { pool } = require('./db');

// Validate environment on startup
validateEnv();

// Middlewares
const i18nMiddleware = require('./middlewares/i18n');
const errorHandler = require('./middlewares/errorHandler');
const sanitize = require('./middlewares/sanitize');
const { apiLimiter, authLimiter, strictLimiter } = require('./middlewares/rateLimiter');
const { auditMiddleware } = require('./middlewares/audit');

// Routes
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const orderRoutes = require('./routes/orderRoutes');
const imageRoutes = require('./routes/imageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ─── Security Headers ───
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow image loading from other origins
    contentSecurityPolicy: false, // Disable CSP so frontend on different port can fetch
}));

// ─── CORS ───
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['*'];

const isWildcardOrigin = allowedOrigins.length === 1 && allowedOrigins[0] === '*';

app.use(cors({
    // When wildcard '*', use `true` to reflect the requesting origin.
    // This is spec-compliant with credentials: true (wildcard '*' is NOT).
    origin: isWildcardOrigin ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    credentials: true,
}));

// ─── Request Logging ───
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(express.json({ limit: '10mb' }));

// Serve uploaded images as static files (local dev only)
if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Apply global middleware
app.use(i18nMiddleware);
app.use(sanitize);
app.use(auditMiddleware);

// ─── Health Route (with DB connectivity check) ───
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW()');
        res.json({
            status: 'ok',
            language_used: req.language,
            database: 'connected',
            server_time: dbResult.rows[0].now,
            uptime: process.uptime(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            language_used: req.language,
            database: 'disconnected',
            error: 'Database connection failed',
        });
    }
});

// ─── App Routes with Rate Limiting ───
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/locations', apiLimiter, locationRoutes);
app.use('/api/properties', apiLimiter, propertyRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/favorites', apiLimiter, favoritesRoutes);
app.use('/api/properties', apiLimiter, imageRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/admin/analytics', apiLimiter, analyticsRoutes);

// ─── Password Reset (stricter rate limit) ───
const passwordResetController = require('./controllers/passwordResetController');
app.post('/api/auth/forgot-password', strictLimiter, passwordResetController.forgotPassword);
app.post('/api/auth/reset-password', strictLimiter, passwordResetController.resetPassword);

// ─── Global Error Handler ───
app.use(errorHandler);

logger.info('Application initialized', {
    routes: [
        '/api/auth', '/api/locations', '/api/properties', '/api/orders',
        '/api/favorites', '/api/notifications', '/api/admin/analytics'
    ]
});

module.exports = app;
