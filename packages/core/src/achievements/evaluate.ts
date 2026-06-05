import type Database from 'better-sqlite3';
import type {
  AchievementDef,
  AchievementCriteria,
  AchievementEvalResult,
  EvaluateAllResult,
} from '../types.js';
import { seedAchievements, loadDefinitions } from './definitions.js';

// ── Evaluator helpers ──────────────────────────────────

/**
 * Load existing user_achievements keyed by achievement_id.
 * Returns a Map of achievement_id → { unlocked_at, progress, metadata }.
 * Rows with unlocked_at = 'in-progress' are in-progress markers;
 * rows with a real timestamp are unlocked achievements.
 */
function loadExisting(db: Database.Database): Map<string, { unlockedAt: string; progress: number; metadata: string | null }> {
  const rows = db.prepare(`
    SELECT achievement_id, unlocked_at, progress, metadata
    FROM user_achievements
  `).all() as Array<{
    achievement_id: string;
    unlocked_at: string;
    progress: number;
    metadata: string | null;
  }>;

  const map = new Map<string, { unlockedAt: string; progress: number; metadata: string | null }>();
  for (const r of rows) {
    // Prefer the unlocked row over in-progress if both exist
    const existing = map.get(r.achievement_id);
    if (!existing || r.unlocked_at !== 'in-progress') {
      map.set(r.achievement_id, {
        unlockedAt: r.unlocked_at,
        progress: r.progress,
        metadata: r.metadata,
      });
    }
  }
  return map;
}

// ── Individual evaluators ──────────────────────────────

/**
 * Evaluate total tokens against a threshold.
 * Returns progress as min(total / threshold, 1.0).
 */
function evaluateTotalTokens(db: Database.Database, criteria: { type: 'total_tokens'; threshold: number }): { progress: number; metadata?: Record<string, unknown> } {
  const row = db.prepare(`
    SELECT COALESCE(SUM(input_tokens) + SUM(output_tokens), 0) AS total
    FROM token_usage
  `).get() as { total: number };

  return {
    progress: Math.min(row.total / criteria.threshold, 1.0),
    metadata: { total_tokens: row.total },
  };
}

/**
 * Evaluate max single-day token volume against a threshold.
 */
function evaluateSingleDayVolume(db: Database.Database, criteria: { type: 'single_day_volume'; tokens: number }): { progress: number; metadata?: Record<string, unknown> } {
  const row = db.prepare(`
    SELECT COALESCE(MAX(day_sum), 0) AS max_day
    FROM (
      SELECT DATE(timestamp) AS d, SUM(input_tokens) + SUM(output_tokens) AS day_sum
      FROM token_usage
      GROUP BY d
    )
  `).get() as { max_day: number };

  return {
    progress: Math.min(row.max_day / criteria.tokens, 1.0),
    metadata: { max_day_volume: row.max_day, target: criteria.tokens },
  };
}

/**
 * Evaluate daily streak — longest consecutive days with at least one message.
 */
function evaluateDailyStreak(db: Database.Database, criteria: { type: 'daily_streak'; days: number }): { progress: number; metadata?: Record<string, unknown> } {
  const rows = db.prepare(`
    SELECT DISTINCT DATE(timestamp) AS d
    FROM token_usage
    ORDER BY d
  `).all() as Array<{ d: string }>;

  if (rows.length === 0) {
    return { progress: 0, metadata: { current_streak: 0 } };
  }

  const dates = rows.map((r) => new Date(r.d).getTime());
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const diffDays = (dates[i] - dates[i - 1]) / 86400000;
    if (diffDays <= 1) {
      // Same day or consecutive day
      if (diffDays === 1) currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
  }

  // Also compute current streak (ending today or yesterday)
  const now = Date.now();
  const todayStart = new Date(new Date().toISOString().slice(0, 10)).getTime();
  let currentEndStreak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const expectedDate = todayStart - currentEndStreak * 86400000;
    if (i === dates.length - 1) {
      // Check if most recent date is today or yesterday
      const mostRecent = dates[dates.length - 1];
      if (mostRecent >= todayStart - 86400000) {
        currentEndStreak = 1;
      } else {
        break; // gap too large, no active streak
      }
    } else {
      const expectedPrev = dates[i];
      const prevInStreak = todayStart - (currentEndStreak) * 86400000;
      if (expectedPrev >= prevInStreak - 86400000 && expectedPrev <= prevInStreak) {
        // check if dates are consecutive
        const actualPrev = todayStart - currentEndStreak * 86400000;
        if (dates[i] === actualPrev) {
          currentEndStreak++;
        } else if (dates[i] === actualPrev + 86400000) {
          // skip a day in the middle, streak broken
          break;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  // Simpler approach: compute current streak from the end
  let currentFromEnd = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    const diffDays = (dates[i + 1] - dates[i]) / 86400000;
    if (diffDays === 1) {
      currentFromEnd++;
    } else {
      break;
    }
  }

  // Check if the most recent date is today or yesterday (current)
  const mostRecentDate = dates[dates.length - 1];
  const isCurrent = (todayStart - mostRecentDate) / 86400000 <= 1;
  const activeStreak = isCurrent ? currentFromEnd : 1;

  return {
    progress: Math.min(longestStreak / criteria.days, 1.0),
    metadata: { longest_streak: longestStreak, current_streak: activeStreak },
  };
}

/**
 * Evaluate number of distinct models used.
 */
function evaluateModelCount(db: Database.Database, criteria: { type: 'model_count'; count: number }): { progress: number; metadata?: Record<string, unknown> } {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT model) AS cnt FROM token_usage
  `).get() as { cnt: number };

  return {
    progress: Math.min(row.cnt / criteria.count, 1.0),
    metadata: { model_count: row.cnt },
  };
}

/**
 * Evaluate number of distinct projects used.
 */
function evaluateProjectCount(db: Database.Database, criteria: { type: 'project_count'; count: number }): { progress: number; metadata?: Record<string, unknown> } {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT project) AS cnt
    FROM token_usage
    WHERE project IS NOT NULL AND project != ''
  `).get() as { cnt: number };

  return {
    progress: Math.min(row.cnt / criteria.count, 1.0),
    metadata: { project_count: row.cnt },
  };
}

