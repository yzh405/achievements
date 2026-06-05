import type Database from 'better-sqlite3';
import type {
  AchievementDef,
  AchievementCriteria,
  AchievementEvalResult,
  EvaluateAllResult,
  AchievementTier,
} from '../types.js';
import { seedAchievements, loadDefinitions, countVisible } from './definitions.js';
import { awardXp, getCurrentLevel } from './levels.js';
import { updateStreakState, calcCurrentStreak, calcLongestStreak, getActiveDates } from './streak.js';
import { ensureMissions, getActiveMissions, completeMission } from './missions.js';

// ── Existing state loader ─────────────────────────────

function loadExisting(db: Database.Database): Map<string, { unlockedAt: string; progress: number; metadata: string | null }> {
  const rows = db.prepare(`
    SELECT achievement_id, unlocked_at, progress, metadata FROM user_achievements
  `).all() as Array<{
    achievement_id: string; unlocked_at: string; progress: number; metadata: string | null;
  }>;

  const map = new Map<string, { unlockedAt: string; progress: number; metadata: string | null }>();
  for (const r of rows) {
    const existing = map.get(r.achievement_id);
    if (!existing || r.unlocked_at !== 'in-progress') {
      map.set(r.achievement_id, { unlockedAt: r.unlocked_at, progress: r.progress, metadata: r.metadata });
    }
  }
  return map;
}

// ── Evaluators ─────────────────────────────────────────

function evaluateTotalTokens(db: Database.Database, threshold: number) {
  const row = db.prepare('SELECT COALESCE(SUM(input_tokens) + SUM(output_tokens), 0) AS total FROM token_usage').get() as { total: number };
  return { progress: Math.min(row.total / threshold, 1.0), metadata: { total_tokens: row.total } };
}

function evaluateSingleDayVolume(db: Database.Database, tokens: number) {
  const row = db.prepare(`
    SELECT COALESCE(MAX(day_sum), 0) AS max_day FROM (
      SELECT DATE(timestamp) AS d, SUM(input_tokens) + SUM(output_tokens) AS day_sum FROM token_usage GROUP BY d
    )
  `).get() as { max_day: number };
  return { progress: Math.min(row.max_day / tokens, 1.0), metadata: { max_day_volume: row.max_day, target: tokens } };
}

function evaluateDailyStreak(db: Database.Database, days: number) {
  const dates = getActiveDates(db);
  const longest = calcLongestStreak(dates);
  const current = calcCurrentStreak(dates);
  return { progress: Math.min(longest / days, 1.0), metadata: { longest_streak: longest, current_streak: current } };
}

function evaluateModelCount(db: Database.Database, count: number) {
  const row = db.prepare('SELECT COUNT(DISTINCT model) AS cnt FROM token_usage').get() as { cnt: number };
  return { progress: Math.min(row.cnt / count, 1.0), metadata: { model_count: row.cnt } };
}

function evaluateProjectCount(db: Database.Database, count: number) {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT project) AS cnt FROM token_usage WHERE project IS NOT NULL AND project != ''
  `).get() as { cnt: number };
  return { progress: Math.min(row.cnt / count, 1.0), metadata: { project_count: row.cnt } };
}

function evaluateCacheHitRate(db: Database.Database, ratio: number) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(input_tokens), 0) AS total_input, COALESCE(SUM(cache_read_input_tokens), 0) AS total_cache
    FROM token_usage
  `).get() as { total_input: number; total_cache: number };
  const hitRate = row.total_input > 0 ? row.total_cache / row.total_input : 0;
  return { progress: Math.min(hitRate / ratio, 1.0), metadata: { cache_hit_rate: Math.round(hitRate * 10000) / 100, total_input: row.total_input, total_cache_read: row.total_cache } };
}

function evaluateMessageCount(db: Database.Database, count: number) {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM token_usage').get() as { cnt: number };
  return { progress: Math.min(row.cnt / count, 1.0), metadata: { message_count: row.cnt } };
}

function evaluateLanguageCount(_db: Database.Database, count: number) {
  return { progress: 0, metadata: { language_count: 0, needed: count } }; // future: detect via project paths
}

// ── Dispatcher ─────────────────────────────────────────

type EvaluatorResult = { progress: number; metadata?: Record<string, unknown> };

