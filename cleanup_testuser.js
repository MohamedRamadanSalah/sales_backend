require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/db');

(async () => {
  try {
    // Re-create superadmin with a non-conflicting phone number
    const exists = await pool.query("SELECT id FROM users WHERE email='superadmin@misrhomes.com'");
    if (exists.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Admin@2026', salt);
      await pool.query(
        `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, preferred_language)
         VALUES ('Super', 'Admin', 'superadmin@misrhomes.com', '+201099999999', $1, 'admin', 'ar')`,
        [hash]
      );
      console.log('Re-created superadmin with phone +201099999999');
    } else {
      console.log('Superadmin already exists.');
    }
  } catch (e) {
    console.error(e.message);
  }
  await pool.end();
})();
