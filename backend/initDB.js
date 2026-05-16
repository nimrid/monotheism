// Creates / migrates all database tables and indexes on startup.
// Each statement runs individually so pg's parser sees one statement at a time.
// ALTER TABLE … ADD COLUMN IF NOT EXISTS handles tables that predate schema changes.
const pool = require('./db');

// ── Ordered DDL ───────────────────────────────────────────────────────────────
// 1. Create tables (in dependency order)
// 2. Migrate existing tables (add missing columns)
// 3. Create indexes

const statements = [

  // ── Tables ──────────────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    trial_plans_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reading_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    days INTEGER NOT NULL,
    start_date DATE NOT NULL,
    age INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    is_trial BOOLEAN DEFAULT false,
    payment_tx_signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id VARCHAR(50) NOT NULL,
    book_name VARCHAR(100) NOT NULL,
    book_id VARCHAR(10) NOT NULL,
    chapter_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    chapters_completed INTEGER DEFAULT 0,
    total_chapters INTEGER NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS saved_verses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_name VARCHAR(100) NOT NULL,
    book_id VARCHAR(10) NOT NULL,
    chapter_number INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    verse_text TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS definition_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_term VARCHAR(255) NOT NULL,
    result_word VARCHAR(255),
    result_definition TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reading_plan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount_skr DECIMAL(10, 2) NOT NULL,
    tx_signature VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_signature VARCHAR(255) UNIQUE NOT NULL,
    amount_skr DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // ── Migrations: add FK columns that may be absent on older DB instances ──────
  // These are safe no-ops if the column already exists (IF NOT EXISTS on pg 9.6+)

  `ALTER TABLE reading_plans
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE reading_progress
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE reading_progress
     ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE`,

  // Add unique constraint for reading_progress if not present
  // (wrapped in DO $$ block so it doesn't error on conflict)
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'reading_progress_plan_id_chapter_id_key'
     ) THEN
       ALTER TABLE reading_progress ADD CONSTRAINT reading_progress_plan_id_chapter_id_key UNIQUE (plan_id, chapter_id);
     END IF;
   END $$`,

  `ALTER TABLE reading_sessions
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE reading_sessions
     ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE`,

  // Add unique constraint for reading_sessions
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'reading_sessions_plan_id_day_number_key'
     ) THEN
       ALTER TABLE reading_sessions ADD CONSTRAINT reading_sessions_plan_id_day_number_key UNIQUE (plan_id, day_number);
     END IF;
   END $$`,

  `ALTER TABLE saved_verses
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE definition_searches
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE reading_plan_payments
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  `ALTER TABLE reading_plan_payments
     ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE`,

  `ALTER TABLE premium_subscriptions
     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`,

  // Add unique constraint for premium_subscriptions.user_id
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'premium_subscriptions_user_id_key'
     ) THEN
       ALTER TABLE premium_subscriptions ADD CONSTRAINT premium_subscriptions_user_id_key UNIQUE (user_id);
     END IF;
   END $$`,

  // ── Indexes ─────────────────────────────────────────────────────────────────

  `CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_plans_user_id ON reading_plans(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_plan_id ON reading_progress(plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_completed ON reading_progress(completed)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_sessions_plan_id ON reading_sessions(plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(session_date)`,
  `CREATE INDEX IF NOT EXISTS idx_saved_verses_user_id ON saved_verses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_definition_searches_user_id ON definition_searches(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_plan_payments_user_id ON reading_plan_payments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reading_plan_payments_plan_id ON reading_plan_payments(plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id ON premium_subscriptions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_tx ON premium_subscriptions(tx_signature)`,
];

const initDB = async () => {
  let errors = 0;
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      errors++;
      const preview = sql.trim().slice(0, 80).replace(/\s+/g, ' ');
      console.error(`[initDB] ✗ ${preview}...\n         ${err.message}`);
    }
  }

  if (errors === 0) {
    console.log('✓ Database schema ready');
  } else {
    console.warn(`⚠ Database schema ready with ${errors} warning(s) — check logs above`);
  }
};

module.exports = initDB;
