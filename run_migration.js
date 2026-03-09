require('dotenv').config();
const { pool } = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Starting migration: notifications table...');
    
    const migrationSql = fs.readFileSync(
      path.join(__dirname, 'migrations/001_add_notifications_table.sql'),
      'utf8'
    );

    // Split by semicolon and filter empty statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s);

    for (const statement of statements) {
      console.log(`Running: ${statement.substring(0, 60)}...`);
      await pool.query(statement);
    }

    console.log('✅ Migration completed successfully!');
    console.log('✓ notifications table created');
    console.log('✓ Indexes created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
