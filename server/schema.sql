-- AYURCARE Database Schema

CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    password         VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL CHECK (role IN ('client', 'admin')),
    membership_type  VARCHAR(20)  NOT NULL DEFAULT 'free' CHECK (membership_type IN ('free', 'paid')),
    membership_tier  VARCHAR(20)  NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'gold', 'platinum')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prakriti_results (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers        JSONB,
    vata_score     INTEGER NOT NULL,
    pitta_score    INTEGER NOT NULL,
    kapha_score    INTEGER NOT NULL,
    dominant_type  VARCHAR(30) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    approved_by    INTEGER REFERENCES users(id),
    approved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yoga_sessions (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    video_link      VARCHAR(500),
    therapist_name  VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followups (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date  DATE NOT NULL,
    notes           TEXT,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_recommendations (
    id                SERIAL PRIMARY KEY,
    prakriti_type     VARCHAR(20) NOT NULL CHECK (prakriti_type IN ('vata', 'pitta', 'kapha')),
    recommended_foods TEXT NOT NULL,
    avoid_foods       TEXT NOT NULL,
    lifestyle_tips    TEXT,
    customized_for    INTEGER REFERENCES users(id),
    customized_by     INTEGER REFERENCES users(id),
    customized_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yoga_plan_assignments (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    yoga_session_id INTEGER NOT NULL REFERENCES yoga_sessions(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress_notes  TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name      VARCHAR(255) NOT NULL,
    valid_from     DATE NOT NULL,
    valid_until    DATE NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid'
);

CREATE TABLE IF NOT EXISTS content (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('video', 'notes', 'diet')),
    file_url    TEXT NOT NULL,
    description TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS user_profiles (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    age            INTEGER,
    height_cm      NUMERIC(5,1),
    weight_kg      NUMERIC(5,1),
    health_issues  TEXT,
    complaints     TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    dark_mode              BOOLEAN NOT NULL DEFAULT FALSE,
    notifications_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_goals (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    goals       JSONB NOT NULL DEFAULT '[]',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membership_plans (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    duration    VARCHAR(50) NOT NULL DEFAULT 'monthly',
    description TEXT,
    features    JSONB NOT NULL DEFAULT '[]',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
