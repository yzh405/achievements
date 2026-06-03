import type Database from 'better-sqlite3';
import type { DayStats } from '../types.js';

/**
 * Get daily token statistics for a given date range.
 */
export function getDailyStats(
  db: Database.Database,
  startDate: string,
  endDate: string,
  model?: string
): DayStats[] {
  let query = `
    SELECT
      date,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(cache_read_input_tokens) AS cache_read_input_tokens,
      SUM(cache_creation_input_tokens) AS cache_creation_input_tokens,
      SUM(input_tokens) + SUM(output_tokens) AS total_tokens,
      SUM(message_count) AS message_count,
      SUM(session_count) AS session_count
    FROM daily_summary
    WHERE date >= ? AND date <= ?
  `;
  const params: (string | number)[] = [startDate, endDate];

  if (model) {
    query += ' AND model = ?';
    params.push(model);
  }

  query += ' GROUP BY date ORDER BY date DESC';

  return db.prepare(query).all(...params) as DayStats[];
}

/**
 * Get stats for a single day.
 */
export function getDayStats(
  db: Database.Database,
  date: string,
  model?: string
): DayStats | null {
  let query = `
    SELECT
      date,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(cache_read_input_tokens) AS cache_read_input_tokens,
      SUM(cache_creation_input_tokens) AS cache_creation_input_tokens,
      SUM(input_tokens) + SUM(output_tokens) AS total_tokens,
      SUM(message_count) AS message_count,
      SUM(session_count) AS session_count
    FROM daily_summary
    WHERE date = ?
  `;
  const params: string[] = [date];

  if (model) {
    query += ' AND model = ?';
    params.push(model);
  }

  query += ' GROUP BY date';

  const result = db.prepare(query).get(...params) as DayStats | undefined;
  return result || null;
}

/**
 * Get stats for today.
 */
export function getTodayStats(db: Database.Database, model?: string): DayStats | null {
  const today = new Date().toISOString().slice(0, 10);
  return getDayStats(db, today, model);
}