export function runEvaluator(db: Database.Database, criteria: AchievementCriteria): EvaluatorResult {
  switch (criteria.type) {
    case 'total_tokens': return evaluateTotalTokens(db, criteria.threshold);
    case 'single_day_volume': return evaluateSingleDayVolume(db, criteria.tokens);
    case 'daily_streak': return evaluateDailyStreak(db, criteria.days);
    case 'model_count': return evaluateModelCount(db, criteria.count);
    case 'project_count': return evaluateProjectCount(db, criteria.count);
    case 'cache_hit_rate': return evaluateCacheHitRate(db, criteria.ratio);
    case 'message_count': return evaluateMessageCount(db, criteria.count);
    case 'language_count': return evaluateLanguageCount(db, criteria.count);
    default: return { progress: 0 };
  }
}

// ── Main entry point ───────────────────────────────────

const TIER_ORDER: Record<AchievementTier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 };

export function evaluateAll(db: Database.Database): EvaluateAllResult {
  // 1. Seed definitions + update streak state
  seedAchievements(db);
  updateStreakState(db);
  ensureMissions(db);

  // 2. Load definitions and existing unlocks
  const defs = loadDefinitions(db);
  const existing = loadExisting(db);

  // Prepare statements
  const deleteInProgress = db.prepare("DELETE FROM user_achievements WHERE achievement_id = ? AND unlocked_at = 'in-progress'");
  const insertUnlock = db.prepare('INSERT INTO user_achievements (achievement_id, unlocked_at, progress, metadata) VALUES (?, ?, ?, ?)');
  const upsertInProgress = db.prepare(`
    INSERT INTO user_achievements (achievement_id, unlocked_at, progress, metadata)
    VALUES (?, 'in-progress', ?, ?)
    ON CONFLICT(achievement_id, unlocked_at) DO UPDATE SET progress = excluded.progress, metadata = excluded.metadata
  `);

  const results: AchievementEvalResult[] = [];
  const newlyUnlocked: AchievementEvalResult[] = [];
  let xpEarned = 0;

  const evaluateAllTx = db.transaction(() => {
    for (const def of defs) {
      const { progress, metadata } = runEvaluator(db, def.criteria);
      const ex = existing.get(def.id);
      const isAlreadyUnlocked = ex ? ex.unlockedAt !== 'in-progress' : false;
      let unlockedAt: string | null = isAlreadyUnlocked ? ex!.unlockedAt : null;
      let isNewlyUnlocked = false;

      if (progress >= 1.0) {
        if (!isAlreadyUnlocked) {
          unlockedAt = new Date().toISOString();
          isNewlyUnlocked = true;
          deleteInProgress.run(def.id);
          insertUnlock.run(def.id, unlockedAt, 1.0, metadata ? JSON.stringify(metadata) : null);
          existing.set(def.id, { unlockedAt, progress: 1.0, metadata: metadata ? JSON.stringify(metadata) : null });

          // Award XP for this achievement
          const levelInfo = awardXp(db, 'achievement', def.xpReward, `${def.icon} ${def.name}`);
          xpEarned += def.xpReward;

          results.push({
            achievementId: def.id, name: def.name, description: def.description,
            category: def.category, icon: def.icon, tier: def.tier,
            visibility: def.visibility, xpReward: def.xpReward,
            progress: 1.0, isNewlyUnlocked: true, unlockedAt, metadata,
          });
          newlyUnlocked.push(results[results.length - 1]);
          continue;
        }
      } else {
        if (!isAlreadyUnlocked) {
          upsertInProgress.run(def.id, progress, metadata ? JSON.stringify(metadata) : null);
          existing.set(def.id, { unlockedAt: 'in-progress', progress, metadata: metadata ? JSON.stringify(metadata) : null });
        }
      }

      results.push({
        achievementId: def.id, name: def.name, description: def.description,
        category: def.category, icon: def.icon, tier: def.tier,
        visibility: def.visibility, xpReward: def.xpReward,
        progress: isAlreadyUnlocked ? 1.0 : progress,
        isNewlyUnlocked: false, unlockedAt, metadata,
      });
    }
  });

  evaluateAllTx();

  // Check mission completions
  const missions = getActiveMissions(db);
  for (const m of missions) {
    if (m.completed && m.progress >= 1.0) {
      const missionXp = completeMission(db, m.missionId);
      if (missionXp > 0) {
        xpEarned += missionXp;
        awardXp(db, 'mission', missionXp, `${m.icon} 周任务: ${m.name}`);
      }
    }
  }

  const level = getCurrentLevel(db);
  const totalVisible = countVisible(defs);
  const unlockedVisible = results.filter((r) => r.visibility === 'visible' && r.unlockedAt !== null && r.unlockedAt !== 'in-progress').length;

  return { results, newlyUnlocked, totalAchievements: defs.length, totalUnlocked: results.filter((r) => r.unlockedAt !== null && r.unlockedAt !== 'in-progress').length, totalVisible, unlockedVisible, xpEarned, level };
}
