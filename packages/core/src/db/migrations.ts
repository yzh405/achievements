import type Database from 'better-sqlite3';

/**
 * Run all schema migrations. Idempotent — uses IF NOT EXISTS.
 * Called automatically by getDb() on first connection.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    -- Core token usage table: one row per LLM interaction
    CREATE TABLE IF NOT EXISTS token_usage (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT    NOT NULL,
        model       TEXT    NOT NULL,
        input_tokens           INTEGER NOT NULL DEFAULT 0,
        output_tokens          INTEGER NOT NULL DEFAULT 0,
        cache_read_input_tokens      INTEGER NOT NULL DEFAULT 0,
        cache_creation_input_tokens  INTEGER NOT NULL DEFAULT 0,
        source      TEXT    NOT NULL DEFAULT 'claude-code',
        project     TEXT,
        session_id  TEXT,
        message_id  TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp   ON token_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_model       ON token_usage(model);
    CREATE INDEX IF NOT EXISTS idx_usage_source      ON token_usage(source);
    CREATE INDEX IF NOT EXISTS idx_usage_project     ON token_usage(project);
    CREATE INDEX IF NOT EXISTS idx_usage_session     ON token_usage(session_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_message_id
        ON token_usage(message_id)
        WHERE message_id IS NOT NULL;

    -- Pre-computed daily summaries (populated after ingest)
    CREATE TABLE IF NOT EXISTS daily_summary (
        date        TEXT NOT NULL,
        model       TEXT NOT NULL,
        input_tokens           INTEGER NOT NULL DEFAULT 0,
        output_tokens          INTEGER NOT NULL DEFAULT 0,
        cache_read_input_tokens      INTEGER NOT NULL DEFAULT 0,
        cache_creation_input_tokens  INTEGER NOT NULL DEFAULT 0,
        message_count          INTEGER NOT NULL DEFAULT 0,
        session_count          INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (date, model)
    );

    -- Achievement definitions (v2 — tiered system)
    CREATE TABLE IF NOT EXISTS achievement_defs (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL,
        category    TEXT NOT NULL,
        criteria    TEXT NOT NULL,
        icon        TEXT,
        tier        TEXT NOT NULL DEFAULT 'bronze',
        visibility  TEXT NOT NULL DEFAULT 'visible',
        xp_reward   INTEGER NOT NULL DEFAULT 50,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Unlocked achievements
    CREATE TABLE IF NOT EXISTS user_achievements (
        achievement_id TEXT NOT NULL REFERENCES achievement_defs(id),
        unlocked_at    TEXT NOT NULL,
        progress       REAL DEFAULT 1.0,
        metadata       TEXT,
        PRIMARY KEY (achievement_id, unlocked_at)
    );

    -- XP history — every XP-earning event
    CREATE TABLE IF NOT EXISTS xp_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
        source      TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        description TEXT NOT NULL,
        metadata    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_xp_timestamp ON xp_history(timestamp);

    -- Weekly missions — currently active missions
    CREATE TABLE IF NOT EXISTS weekly_missions (
        mission_id   TEXT NOT NULL,
        week_start   TEXT NOT NULL,
        week_end     TEXT NOT NULL,
        name         TEXT NOT NULL,
        description  TEXT NOT NULL,
        icon         TEXT,
        xp_reward    INTEGER NOT NULL DEFAULT 100,
        completed    INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        PRIMARY KEY (mission_id, week_start)
    );

    -- Streak state — singleton row tracking streak with protection
    CREATE TABLE IF NOT EXISTS streak_state (
        id                    INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak        INTEGER NOT NULL DEFAULT 0,
        longest_streak        INTEGER NOT NULL DEFAULT 0,
        freezes_used          INTEGER NOT NULL DEFAULT 0,
        freezes_available     INTEGER NOT NULL DEFAULT 1,
        last_active_date      TEXT,
        streak_anchor         INTEGER NOT NULL DEFAULT 0
    );

    -- Ensure singleton streak_state row exists
    INSERT OR IGNORE INTO streak_state (id) VALUES (1);
  `);

  // Migrate old achievement_defs if missing columns (Phase 2 → Phase 3 upgrade)
  migrateAchievementDefs(db);
}

/**
 * Add tier/visibility/xp_reward columns if upgrading from Phase 2 schema.
 */
function migrateAchievementDefs(db: Database.Database): void {
  const cols = db.prepare("PRAGMA table_info('achievement_defs')").all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));

  if (!names.has('tier')) {
    db.exec("ALTER TABLE achievement_defs ADD COLUMN tier TEXT NOT NULL DEFAULT 'bronze'");
  }
  if (!names.has('visibility')) {
    db.exec("ALTER TABLE achievement_defs ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible'");
  }
  if (!names.has('xp_reward')) {
    db.exec('ALTER TABLE achievement_defs ADD COLUMN xp_reward INTEGER NOT NULL DEFAULT 50');
  }
}
