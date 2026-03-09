require('dotenv').config();
const { pool } = require('./src/db');
pool.query("UPDATE properties SET deleted_at = NULL WHERE deleted_at IS NOT NULL RETURNING id, title_ar, status, deleted_at")
    .then(r => { console.log('Restored', r.rows.length, 'properties'); r.rows.forEach(p => console.log(p)); pool.end(); })
    .catch(e => { console.error(e); pool.end(); });
