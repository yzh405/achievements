import type Database from 'better-sqlite3';
import type { TokenUsageRecord } from '../types.js';

/**
 * Add a manual token usage record to the database.
 */
export function addManualEntry(
  db: Database.Database,
  entry: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    timestamp?: string;
    source?: string;
    project?: string;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  }
): TokenUsageRecord {
  const stmt = db.prepare(`
    INSERT INTO token_usage
      (timestamp, model, input_tokens, output_tokens,
       cache_read_input_tokens, cache_creation_input_tokens,
       source, project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = entry.timestamp || new Date().toISOString();
  const source = entry.source || 'manual';

  const result = stmt.run(
    timestamp,
    entry.model,
    entry.input_tokens,
    entry.output_tokens,
    entry.cache_read_input_tokens ?? 0,
    entry.cache_creation_input_tokens ?? 0,
    source,
    entry.project || null
  );

  return {
    id: Number(result.lastInsertRowid),
    timestamp,
    model: entry.model,
    input_tokens: entry.input_tokens,
    output_tokens: entry.output_tokens,
    cache_read_input_tokens: entry.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: entry.cache_creation_input_tokens ?? 0,
    source: source as TokenUsageRecord['source'],
    project: entry.project,
  };
}
