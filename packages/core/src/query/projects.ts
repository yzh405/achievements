import type Database from 'better-sqlite3';
import type { ProjectBreakdown } from '../types.js';

/**
 * Get token breakdown by project.
 */
export function getProjectBreakdown(
  db: Database.Database,
  since?: string
): ProjectBreakdown[] {
  let query = `
    SELECT
      COALESCE(project, 'unknown') AS project,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(input_tokens) + SUM(output_tokens) AS total_tokens,
      COUNT(*) AS message_count
    FROM token_usage
  `;
  const params: string[] = [];

  if (since) {
    query += ' WHERE timestamp >= ?';
    params.push(since);
  }

  query += ' GROUP BY project ORDER BY total_tokens DESC';

  return db.prepare(query).all(...params) as ProjectBreakdown[];
}
