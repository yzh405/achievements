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

    -- Achievement definitions (Phase 2)
    CREATE TABLE IF NOT EXISTS achievement_defs (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL,
        category    TEXT NOT NULL,
        criteria    TEXT NOT NULL,
        icon        TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Unlocked achievements (Phase 2)
    CREATE TABLE IF NOT EXISTS user_achievements (
        achievement_id TEXT NOT NULL REFERENCES achievement_defs(id),
        unlocked_at    TEXT NOT NULL,
        progress       REAL DEFAULT 1.0,
        metadata       TEXT,
        PRIMARY KEY (achievement_id, unlocked_at)
    );
  `);
}
