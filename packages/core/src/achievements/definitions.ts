import type Database from 'better-sqlite3';
import type { AchievementDef, AchievementCriteria } from '../types.js';

/**
 * All 15 built-in achievement definitions.
 * Each entry defines the unlock condition — the evaluator
 * functions in evaluate.ts use the `criteria` field to
 * compute progress against actual usage data.
 */
const ACHIEVEMENTS: AchievementDef[] = [
  // ── Token Volume (7) ──────────────────────────────────
  {
    id: 'first-steps',
    name: '初次尝试',
    description: '累计使用 1,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 1_000 },
    icon: '🌱',
  },
  {
    id: 'getting-warm',
    name: '渐入佳境',
    description: '累计使用 10,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 10_000 },
    icon: '🔥',
  },
  {
    id: 'token-novice',
    name: 'Token 学徒',
    description: '累计使用 50,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 50_000 },
    icon: '📚',
  },
  {
    id: 'token-scholar',
    name: 'Token 学者',
    description: '累计使用 200,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 200_000 },
    icon: '🎓',
  },
  {
    id: 'token-master',
    name: 'Token 大师',
    description: '累计使用 500,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 500_000 },
    icon: '👑',
  },
  {
    id: 'token-legend',
    name: 'Token 传奇',
    description: '累计使用 1,000,000 tokens',
    category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 1_000_000 },
    icon: '🌟',
  },
  {
    id: 'power-hour',
    name: '爆发时刻',
    description: '单日使用 ≥ 20,000 tokens',
    category: 'token_volume',
    criteria: { type: 'single_day_volume', tokens: 20_000 },
    icon: '⚡',
  },

  // ── Streak (3) ────────────────────────────────────────
  {
    id: 'three-day-streak',
    name: '三日之约',
    description: '连续 3 天使用 AI',
    category: 'streak',
    criteria: { type: 'daily_streak', days: 3 },
    icon: '📅',
  },
  {
    id: 'weekly-warrior',
    name: '周常勇士',
    description: '连续 7 天使用 AI',
    category: 'streak',
    criteria: { type: 'daily_streak', days: 7 },
    icon: '⚔️',
  },
  {
    id: 'fortnight-force',
    name: '半月之力',
    description: '连续 14 天使用 AI',
    category: 'streak',
    criteria: { type: 'daily_streak', days: 14 },
    icon: '🏰',
  },

  // ── Model Variety (2) ─────────────────────────────────
  {
    id: 'model-explorer',
    name: '模型探索者',
    description: '使用过 2 种不同的模型',
    category: 'model_variety',
    criteria: { type: 'model_count', count: 2 },
    icon: '🔍',
  },
  {
    id: 'model-collector',
    name: '模型收藏家',
    description: '使用过 3 种不同的模型',
    category: 'model_variety',
    criteria: { type: 'model_count', count: 3 },
    icon: '🧩',
  },

  // ── Project (2) ───────────────────────────────────────
  {
    id: 'project-starter',
    name: '项目启动者',
    description: '在 2 个不同项目中使用 AI',
    category: 'project',
    criteria: { type: 'project_count', count: 2 },
    icon: '🚀',
  },
  {
    id: 'polyglot-coder',
    name: '多面手',
    description: '在 5 个不同项目中使用 AI',
    category: 'project',
    criteria: { type: 'project_count', count: 5 },
    icon: '🌐',
  },

  // ── Efficiency (1) ────────────────────────────────────
  {
    id: 'cache-whisperer',
    name: '缓存低语者',
    description: '缓存命中率 ≥ 30%',
    category: 'efficiency',
    criteria: { type: 'cache_hit_rate', ratio: 0.3 },
    icon: '💾',
  },
];

/**
 * Seed the achievement_defs table with all 15 built-in definitions.
 * Uses INSERT OR IGNORE so repeated calls are idempotent.
 */
export function seedAchievements(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO achievement_defs (id, name, description, category, criteria, icon)
    VALUES (@id, @name, @description, @category, @criteria, @icon)
  `);

  const insertMany = db.transaction((defs: AchievementDef[]) => {
    for (const def of defs) {
      insert.run({
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        criteria: JSON.stringify(def.criteria),
        icon: def.icon,
      });
    }
  });

  insertMany(ACHIEVEMENTS);
}

/**
 * Load all achievement definitions from the database.
 */
export function loadDefinitions(db: Database.Database): AchievementDef[] {
  const rows = db.prepare(`
    SELECT id, name, description, category, criteria, icon
    FROM achievement_defs
    ORDER BY
      CASE category
        WHEN 'token_volume' THEN 1
        WHEN 'streak' THEN 2
        WHEN 'model_variety' THEN 3
        WHEN 'project' THEN 4
        WHEN 'efficiency' THEN 5
      END,
      id
  `).all() as Array<{
    id: string;
    name: string;
    description: string;
    category: AchievementDef['category'];
    criteria: string;
    icon: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    criteria: JSON.parse(r.criteria) as AchievementCriteria,
    icon: r.icon,
  }));
}

export { ACHIEVEMENTS };
