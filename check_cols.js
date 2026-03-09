require('dotenv').config();
const { pool } = require('./db');

async function checkColumns() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'properties'
            ORDER BY column_name;
        `);
        console.log('Columns in PROPERTIES table:');
        res.rows.forEach(row => console.log(`- ${row.column_name}`));
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('Error connecting to DB:', err);
        process.exit(1);
    }
}

checkColumns();