/**
 * Evaluate cache hit rate (cache_read / total_input_tokens).
 */
function evaluateCacheHitRate(db: Database.Database, criteria: { type: 'cache_hit_rate'; ratio: number }): { progress: number; metadata?: Record<string, unknown> } {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens), 0) AS total_input,
      COALESCE(SUM(cache_read_input_tokens), 0) AS total_cache_read
    FROM token_usage
  `).get() as { total_input: number; total_cache_read: number };

  const hitRate = row.total_input > 0 ? row.total_cache_read / row.total_input : 0;

  return {
    progress: Math.min(hitRate / criteria.ratio, 1.0),
    metadata: {
      cache_hit_rate: Math.round(hitRate * 10000) / 100, // percentage, 2 decimals
      total_input: row.total_input,
      total_cache_read: row.total_cache_read,
    },
  };
}

// ── Evaluator dispatcher ───────────────────────────────

/**
 * Run the appropriate evaluator for a given criteria type.
 */
function runEvaluator(
  db: Database.Database,
  criteria: AchievementCriteria
): { progress: number; metadata?: Record<string, unknown> } {
  switch (criteria.type) {
    case 'total_tokens':
      return evaluateTotalTokens(db, criteria);
    case 'single_day_volume':
      return evaluateSingleDayVolume(db, criteria);
    case 'daily_streak':
      return evaluateDailyStreak(db, criteria);
    case 'model_count':
      return evaluateModelCount(db, criteria);
    case 'project_count':
      return evaluateProjectCount(db, criteria);
    case 'cache_hit_rate':
      return evaluateCacheHitRate(db, criteria);
    default:
      return { progress: 0 };
  }
}

// ── Main entry point ───────────────────────────────────

/**
 * Evaluate all achievements against the current database state.
 * - Unlocks newly-completed achievements
 * - Updates in-progress markers for partial progress
 * - Returns full results including which achievements were just unlocked
 *
 * Idempotent: calling multiple times won't re-unlock achievements.
 */
export function evaluateAll(db: Database.Database): EvaluateAllResult {
  // 1. Ensure definitions are seeded
  seedAchievements(db);

  // 2. Load definitions
  const defs = loadDefinitions(db);

  // 3. Load existing state (unlocked + in-progress)
  const existing = loadExisting(db);

  // Prepare statements
  const deleteInProgress = db.prepare(`
    DELETE FROM user_achievements WHERE achievement_id = ? AND unlocked_at = 'in-progress'
  `);
  const insertUnlock = db.prepare(`
    INSERT INTO user_achievements (achievement_id, unlocked_at, progress, metadata)
    VALUES (?, ?, ?, ?)
  `);
  const upsertInProgress = db.prepare(`
    INSERT INTO user_achievements (achievement_id, unlocked_at, progress, metadata)
    VALUES (?, 'in-progress', ?, ?)
    ON CONFLICT(achievement_id, unlocked_at) DO UPDATE SET
      progress = excluded.progress,
      metadata = excluded.metadata
  `);

  const results: AchievementEvalResult[] = [];
  const newlyUnlocked: AchievementEvalResult[] = [];

  const evaluateAllTx = db.transaction(() => {
    for (const def of defs) {
      // Run evaluator
      const { progress, metadata } = runEvaluator(db, def.criteria);

      // Check existing state
      const ex = existing.get(def.id);
      const isAlreadyUnlocked = ex ? ex.unlockedAt !== 'in-progress' : false;
      let unlockedAt: string | null = isAlreadyUnlocked ? ex!.unlockedAt : null;
      let isNewlyUnlocked = false;

      if (progress >= 1.0) {
        if (!isAlreadyUnlocked) {
          // Newly unlocked!
          unlockedAt = new Date().toISOString();
          isNewlyUnlocked = true;

          // Remove any in-progress marker
          deleteInProgress.run(def.id);

          // Insert unlock record
          insertUnlock.run(def.id, unlockedAt, 1.0, metadata ? JSON.stringify(metadata) : null);

          // Update existing map so subsequent code sees the right state
          existing.set(def.id, { unlockedAt, progress: 1.0, metadata: metadata ? JSON.stringify(metadata) : null });
        }
      } else {
        if (!isAlreadyUnlocked) {
          // Update or insert in-progress marker
          upsertInProgress.run(def.id, progress, metadata ? JSON.stringify(metadata) : null);
          existing.set(def.id, { unlockedAt: 'in-progress', progress, metadata: metadata ? JSON.stringify(metadata) : null });
        }
        // If already unlocked, we don't downgrade — keep the unlock
      }

      const result: AchievementEvalResult = {
        achievementId: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        progress: isAlreadyUnlocked ? 1.0 : progress,
        isNewlyUnlocked,
        unlockedAt,
        metadata,
      };
      results.push(result);
      if (isNewlyUnlocked) {
        newlyUnlocked.push(result);
      }
    }
  });

  evaluateAllTx();

  // Count totals
  const totalAchievements = results.length;
  const totalUnlocked = results.filter((r) => r.unlockedAt !== null && r.unlockedAt !== 'in-progress').length;

  return {
    results,
    newlyUnlocked,
    totalAchievements,
    totalUnlocked,
  };
}
