// Helper factories for property tests
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'ayurcare_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function query(sql, params) {
  return pool.query(sql, params);
}

// Truncate all tables (call in beforeEach)
async function truncateAll() {
  await pool.query(`
    TRUNCATE TABLE yoga_plan_assignments, notifications, diet_recommendations,
      followups, yoga_sessions, prakriti_results, subscriptions, users
    RESTART IDENTITY CASCADE
  `);
}

// Create a test user with hashed password
async function createTestUser(role = 'client', overrides = {}) {
  const name = overrides.name || `Test ${role} ${Date.now()}`;
  const email = overrides.email || `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const plainPassword = overrides.password || 'TestPass123!';
  const hash = await bcrypt.hash(plainPassword, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, email, hash, role]
  );
  return { ...result.rows[0], plainPassword };
}

// Create an authenticated supertest session (returns agent with session cookie)
async function createTestSession(app, user) {
  const request = require('supertest');
  const agent = request.agent(app);
  await agent.post('/api/login').send({ email: user.email, password: user.plainPassword });
  return agent;
}

// Seed N notifications for a user
async function seedNotifications(userId, count, overrides = {}) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, message, is_read) VALUES ($1, $2, $3) RETURNING *`,
      [userId, overrides.message || `Test notification ${i + 1}`, overrides.is_read || false]
    );
    rows.push(result.rows[0]);
  }
  return rows;
}

// Seed a prakriti result for a user
async function seedPrakritiResult(userId, status = 'pending', overrides = {}) {
  const vata = overrides.vata_score || 10;
  const pitta = overrides.pitta_score || 8;
  const kapha = overrides.kapha_score || 6;
  const dominant_type =
    vata >= pitta && vata >= kapha ? 'vata' : pitta >= kapha ? 'pitta' : 'kapha';
  const result = await pool.query(
    `INSERT INTO prakriti_results (user_id, vata_score, pitta_score, kapha_score, dominant_type, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, vata, pitta, kapha, overrides.dominant_type || dominant_type, status]
  );
  return result.rows[0];
}

module.exports = { pool, query, truncateAll, createTestUser, createTestSession, seedNotifications, seedPrakritiResult };
