// ============================================================
// Core data types for the achievements/token-tracking system
// ============================================================

/** A single LLM interaction record — stored in token_usage table */
export interface TokenUsageRecord {
  id?: number;
  timestamp: string; // ISO 8601
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  source: 'claude-code' | 'manual' | 'api' | 'other';
  project?: string;
  session_id?: string;
  message_id?: string;
}

/** Pre-computed daily summary — stored in daily_summary table */
export interface DailySummary {
  date: string; // 'YYYY-MM-DD'
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  message_count: number;
  session_count: number;
}

/** The shape of a Claude Code JSONL transcript line we care about */
export interface ClaudeCodeMessage {
  timestamp: string;
  sessionId: string;
  cwd: string;
  type: string;
  isSidechain?: boolean;
  message?: {
    id: string;
    model: string;
    role: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

/** Result returned by ingest functions */
export interface IngestResult {
  newRecords: number;
  skippedDuplicates: number;
  filesScanned: number;
  errors: string[];
}

/** Overall token statistics */
export interface TokenStats {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read: number;
  total_cache_creation: number;
  total_tokens: number;
  session_count: number;
  message_count: number;
  first_date: string | null;
  last_date: string | null;
}

/** Per-model breakdown */
export interface ModelBreakdown {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  percentage: number;
  message_count: number;
}

/** Per-project breakdown */
export interface ProjectBreakdown {
  project: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  message_count: number;
}

/** A single day's statistics */
export interface DayStats {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  total_tokens: number;
  message_count: number;
  session_count: number;
}

/** A single week's statistics */
export interface WeekStats {
  week_start: string; // Monday
  week_end: string; // Sunday
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  total_tokens: number;
  message_count: number;
  session_count: number;
}

// ── Achievement System ──────────────────────────────────

/** Achievement tier — controls icon and prestige */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Whether the achievement criteria is shown to the user */
export type AchievementVisibility = 'visible' | 'hidden';

/** Category expanded for tiered system */
export type AchievementCategory =
  | 'token_volume'
  | 'daily_volume'
  | 'streak'
  | 'model_variety'
  | 'project'
  | 'efficiency';

/** Achievement definition */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  icon: string;
  tier: AchievementTier;
  visibility: AchievementVisibility;
  xpReward: number; // XP awarded on first unlock
}

/** Criteria for unlocking an achievement */
export type AchievementCriteria =
  | { type: 'total_tokens'; threshold: number }
  | { type: 'daily_streak'; days: number }
  | { type: 'model_count'; count: number }
  | { type: 'single_day_volume'; tokens: number }
  | { type: 'project_count'; count: number }
  | { type: 'cache_hit_rate'; ratio: number }
  | { type: 'message_count'; count: number }
  | { type: 'language_count'; count: number };

/** Unlocked achievement record */
export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
  progress: number; // 0.0 to 1.0
  metadata?: Record<string, unknown>;
}

/** Result of evaluating a single achievement */
export interface AchievementEvalResult {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  tier: AchievementTier;
  visibility: AchievementVisibility;
  xpReward: number;
  progress: number; // 0.0 to 1.0
  isNewlyUnlocked: boolean;
  unlockedAt: string | null;
  metadata?: Record<string, unknown>;
}

/** Aggregated result from evaluateAll() */
export interface EvaluateAllResult {
  results: AchievementEvalResult[];
  newlyUnlocked: AchievementEvalResult[];
  totalAchievements: number;
  totalUnlocked: number;
  totalVisible: number;
  unlockedVisible: number;
  xpEarned: number;
  level: LevelInfo;
}

// ── XP & Level System ───────────────────────────────────

/** Level and XP information */
export interface LevelInfo {
  level: number;
  currentXp: number;
  xpToNext: number;
  totalXp: number;
  title: string;
}

/** A recorded XP event */
export interface XpEvent {
  id?: number;
  timestamp: string;
  source: 'achievement' | 'mission' | 'token_bonus' | 'surprise';
  amount: number;
  description: string;
  metadata?: string;
}

// ── Weekly Missions ─────────────────────────────────────

/** A weekly mission definition */
export interface WeeklyMission {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: AchievementCriteria;
  xpReward: number;
}

/** Active mission with progress tracked */
export interface ActiveMission {
  missionId: string;
  weekStart: string; // Monday date
  weekEnd: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  progress: number; // 0.0 to 1.0
  completed: boolean;
}

// ── Streak State ────────────────────────────────────────

/** Streak tracking with protection mechanics */
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  freezesUsed: number;
  freezesAvailable: number;
  lastActiveDate: string | null;
  streakAnchor: number; // permanent floor after 30-day streak
}
