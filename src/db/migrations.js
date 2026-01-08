'use strict';

async function runMigrations(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      birth_utc TEXT NOT NULL,
      birth_tz TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      natal_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

    -- Daily cache table: 1 row per user per day per timezone
    CREATE TABLE IF NOT EXISTS daily_scores (
      user_id TEXT NOT NULL,
      local_date TEXT NOT NULL,      -- YYYY-MM-DD in the requested tz
      tz TEXT NOT NULL,              -- IANA timezone used for anchor
      anchored_local_noon TEXT NOT NULL,
      anchored_utc TEXT NOT NULL,
      result_json TEXT NOT NULL,     -- the response payload we return
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, local_date, tz),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_scores_created ON daily_scores(created_at);
  `);
}

module.exports = { runMigrations };
