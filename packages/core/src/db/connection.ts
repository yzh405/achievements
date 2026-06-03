import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { runMigrations } from './migrations.js';

let db: Database.Database | null = null;

/** Default path for the SQLite database */
export const DB_PATH: string =
  process.env.ACHIEVEMENTS_DB_PATH ||
  path.join(os.homedir(), '.achievements', 'tokens.db');

/**
 * Get (or initialize) the singleton database connection.
 * Runs migrations on first access.
 */
export function getDb(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema migrations
  runMigrations(db);

  return db;
}

/**
 * Close the database connection. Safe to call multiple times.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
