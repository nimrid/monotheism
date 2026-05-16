// Shared database pool — import this in every route file
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

if (process.env.DATABASE_URL) {
  console.log('✓ DATABASE_URL found in environment');
} else {
  console.error('✗ DATABASE_URL not found! Check your .env file');
}

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = pool;
