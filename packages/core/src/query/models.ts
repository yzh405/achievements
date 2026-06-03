import type Database from 'better-sqlite3';
import type { ModelBreakdown } from '../types.js';

/**
 * Get token breakdown by model.
 */
export function getModelBreakdown(
  db: Database.Database,
  since?: string
): ModelBreakdown[] {
  let query = `
    SELECT
      model,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(input_tokens) + SUM(output_tokens) AS total_tokens,
      COUNT(*) AS message_count,
      0.0 AS percentage
    FROM token_usage
  `;
  const params: string[] = [];

  if (since) {
    query += ' WHERE timestamp >= ?';
    params.push(since);
  }

  query += ' GROUP BY model ORDER BY total_tokens DESC';

  const rows = db.prepare(query).all(...params) as Omit<ModelBreakdown, 'percentage'>[];

  // Calculate percentages
  const grandTotal = rows.reduce((sum, r) => sum + r.total_tokens, 0);
  return rows.map((r) => ({
    ...r,
    percentage: grandTotal > 0 ? (r.total_tokens / grandTotal) * 100 : 0,
  }));
}
