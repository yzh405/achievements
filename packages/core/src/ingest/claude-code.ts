import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type Database from 'better-sqlite3';
import type { ClaudeCodeMessage, IngestResult } from '../types.js';

/**
 * Normalize model names: strip bracketed suffixes like "[1M]" or "[extended]".
 */
function normalizeModel(model: string): string {
  return model.replace(/\s*\[.*\]$/, '').trim();
}

/**
 * Scan a directory recursively for *.jsonl files.
 */
function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findJsonlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Process a single JSONL file, extracting assistant messages with usage data.
 */
function processFile(
  filePath: string,
  db: Database.Database,
  insertStmt: Database.Statement,
  stats: { newRecords: number; skippedDuplicates: number; errors: string[] }
): void {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;

  // Use synchronous processing per line (better-sqlite3 is synchronous)
  const lines: string[] = [];
  rl.on('line', (line: string) => {
    lines.push(line);
  });

  rl.on('close', () => {
    const insertMany = db.transaction(() => {
      for (const line of lines) {
        lineNum++;
        if (!line.trim()) continue;

        try {
          const record: ClaudeCodeMessage = JSON.parse(line);

          // Only process assistant messages with usage data
          if (record.type !== 'assistant' || !record.message?.usage) continue;

          const usage = record.message.usage;
          const model = normalizeModel(record.message.model || 'unknown');
          const messageId = record.message.id;

          if (!messageId) continue;

          try {
            const result = insertStmt.run(
              record.timestamp,
              model,
              usage.input_tokens,
              usage.output_tokens,
              usage.cache_read_input_tokens ?? 0,
              usage.cache_creation_input_tokens ?? 0,
              'claude-code',
              record.cwd || null,
              record.sessionId || null,
              messageId
            );

            if (result.changes > 0) {
              stats.newRecords++;
            } else {
              stats.skippedDuplicates++;
            }
          } catch (err: unknown) {
            // Check if it's a UNIQUE constraint violation (duplicate message_id)
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('UNIQUE constraint')) {
              stats.skippedDuplicates++;
            } else {
              stats.errors.push(`${filePath}:${lineNum} - ${msg}`);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          stats.errors.push(`${filePath}:${lineNum} parse error: ${msg}`);
        }
      }
    });

    insertMany();
  });
}

/**
 * Rebuild the daily_summary table from token_usage data.
 */
function rebuildDailySummary(db: Database.Database): void {
  db.exec(`
    DELETE FROM daily_summary;

    INSERT INTO daily_summary (date, model, input_tokens, output_tokens,
      cache_read_input_tokens, cache_creation_input_tokens, message_count, session_count)
    SELECT
      DATE(timestamp) AS date,
      model,
      SUM(input_tokens),
      SUM(output_tokens),
      SUM(cache_read_input_tokens),
      SUM(cache_creation_input_tokens),
      COUNT(*) AS message_count,
      COUNT(DISTINCT session_id) AS session_count
    FROM token_usage
    GROUP BY DATE(timestamp), model
    ORDER BY date DESC;
  `);
}

/**
 * Ingest token usage data from Claude Code JSONL transcripts.
 *
 * Scans ~/.claude/projects/ (or a custom data dir) for transcript files,
 * parses each assistant message's usage data, and inserts into the database.
 *
 * Uses a transaction for each file and INSERT OR IGNORE for dedup via message_id.
 */
export function ingestClaudeCodeTranscripts(
  db: Database.Database,
  dataDir?: string
): IngestResult {
  const claudeDir = dataDir || path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.claude'
  );
  const projectsDir = path.join(claudeDir, 'projects');

  const stats: { newRecords: number; skippedDuplicates: number; errors: string[]; filesScanned: number } = {
    newRecords: 0,
    skippedDuplicates: 0,
    errors: [],
    filesScanned: 0,
  };

  // Find all JSONL files
  const files = findJsonlFiles(projectsDir);
  stats.filesScanned = files.length;

  if (files.length === 0) {
    stats.errors.push(`No JSONL files found in ${projectsDir}`);
    return { ...stats };
  }

  // Prepare insert statement (INSERT OR IGNORE for dedup)
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO token_usage
      (timestamp, model, input_tokens, output_tokens,
       cache_read_input_tokens, cache_creation_input_tokens,
       source, project, session_id, message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Process each file
  for (const file of files) {
    processFileSync(file, db, insertStmt, stats);
  }

  // Rebuild daily summaries
  rebuildDailySummary(db);

  return { ...stats };
}

/**
 * Synchronous version — reads each file fully and processes in a transaction.
 * Simpler and works well with better-sqlite3's synchronous model.
 */
function processFileSync(
  filePath: string,
  db: Database.Database,
  insertStmt: Database.Statement,
  stats: { newRecords: number; skippedDuplicates: number; errors: string[] }
): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    stats.errors.push(`${filePath}: unable to read - ${msg}`);
    return;
  }

  const lines = content.split('\n');

  const processTransaction = db.transaction(() => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      let record: ClaudeCodeMessage;
      try {
        record = JSON.parse(line);
      } catch {
        continue; // Skip malformed lines
      }

      // Only process assistant messages with usage data
      if (record.type !== 'assistant' || !record.message?.usage) continue;

      const usage = record.message.usage;
      const model = normalizeModel(record.message.model || 'unknown');
      const messageId = record.message.id;

      if (!messageId) continue;

      try {
        const result = insertStmt.run(
          record.timestamp,
          model,
          usage.input_tokens,
          usage.output_tokens,
          usage.cache_read_input_tokens ?? 0,
          usage.cache_creation_input_tokens ?? 0,
          'claude-code',
          record.cwd || null,
          record.sessionId || null,
          messageId
        );

        if (result.changes > 0) {
          stats.newRecords++;
        } else {
          stats.skippedDuplicates++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('UNIQUE constraint')) {
          stats.skippedDuplicates++;
        } else {
          stats.errors.push(`${filePath}:${i + 1} - ${msg}`);
        }
      }
    }
  });

  processTransaction();
}

/**
 * Dry-run: count how many records would be imported without writing to DB.
 */
export function dryRunIngest(dataDir?: string): { recordCount: number; fileCount: number; errors: string[] } {
  const claudeDir = dataDir || path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.claude'
  );
  const projectsDir = path.join(claudeDir, 'projects');

  const files = findJsonlFiles(projectsDir);
  let recordCount = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const record: ClaudeCodeMessage = JSON.parse(line);
          if (record.type === 'assistant' && record.message?.usage) {
            recordCount++;
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${file}: ${msg}`);
    }
  }

  return { recordCount, fileCount: files.length, errors };
}
