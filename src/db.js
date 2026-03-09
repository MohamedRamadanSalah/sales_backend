const { Pool } = require('pg');

// Support cloud DATABASE_URL or individual connection params
const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

const poolConfig = connectionString
    ? {
        connectionString,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: isTest
            ? (process.env.DB_NAME_TEST || 'real_estate_db')
            : (process.env.DB_NAME || 'real_estate_db'),
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

module.exports = { pool };
