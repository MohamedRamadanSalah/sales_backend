/**
 * Structured Logger
 * JSON in production, colored text in development
 */
const isDev = process.env.NODE_ENV !== 'production';

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    green: '\x1b[32m',
};

const formatTimestamp = () => new Date().toISOString();

const log = (level, message, meta = {}) => {
    const entry = {
        timestamp: formatTimestamp(),
        level,
        message,
        ...meta,
    };

    if (isDev) {
        const colorMap = { error: colors.red, warn: colors.yellow, info: colors.blue, debug: colors.gray };
        const color = colorMap[level] || colors.reset;
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        console.log(`${colors.gray}[${entry.timestamp}]${colors.reset} ${color}${level.toUpperCase()}${colors.reset} ${message}${metaStr}`);
    } else {
        console.log(JSON.stringify(entry));
    }
};

const logger = {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    debug: (message, meta) => log('debug', message, meta),
};

module.exports = logger;
