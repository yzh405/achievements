import type Database from 'better-sqlite3';
import type { LevelInfo, XpEvent } from '../types.js';

// ── Level curve ────────────────────────────────────────

/** Cumulative XP required to reach a given level (1-indexed) */
export function xpForLevel(level: number): number {
  // 100 * N * (N+1) / 2  →  cumulative XP to finish level N
  return Math.floor(50 * level * (level + 1));
}

/** Calculate current level from total XP */
export function levelFromXp(totalXp: number): number {
  // Solve 50 * L * (L+1) <= totalXp
  let level = 1;
  while (xpForLevel(level) <= totalXp) {
    level++;
  }
  return level - 1;
}

/** Human-readable title for a level */
export function levelTitle(level: number): string {
  if (level >= 50) return 'AI 之神';
  if (level >= 35) return '传奇';
  if (level >= 20) return '大师';
  if (level >= 10) return '专家';
  if (level >= 5) return '学徒';
  return '新手';
}

/** Get full level info from total XP */
export function getLevelInfo(totalXp: number): LevelInfo {
  const level = levelFromXp(totalXp);
  const xpForCurrent = xpForLevel(level);
  const xpToNext = xpForLevel(level + 1) - xpForCurrent;
  const currentXp = totalXp - xpForCurrent;

  return {
    level,
    currentXp,
    xpToNext,
    totalXp,
    title: levelTitle(level),
  };
}

// ── XP events ──────────────────────────────────────────

/** Record an XP event and return the updated level info */
export function awardXp(
  db: Database.Database,
  source: XpEvent['source'],
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
): LevelInfo {
  db.prepare(`
    INSERT INTO xp_history (source, amount, description, metadata)
    VALUES (?, ?, ?, ?)
  `).run(source, amount, description, metadata ? JSON.stringify(metadata) : null);

  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_history').get() as { total: number };
  return getLevelInfo(row.total);
}

/** Get total XP earned */
export function getTotalXp(db: Database.Database): number {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_history').get() as { total: number };
  return row.total;
}

/** Get current level info from DB */
export function getCurrentLevel(db: Database.Database): LevelInfo {
  return getLevelInfo(getTotalXp(db));
}

/** Get recent XP history */
export function getRecentXp(db: Database.Database, limit: number = 10): XpEvent[] {
  return db.prepare(`
    SELECT id, timestamp, source, amount, description, metadata
    FROM xp_history
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as XpEvent[];
}
