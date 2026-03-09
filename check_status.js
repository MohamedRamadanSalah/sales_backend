require('dotenv').config();
const { pool } = require('./src/db');
pool.query("SELECT id, status FROM properties LIMIT 10")
    .then(r => { r.rows.forEach(p => console.log(p)); pool.end(); })
    .catch(e => { console.error(e); pool.end(); });
