import type Database from 'better-sqlite3';
import type { TokenStats } from '../types.js';

/**
 * Get overall token statistics across all time.
 */
export function getOverallStats(db: Database.Database): TokenStats {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
      COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
      COALESCE(SUM(cache_read_input_tokens), 0) AS total_cache_read,
      COALESCE(SUM(cache_creation_input_tokens), 0) AS total_cache_creation,
      COALESCE(SUM(input_tokens) + SUM(output_tokens), 0) AS total_tokens,
      COUNT(DISTINCT session_id) AS session_count,
      COUNT(*) AS message_count,
      MIN(DATE(timestamp)) AS first_date,
      MAX(DATE(timestamp)) AS last_date
    FROM token_usage
  `).get() as {
    total_input_tokens: number;
    total_output_tokens: number;
    total_cache_read: number;
    total_cache_creation: number;
    total_tokens: number;
    session_count: number;
    message_count: number;
    first_date: string | null;
    last_date: string | null;
  };

  return row;
}
