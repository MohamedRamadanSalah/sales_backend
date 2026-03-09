// tests/setup.js
require('dotenv').config();
const { pool } = require('../src/db');
const bcrypt = require('bcryptjs');
const { clearRateLimitStore } = require('../src/middlewares/rateLimiter');
const { clearBlacklist } = require('../src/utils/tokenBlacklist');

// Reset rate limits before each test suite to prevent cross-suite interference
beforeEach(() => {
    clearRateLimitStore();
});

// Run this ONCE before all tests begin
beforeAll(async () => {
    // Clear rate limits at start
    clearRateLimitStore();
    clearBlacklist();

    // Ensure admin user exists for tests that depend on it
    const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'admin@realestate.com'");
    if (adminCheck.rows.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query(
            `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, preferred_language)
             VALUES ('Admin', 'System', 'admin@realestate.com', '+201000000000', $1, 'admin', 'ar')`,
            [hash]
        );
    }
});

// Run this ONCE after all tests finish
afterAll(async () => {
    // Close the database connection pool so Jest can exit cleanly
    await pool.end();
});
