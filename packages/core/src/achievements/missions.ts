import type Database from 'better-sqlite3';
import type { WeeklyMission, ActiveMission, AchievementCriteria } from '../types.js';

// ── Mission pool ───────────────────────────────────────

const MISSION_POOL: WeeklyMission[] = [
  { id: 'ms-001', name: '探索新模型', description: '本周使用 1 个从未用过的模型', icon: '🔍', criteria: { type: 'model_count', count: 999 }, xpReward: 150 },
  { id: 'ms-002', name: '高产一日', description: '单日使用 ≥ 30,000 tokens', icon: '⚡', criteria: { type: 'single_day_volume', tokens: 30_000 }, xpReward: 150 },
  { id: 'ms-003', name: '连续作战', description: '本周至少 5 天使用 AI', icon: '📅', criteria: { type: 'daily_streak', days: 5 }, xpReward: 150 },
  { id: 'ms-004', name: '效率达人', description: '本周缓存命中率 ≥ 25%', icon: '💾', criteria: { type: 'cache_hit_rate', ratio: 0.25 }, xpReward: 150 },
  { id: 'ms-005', name: '项目多面手', description: '本周在 3 个项目中工作', icon: '📁', criteria: { type: 'project_count', count: 3 }, xpReward: 150 },
  { id: 'ms-006', name: '消息风暴', description: '本周发送 50+ 条消息', icon: '💬', criteria: { type: 'message_count', count: 50 }, xpReward: 150 },
  { id: 'ms-007', name: '百万里程碑', description: '本周累计使用 ≥ 100,000 tokens', icon: '🎯', criteria: { type: 'total_tokens', threshold: 100_000 }, xpReward: 150 },
  { id: 'ms-008', name: '极限冲刺', description: '单日使用 ≥ 50,000 tokens', icon: '🚀', criteria: { type: 'single_day_volume', tokens: 50_000 }, xpReward: 200 },
  { id: 'ms-009', name: '模型达人', description: '本周使用 2 种以上模型', icon: '🧩', criteria: { type: 'model_count', count: 2 }, xpReward: 100 },
  { id: 'ms-010', name: '全勤奖', description: '本周每天使用 AI', icon: '🏅', criteria: { type: 'daily_streak', days: 7 }, xpReward: 300 },
];

