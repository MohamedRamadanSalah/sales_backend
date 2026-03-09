/**
 * Environment Variable Validation
 * Call on startup to fail fast if required vars are missing
 */
const requiredVars = [
    'DB_USER',
    'DB_PASSWORD',
    'DB_PORT',
    'JWT_SECRET',
];

const validateEnv = () => {
    // Skip DB_* checks if DATABASE_URL is provided (cloud database)
    const hasConnectionString = !!process.env.DATABASE_URL || !!process.env.DATABASE_URL_TEST;
    const effectiveRequired = hasConnectionString
        ? requiredVars.filter(v => !v.startsWith('DB_'))
        : requiredVars;

    const missing = effectiveRequired.filter(v => !process.env[v]);
    if (missing.length > 0) {
        // Warn but never crash — crashing kills serverless functions
        console.warn('⚠️  Missing environment variables:', missing.join(', '));
    }

    // Warnings only — never crash in production over optional config
    if (!process.env.JWT_EXPIRES_IN) {
        console.warn('⚠️  JWT_EXPIRES_IN not set, defaulting to 7d');
    }
    if (!process.env.CORS_ORIGIN && process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  CORS_ORIGIN not set, allowing all origins');
    }
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  SMTP settings not configured. Password reset emails will be logged to console.');
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change_in_production')) {
        console.warn('⚠️  WARNING: You are using the default JWT_SECRET. Please set a strong secret.');
    }
};

module.exports = validateEnv;
