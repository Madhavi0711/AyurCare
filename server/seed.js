/**
 * seed.js — run once to set up schema + default users
 * Usage: node server/seed.js
 */
const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    // ── Create tables if they don't exist ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(20)  NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS prakriti_results (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers       JSONB,
        vata_score    INTEGER NOT NULL DEFAULT 0,
        pitta_score   INTEGER NOT NULL DEFAULT 0,
        kapha_score   INTEGER NOT NULL DEFAULT 0,
        dominant_type VARCHAR(30) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
        approved_by   INTEGER REFERENCES users(id),
        approved_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Add membership_type to users if missing ───────────────────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS
        membership_type VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (membership_type IN ('free','paid'));
    `);

    // ── Add membership_tier to users if missing ────────────────────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS
        membership_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free','gold','platinum'));
    `);

    // ── Content table ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS content (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        type        VARCHAR(20)  NOT NULL CHECK (type IN ('video','notes','diet')),
        file_url    VARCHAR(500) NOT NULL,
        description TEXT,
        created_by  INTEGER REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Yoga plans table ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS yoga_plans (
        id              SERIAL PRIMARY KEY,
        course_name     VARCHAR(255) NOT NULL,
        description     TEXT,
        duration        VARCHAR(100),
        cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
        target_audience VARCHAR(255),
        includes        TEXT,
        created_by      INTEGER REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_name      VARCHAR(100) NOT NULL,
        valid_from     DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_until    DATE NOT NULL,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message    TEXT NOT NULL,
        is_read    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS yoga_sessions (
        id             SERIAL PRIMARY KEY,
        title          VARCHAR(255) NOT NULL,
        category       VARCHAR(100) NOT NULL,
        description    TEXT,
        video_link     VARCHAR(500),
        therapist_name VARCHAR(255),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS yoga_plan_assignments (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        yoga_session_id  INTEGER NOT NULL REFERENCES yoga_sessions(id) ON DELETE CASCADE,
        progress_notes   TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS diet_recommendations (
        id                SERIAL PRIMARY KEY,
        prakriti_type     VARCHAR(30) NOT NULL,
        recommended_foods TEXT,
        avoid_foods       TEXT,
        lifestyle_tips    TEXT,
        customized_for    INTEGER REFERENCES users(id),
        customized_by     INTEGER REFERENCES users(id),
        customized_at     TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_goals (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goals      JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        age            INTEGER,
        height_cm      NUMERIC(5,1),
        weight_kg      NUMERIC(5,1),
        health_issues  TEXT,
        complaints     TEXT,
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id                    SERIAL PRIMARY KEY,
        user_id               INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dark_mode             BOOLEAN NOT NULL DEFAULT FALSE,
        notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✓ Tables ready');

    // ── Seed default users ─────────────────────────────────────────────────
    const adminHash    = await bcrypt.hash('admin123', 10);
    const clientHash   = await bcrypt.hash('client123', 10);
    const goldHash     = await bcrypt.hash('gold123', 10);
    const platHash     = await bcrypt.hash('plat123', 10);

    await client.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ('Admin', 'admin@ayurcare.com', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name;
    `, [adminHash]);

    // Free user (default)
    await client.query(`
      INSERT INTO users (name, email, password, role, membership_type, membership_tier)
      VALUES ('Demo Client', 'client@ayurcare.com', $1, 'client', 'free', 'free')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, membership_type = EXCLUDED.membership_type, membership_tier = EXCLUDED.membership_tier;
    `, [clientHash]);

    // Gold user
    await client.query(`
      INSERT INTO users (name, email, password, role, membership_type, membership_tier)
      VALUES ('Gold User', 'gold@ayurcare.com', $1, 'client', 'paid', 'gold')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, membership_type = EXCLUDED.membership_type, membership_tier = EXCLUDED.membership_tier;
    `, [goldHash]);

    // Platinum user
    await client.query(`
      INSERT INTO users (name, email, password, role, membership_type, membership_tier)
      VALUES ('Platinum User', 'platinum@ayurcare.com', $1, 'client', 'paid', 'platinum')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, membership_type = EXCLUDED.membership_type, membership_tier = EXCLUDED.membership_tier;
    `, [platHash]);

    console.log('✓ Default users seeded');
    console.log('');
    console.log('  Admin    → admin@ayurcare.com     / admin123');
    console.log('  Free     → client@ayurcare.com    / client123');
    console.log('  Gold     → gold@ayurcare.com      / gold123');
    console.log('  Platinum → platinum@ayurcare.com  / plat123');
    console.log('');
    console.log('Done. Run: node server/server.js');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
