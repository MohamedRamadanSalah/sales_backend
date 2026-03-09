const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PGs6EkReWYa5@ep-old-king-ai573g0v-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function approveAll() {
  try {
    const before = await pool.query("SELECT status, COUNT(*) FROM properties WHERE deleted_at IS NULL GROUP BY status");
    console.log('BEFORE:', before.rows);

    const result = await pool.query(
      "UPDATE properties SET status = 'approved', updated_at = NOW() WHERE status = 'pending_approval' AND deleted_at IS NULL RETURNING id, title_ar"
    );
    console.log('\nApproved ' + result.rowCount + ' properties:');
    result.rows.forEach(p => console.log('  - ID ' + p.id + ': ' + p.title_ar));

    const after = await pool.query("SELECT status, COUNT(*) FROM properties WHERE deleted_at IS NULL GROUP BY status");
    console.log('\nAFTER:', after.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

approveAll();
