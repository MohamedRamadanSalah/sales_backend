const { Client } = require('pg');
const fs = require('fs');

const sql = fs.readFileSync('./migrations/003_unique_invoice_per_order.sql', 'utf8');
const DATABASE_URL = "postgresql://neondb_owner:npg_PGs6EkReWYa5@ep-old-king-ai573g0v-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

c.connect()
  .then(() => c.query(sql))
  .then(() => {
    console.log('✅ Migration 003 applied: UNIQUE constraint on invoices.order_id');
    return c.end();
  })
  .catch(e => {
    // If constraint already exists, that's fine
    if (e.message.includes('already exists')) {
      console.log('ℹ️  Constraint already exists — skipping');
    } else {
      console.error('❌ Migration failed:', e.message);
    }
    c.end();
    process.exit(0);
  });
