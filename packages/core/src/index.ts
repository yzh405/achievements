// ============================================================
// @achievements/core — Public API
// ============================================================

// Database
export { getDb, closeDb, DB_PATH } from './db/connection.js';
export { runMigrations } from './db/migrations.js';

// Ingestion
export { ingestClaudeCodeTranscripts, dryRunIngest } from './ingest/claude-code.js';
export { addManualEntry } from './ingest/manual.js';

// Queries
export { getOverallStats } from './query/stats.js';
export { getDailyStats, getDayStats, getTodayStats } from './query/daily.js';
export { getWeeklyStats, getWeekStats } from './query/weekly.js';
export { getModelBreakdown } from './query/models.js';
export { getProjectBreakdown } from './query/projects.js';

// Types
export type {
  TokenUsageRecord,
  DailySummary,
  IngestResult,
  TokenStats,
  ModelBreakdown,
  ProjectBreakdown,
  DayStats,
  WeekStats,
  AchievementDef,
  AchievementCriteria,
  UserAchievement,
} from './types.js';
