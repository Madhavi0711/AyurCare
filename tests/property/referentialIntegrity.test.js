// Feature: ayurvedic-health-platform, Property 34: Referential integrity prevents orphan records

const fc = require('fast-check');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

/**
 * Validates: Requirements 15.4
 *
 * Property 34: Referential integrity prevents orphan records
 * Attempt inserts into child tables with non-existent user_id values;
 * assert DB rejects with FK violation.
 */

beforeAll(async () => {
  const schema = fs.readFileSync(
    path.join(__dirname, '../../server/schema.sql'),
    'utf8'
  );
  await pool.query(schema);
});

afterAll(async () => {
  await pool.end();
});

describe('Property 34: Referential integrity prevents orphan records', () => {
  // Helper: pick a user_id that definitely does not exist
  async function nonExistentUserId(base) {
    // Use a very large number unlikely to collide; ensure it's absent
    const id = 1_000_000 + Math.abs(base);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return id;
  }

  test('prakriti_results rejects insert with non-existent user_id', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (base) => {
        const userId = await nonExistentUserId(base);
        await expect(
          query(
            `INSERT INTO prakriti_results
               (user_id, vata_score, pitta_score, kapha_score, dominant_type)
             VALUES ($1, 10, 10, 10, 'vata')`,
            [userId]
          )
        ).rejects.toThrow();
      }),
      { numRuns: 10 }
    );
  });

  test('notifications rejects insert with non-existent user_id', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (base) => {
        const userId = await nonExistentUserId(base);
        await expect(
          query(
            `INSERT INTO notifications (user_id, message) VALUES ($1, 'test')`,
            [userId]
          )
        ).rejects.toThrow();
      }),
      { numRuns: 10 }
    );
  });

  test('diet_recommendations rejects insert with non-existent customized_for user_id', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (base) => {
        const userId = await nonExistentUserId(base);
        await expect(
          query(
            `INSERT INTO diet_recommendations
               (prakriti_type, recommended_foods, avoid_foods, customized_for)
             VALUES ('vata', 'rice', 'spicy', $1)`,
            [userId]
          )
        ).rejects.toThrow();
      }),
      { numRuns: 10 }
    );
  });

  test('yoga_plan_assignments rejects insert with non-existent user_id', async () => {
    // First create a real yoga session to satisfy the other FK
    const sessionRes = await query(
      `INSERT INTO yoga_sessions (title, category) VALUES ('Test', 'general') RETURNING id`
    );
    const sessionId = sessionRes.rows[0].id;

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (base) => {
        const userId = await nonExistentUserId(base);
        await expect(
          query(
            `INSERT INTO yoga_plan_assignments (user_id, yoga_session_id) VALUES ($1, $2)`,
            [userId, sessionId]
          )
        ).rejects.toThrow();
      }),
      { numRuns: 10 }
    );

    // Cleanup
    await query('DELETE FROM yoga_sessions WHERE id = $1', [sessionId]);
  });

  test('followups rejects insert with non-existent user_id', async () => {
    // Need a real user for created_by
    const userRes = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Creator', 'creator_fk_test@example.com', 'hash', 'admin')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const creatorId = userRes.rows[0].id;

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (base) => {
        const userId = await nonExistentUserId(base);
        await expect(
          query(
            `INSERT INTO followups (user_id, scheduled_date, created_by)
             VALUES ($1, NOW(), $2)`,
            [userId, creatorId]
          )
        ).rejects.toThrow();
      }),
      { numRuns: 10 }
    );

    // Cleanup
    await query('DELETE FROM users WHERE id = $1', [creatorId]);
  });
});
