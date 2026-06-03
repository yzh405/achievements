import type Database from 'better-sqlite3';
import type { WeekStats } from '../types.js';

/**
 * Get weekly token statistics for a given number of recent weeks.
 */
export function getWeeklyStats(
  db: Database.Database,
  weeks: number = 4
): WeekStats[] {
  return db.prepare(`
    SELECT
      DATE(timestamp, 'weekday 0', '-7 days') AS week_start,
      DATE(timestamp, 'weekday 0', '-1 days') AS week_end,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(cache_read_input_tokens) AS cache_read_input_tokens,
      SUM(cache_creation_input_tokens) AS cache_creation_input_tokens,
      SUM(input_tokens) + SUM(output_tokens) AS total_tokens,
      COUNT(*) AS message_count,
      COUNT(DISTINCT session_id) AS session_count
    FROM token_usage
    WHERE timestamp >= DATE('now', ?)
    GROUP BY week_start
    ORDER BY week_start DESC
    LIMIT ?
  `).all(`-${weeks * 7} days`, weeks) as WeekStats[];
}

/**
 * Get stats for a specific week (any date within that week).
 */
export function getWeekStats(
  db: Database.Database,
  dateInWeek: string
): WeekStats | null {
  const result = db.prepare(`
    SELECT
      DATE(?, 'weekday 0', '-7 days') AS week_start,
      DATE(?, 'weekday 0', '-1 days') AS week_end,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cache_read_input_tokens), 0) AS cache_read_input_tokens,
      COALESCE(SUM(cache_creation_input_tokens), 0) AS cache_creation_input_tokens,
      COALESCE(SUM(input_tokens) + SUM(output_tokens), 0) AS total_tokens,
      COUNT(*) AS message_count,
      COUNT(DISTINCT session_id) AS session_count
    FROM token_usage
    WHERE date BETWEEN week_start AND week_end
  `).get(dateInWeek, dateInWeek) as WeekStats | undefined;

  return result || null;
}
