require('dotenv').config();
const { pool } = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runUpgrade() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'upgrade.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Database upgrade successful');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database upgrade failed:', err);
        process.exit(1);
    }
}

runUpgrade();
