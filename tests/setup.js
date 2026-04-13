// Jest globalSetup — runs once before all test suites
// Connects to test DB, drops and recreates all tables from schema.sql
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

module.exports = async function globalSetup() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.TEST_DB_NAME || 'ayurcare_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  const schema = fs.readFileSync(path.join(__dirname, '../server/schema.sql'), 'utf8');

  try {
    // Drop all tables and recreate
    await pool.query(`
      DROP TABLE IF EXISTS yoga_plan_assignments, notifications, diet_recommendations,
        followups, yoga_sessions, prakriti_results, subscriptions, users CASCADE
    `);
    await pool.query(schema);
  } finally {
    await pool.end();
  }
};