// ── Week calculation ───────────────────────────────────

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function getSunday(monday: string): string {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

// ── Mission management ─────────────────────────────────

/** Pick 3 random missions for the current week (deterministic by week) */
export function pickWeeklyMissions(weekStart: string): WeeklyMission[] {
  // Use weekStart as seed for deterministic selection
  const seed = weekStart.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  const shuffled = [...MISSION_POOL].sort((_a, _b) => {
    // Simple seeded shuffle
    const hash = (seed * 2654435761) >>> 0;
    return (hash % MISSION_POOL.length) - MISSION_POOL.length / 2;
  });
  return shuffled.slice(0, 3);
}

/** Ensure missions are seeded for the current week. Returns active missions. */
export function ensureMissions(db: Database.Database): ActiveMission[] {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getMonday(new Date());
  const weekEnd = getSunday(weekStart);

  // Check if missions already exist for this week
  const existing = db.prepare(`
    SELECT COUNT(*) AS cnt FROM weekly_missions WHERE week_start = ?
  `).get(weekStart) as { cnt: number };

  if (existing.cnt === 0) {
    const picked = pickWeeklyMissions(weekStart);
    const insert = db.prepare(`
      INSERT OR IGNORE INTO weekly_missions (mission_id, week_start, week_end, name, description, icon, xp_reward)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const seedAll = db.transaction(() => {
      for (const m of picked) {
        insert.run(m.id, weekStart, weekEnd, m.name, m.description, m.icon, m.xpReward);
      }
    });
    seedAll();
  }

  return getActiveMissions(db);
}

/** Get active missions with evaluated progress */
export function getActiveMissions(db: Database.Database): ActiveMission[] {
  const rows = db.prepare(`
    SELECT mission_id, week_start, week_end, name, description, icon, xp_reward, completed
    FROM weekly_missions
    WHERE week_start = ?
  `).all(getMonday(new Date())) as Array<{
    mission_id: string; week_start: string; week_end: string;
    name: string; description: string; icon: string;
    xp_reward: number; completed: number;
  }>;

  return rows.map((r) => {
    // Map mission back to pool criteria
    const poolDef = MISSION_POOL.find((m) => m.id === r.mission_id);
    if (!poolDef) {
      return { ...r, missionId: r.mission_id, weekStart: r.week_start, weekEnd: r.week_end, xpReward: r.xp_reward, progress: 0, completed: r.completed === 1 };
    }

    // Evaluate progress (simple — just call the evaluator)
    let progress = 0;
    try {
      // Use a simplified evaluation — just for display
      progress = getMissionProgress(db, poolDef.criteria);
    } catch {
      progress = 0;
    }

    return {
      missionId: r.mission_id,
      weekStart: r.week_start,
      weekEnd: r.week_end,
      name: r.name,
      description: r.description,
      icon: r.icon,
      xpReward: r.xp_reward,
      progress: Math.min(progress, 1.0),
      completed: r.completed === 1 || progress >= 1.0,
    };
  });
}

/** Quick progress check for a mission criteria */
function getMissionProgress(db: Database.Database, criteria: AchievementCriteria): number {
  switch (criteria.type) {
    case 'total_tokens': {
      const row = db.prepare(`
        SELECT COALESCE(SUM(input_tokens) + SUM(output_tokens), 0) AS total
        FROM token_usage WHERE DATE(timestamp) >= ?
      `).get(getMonday(new Date())) as { total: number };
      return Math.min(row.total / criteria.threshold, 1.0);
    }
    case 'single_day_volume': {
      const row = db.prepare(`
        SELECT COALESCE(MAX(day_sum), 0) AS max_day FROM (
          SELECT DATE(timestamp) AS d, SUM(input_tokens) + SUM(output_tokens) AS day_sum
          FROM token_usage WHERE DATE(timestamp) >= ?
          GROUP BY d
        )
      `).get(getMonday(new Date())) as { max_day: number };
      return Math.min(row.max_day / criteria.tokens, 1.0);
    }
    case 'daily_streak': {
      const rows = db.prepare(`
        SELECT DISTINCT DATE(timestamp) AS d FROM token_usage
        WHERE DATE(timestamp) >= ?
        ORDER BY d
      `).all(getMonday(new Date())) as Array<{ d: string }>;
      // Count consecutive days from start of week
      let streak = 0;
      const dates = rows.map(r => new Date(r.d).getTime());
      for (let i = 0; i < dates.length; i++) {
        if (i === 0 || (dates[i] - dates[i-1]) / 86400000 === 1) {
          streak++;
        } else {
          streak = 1;
        }
      }
      return Math.min(streak / criteria.days, 1.0);
    }
    case 'model_count': {
      const row = db.prepare(`
        SELECT COUNT(DISTINCT model) AS cnt FROM token_usage WHERE DATE(timestamp) >= ?
      `).get(getMonday(new Date())) as { cnt: number };
      return Math.min(row.cnt / criteria.count, 1.0);
    }
    case 'project_count': {
      const row = db.prepare(`
        SELECT COUNT(DISTINCT project) AS cnt FROM token_usage
        WHERE DATE(timestamp) >= ? AND project IS NOT NULL AND project != ''
      `).get(getMonday(new Date())) as { cnt: number };
      return Math.min(row.cnt / criteria.count, 1.0);
    }
    case 'cache_hit_rate': {
      const row = db.prepare(`
        SELECT COALESCE(SUM(input_tokens), 0) AS total_input,
               COALESCE(SUM(cache_read_input_tokens), 0) AS total_cache
        FROM token_usage WHERE DATE(timestamp) >= ?
      `).get(getMonday(new Date())) as { total_input: number; total_cache: number };
      const rate = row.total_input > 0 ? row.total_cache / row.total_input : 0;
      return Math.min(rate / criteria.ratio, 1.0);
    }
    case 'message_count': {
      const row = db.prepare(`
        SELECT COUNT(*) AS cnt FROM token_usage WHERE DATE(timestamp) >= ?
      `).get(getMonday(new Date())) as { cnt: number };
      return Math.min(row.cnt / criteria.count, 1.0);
    }
    case 'language_count': {
      return 0; // not yet implemented
    }
    default:
      return 0;
  }
}

/** Mark a mission as completed and return XP earned (0 if already completed) */
export function completeMission(db: Database.Database, missionId: string): number {
  const weekStart = getMonday(new Date());
  const mission = db.prepare(`
    SELECT completed, xp_reward FROM weekly_missions WHERE mission_id = ? AND week_start = ?
  `).get(missionId, weekStart) as { completed: number; xp_reward: number } | undefined;

  if (!mission || mission.completed === 1) return 0;

  db.prepare(`
    UPDATE weekly_missions SET completed = 1, completed_at = datetime('now')
    WHERE mission_id = ? AND week_start = ?
  `).run(missionId, weekStart);

  return mission.xp_reward;
}

export { MISSION_POOL };
