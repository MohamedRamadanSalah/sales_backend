require('dotenv').config();
const { pool } = require('./src/db');

async function checkProperties() {
  try {
    console.log('Checking property statuses...');
    const res = await pool.query("SELECT status, COUNT(*) FROM properties WHERE deleted_at IS NULL GROUP BY status");
    console.log('Status counts:', res.rows);
    
    // Check if any properties exist at all
    const total = await pool.query("SELECT COUNT(*) FROM properties");
    console.log('Total properties:', total.rows[0].count);
    
    // Check categories and locations to see if JOIN might fail
    const unmappedCategories = await pool.query("SELECT COUNT(*) FROM properties p LEFT JOIN categories c ON p.category_id = c.id WHERE c.id IS NULL");
    console.log('Properties with missing categories:', unmappedCategories.rows[0].count);
    
    const unmappedLocations = await pool.query("SELECT COUNT(*) FROM properties p LEFT JOIN locations l ON p.location_id = l.id WHERE l.id IS NULL");
    console.log('Properties with missing locations:', unmappedLocations.rows[0].count);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkProperties();
