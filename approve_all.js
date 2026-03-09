require('dotenv').config();
const { pool } = require('./src/db');

(async () => {
    const res = await pool.query(
        "UPDATE properties SET status = 'approved' WHERE status = 'inactive' RETURNING id, title_ar, status"
    );
    console.log('Approved', res.rows.length, 'properties:');
    res.rows.forEach(p => console.log(` - [${p.id}] ${p.title_ar} => ${p.status}`));
    await pool.end();
})();
