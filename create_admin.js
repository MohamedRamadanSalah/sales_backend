require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/db');

(async () => {
  try {
    const email = 'superadmin@misrhomes.com';
    const password = 'Admin@2026';

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Remove if exists to avoid conflict
    await pool.query('DELETE FROM users WHERE email = $1', [email]);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, preferred_language)
       VALUES ('Super', 'Admin', $1, '+201111111111', $2, 'admin', 'en')
       RETURNING id, first_name, last_name, email, role`,
      [email, hash]
    );

    console.log('✅ Admin created:', result.rows[0]);

    // Verify password works
    const user = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    const match = await bcrypt.compare(password, user.rows[0].password_hash);
    console.log('✅ Password verify:', match ? 'PASS' : 'FAIL');

    // Test login endpoint locally
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('✅ Login test:', loginData.success ? 'PASS' : 'FAIL');
    if (loginData.data?.user) {
      console.log('   User:', loginData.data.user.email, '| Role:', loginData.data.user.role);
      console.log('   Token received:', !!loginData.data.token);
      console.log('   Refresh token received:', !!loginData.data.refresh_token);
    }

    // Test profile endpoint with token
    if (loginData.data?.token) {
      const profileRes = await fetch('http://localhost:3000/api/auth/profile', {
        headers: { 'Authorization': 'Bearer ' + loginData.data.token }
      });
      const profileData = await profileRes.json();
      console.log('✅ Profile test:', profileData.success ? 'PASS' : 'FAIL');
    }

    // Test refresh token
    if (loginData.data?.refresh_token) {
      const refreshRes = await fetch('http://localhost:3000/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: loginData.data.refresh_token })
      });
      const refreshData = await refreshRes.json();
      console.log('✅ Refresh token test:', refreshData.success ? 'PASS' : 'FAIL');
    }

    // Test logout
    if (loginData.data?.token) {
      const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + loginData.data.token }
      });
      const logoutData = await logoutRes.json();
      console.log('✅ Logout test:', logoutData.success ? 'PASS' : 'FAIL');
    }

    console.log('\n========================================');
    console.log('NEW ADMIN CREDENTIALS:');
    console.log('  Email:    superadmin@misrhomes.com');
    console.log('  Password: Admin@2026');
    console.log('========================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
