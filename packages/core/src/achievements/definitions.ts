import type Database from 'better-sqlite3';
import type { AchievementDef, AchievementCriteria, AchievementTier } from '../types.js';

// ── XP rewards per tier ────────────────────────────────

const XP: Record<AchievementTier, number> = {
  bronze: 50,
  silver: 100,
  gold: 200,
  platinum: 500,
  diamond: 1000,
};

// ── All 52 achievement definitions ────────────────────

const ACHIEVEMENTS: AchievementDef[] = [
  // =====================================================
  // TOKEN VOLUME (15) — logarithmic milestones
  // =====================================================
  // Bronze
  { id: 'tk-001', name: '初入江湖', description: '累计使用 1,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 1_000 }, icon: '🌱', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'tk-002', name: '小试牛刀', description: '累计使用 5,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 5_000 }, icon: '🔰', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'tk-003', name: '崭露头角', description: '累计使用 25,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 25_000 }, icon: '📋', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  // Silver
  { id: 'tk-004', name: '渐入佳境', description: '累计使用 100,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 100_000 }, icon: '🔥', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'tk-005', name: '笔耕不辍', description: '累计使用 250,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 250_000 }, icon: '✍️', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'tk-006', name: 'Token 学徒', description: '累计使用 500,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 500_000 }, icon: '📚', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  // Gold
  { id: 'tk-007', name: 'Token 学者', description: '累计使用 1,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 1_000_000 }, icon: '🎓', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'tk-008', name: 'Token 专家', description: '累计使用 2,500,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 2_500_000 }, icon: '🧠', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'tk-009', name: 'Token 大师', description: '累计使用 5,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 5_000_000 }, icon: '👑', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  // Platinum
  { id: 'tk-010', name: 'Token 宗师', description: '累计使用 10,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 10_000_000 }, icon: '💎', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'tk-011', name: 'Token 霸主', description: '累计使用 25,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 25_000_000 }, icon: '🏆', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'tk-012', name: 'Token 神话', description: '累计使用 50,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 50_000_000 }, icon: '🌟', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  // Diamond
  { id: 'tk-013', name: 'Token 传奇', description: '累计使用 100,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 100_000_000 }, icon: '💫', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },
  { id: 'tk-014', name: 'Token 半神', description: '累计使用 250,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 250_000_000 }, icon: '🔮', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },
  { id: 'tk-015', name: 'Token 之神', description: '累计使用 500,000,000 tokens', category: 'token_volume', criteria: { type: 'total_tokens', threshold: 500_000_000 }, icon: '🌌', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // DAILY VOLUME (5) — single-day peak
  // =====================================================
  { id: 'dv-001', name: '小爆发', description: '单日使用 ≥ 5,000 tokens', category: 'daily_volume', criteria: { type: 'single_day_volume', tokens: 5_000 }, icon: '📈', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'dv-002', name: '大爆发', description: '单日使用 ≥ 20,000 tokens', category: 'daily_volume', criteria: { type: 'single_day_volume', tokens: 20_000 }, icon: '⚡', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'dv-003', name: '火力全开', description: '单日使用 ≥ 50,000 tokens', category: 'daily_volume', criteria: { type: 'single_day_volume', tokens: 50_000 }, icon: '🚀', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'dv-004', name: '核爆日', description: '单日使用 ≥ 100,000 tokens', category: 'daily_volume', criteria: { type: 'single_day_volume', tokens: 100_000 }, icon: '💥', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'dv-005', name: '无限火力', description: '单日使用 ≥ 500,000 tokens', category: 'daily_volume', criteria: { type: 'single_day_volume', tokens: 500_000 }, icon: '🌋', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // STREAK (5) — consecutive days
  // =====================================================
  { id: 'st-001', name: '三日之约', description: '连续 3 天使用 AI', category: 'streak', criteria: { type: 'daily_streak', days: 3 }, icon: '📅', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'st-002', name: '周常勇士', description: '连续 7 天使用 AI', category: 'streak', criteria: { type: 'daily_streak', days: 7 }, icon: '⚔️', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'st-003', name: '半月之力', description: '连续 14 天使用 AI', category: 'streak', criteria: { type: 'daily_streak', days: 14 }, icon: '🏰', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'st-004', name: '月度战神', description: '连续 30 天使用 AI', category: 'streak', criteria: { type: 'daily_streak', days: 30 }, icon: '🛡️', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'st-005', name: '百日王朝', description: '连续 100 天使用 AI', category: 'streak', criteria: { type: 'daily_streak', days: 100 }, icon: '🏛️', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // MODEL VARIETY (5) — distinct models used
  // =====================================================
  { id: 'md-001', name: '初次见面', description: '使用过 1 种模型', category: 'model_variety', criteria: { type: 'model_count', count: 1 }, icon: '🤖', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'md-002', name: '模型探索者', description: '使用过 2 种模型', category: 'model_variety', criteria: { type: 'model_count', count: 2 }, icon: '🔍', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'md-003', name: '模型收藏家', description: '使用过 3 种模型', category: 'model_variety', criteria: { type: 'model_count', count: 3 }, icon: '🧩', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'md-004', name: '模型鉴赏家', description: '使用过 5 种模型', category: 'model_variety', criteria: { type: 'model_count', count: 5 }, icon: '🎨', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'md-005', name: '全模型制霸', description: '使用过 10 种模型', category: 'model_variety', criteria: { type: 'model_count', count: 10 }, icon: '🌐', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // PROJECT COUNT (5) — distinct projects
  // =====================================================
  { id: 'pj-001', name: '初涉项目', description: '在 1 个项目中使用 AI', category: 'project', criteria: { type: 'project_count', count: 1 }, icon: '📂', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'pj-002', name: '项目启动者', description: '在 2 个项目中使用 AI', category: 'project', criteria: { type: 'project_count', count: 2 }, icon: '🚀', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'pj-003', name: '多面手', description: '在 5 个项目中使用 AI', category: 'project', criteria: { type: 'project_count', count: 5 }, icon: '🎯', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'pj-004', name: '项目架构师', description: '在 10 个项目中使用 AI', category: 'project', criteria: { type: 'project_count', count: 10 }, icon: '🏗️', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'pj-005', name: '万能工匠', description: '在 25 个项目中使用 AI', category: 'project', criteria: { type: 'project_count', count: 25 }, icon: '🔧', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // EFFICIENCY (5) — cache hit rate
  // =====================================================
  { id: 'ef-001', name: '节能模式', description: '缓存命中率 ≥ 10%', category: 'efficiency', criteria: { type: 'cache_hit_rate', ratio: 0.1 }, icon: '🔋', tier: 'bronze', visibility: 'visible', xpReward: XP.bronze },
  { id: 'ef-002', name: '效率提升', description: '缓存命中率 ≥ 20%', category: 'efficiency', criteria: { type: 'cache_hit_rate', ratio: 0.2 }, icon: '⚙️', tier: 'silver', visibility: 'visible', xpReward: XP.silver },
  { id: 'ef-003', name: '缓存低语者', description: '缓存命中率 ≥ 30%', category: 'efficiency', criteria: { type: 'cache_hit_rate', ratio: 0.3 }, icon: '💾', tier: 'gold', visibility: 'visible', xpReward: XP.gold },
  { id: 'ef-004', name: '缓存大师', description: '缓存命中率 ≥ 50%', category: 'efficiency', criteria: { type: 'cache_hit_rate', ratio: 0.5 }, icon: '🧙', tier: 'platinum', visibility: 'visible', xpReward: XP.platinum },
  { id: 'ef-005', name: '零浪费', description: '缓存命中率 ≥ 75%', category: 'efficiency', criteria: { type: 'cache_hit_rate', ratio: 0.75 }, icon: '♻️', tier: 'diamond', visibility: 'visible', xpReward: XP.diamond },

  // =====================================================
  // HIDDEN ACHIEVEMENTS (12) — surprise unlocks
  // =====================================================
  {
    id: 'hd-001', name: '午夜幽魂', description: '在凌晨 0:00-4:00 之间使用 AI', category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 1 }, icon: '🦉', tier: 'bronze', visibility: 'hidden', xpReward: 75,
  },
  {
    id: 'hd-002', name: '极速狂飙', description: '单次会话发送 50+ 条消息', category: 'daily_volume',
    criteria: { type: 'message_count', count: 50 }, icon: '🏎️', tier: 'silver', visibility: 'hidden', xpReward: 150,
  },
  {
    id: 'hd-003', name: '会话马拉松', description: '单次会话发送 100+ 条消息', category: 'daily_volume',
    criteria: { type: 'message_count', count: 100 }, icon: '🏃', tier: 'gold', visibility: 'hidden', xpReward: 300,
  },
  {
    id: 'hd-004', name: '王者归来', description: '中断 7 天以上后重新使用 AI', category: 'streak',
    criteria: { type: 'daily_streak', days: 1 }, icon: '👋', tier: 'bronze', visibility: 'hidden', xpReward: 75,
  },
  {
    id: 'hd-005', name: '周末战士', description: '连续 4 个周末都使用 AI', category: 'streak',
    criteria: { type: 'daily_streak', days: 1 }, icon: '🎮', tier: 'silver', visibility: 'hidden', xpReward: 150,
  },
  {
    id: 'hd-006', name: '多语言大师', description: '在 5 种编程语言相关项目中使用 AI', category: 'project',
    criteria: { type: 'project_count', count: 5 }, icon: '🗣️', tier: 'gold', visibility: 'hidden', xpReward: 300,
  },
  {
    id: 'hd-007', name: '百发百中', description: '单次会话缓存命中率 ≥ 90%', category: 'efficiency',
    criteria: { type: 'cache_hit_rate', ratio: 0.9 }, icon: '🎯', tier: 'platinum', visibility: 'hidden', xpReward: 500,
  },
  {
    id: 'hd-008', name: '吉字节里程碑', description: '累计使用 1,000,000,000 tokens', category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 1_000_000_000 }, icon: '🏔️', tier: 'diamond', visibility: 'hidden', xpReward: 2000,
  },
  {
    id: 'hd-009', name: '天天向上', description: '连续 7 天每天 token 用量都在增长', category: 'daily_volume',
    criteria: { type: 'daily_streak', days: 7 }, icon: '📊', tier: 'gold', visibility: 'hidden', xpReward: 250,
  },
  {
    id: 'hd-010', name: '探索者', description: '在同一天使用 3 种以上不同模型', category: 'model_variety',
    criteria: { type: 'model_count', count: 3 }, icon: '🧭', tier: 'silver', visibility: 'hidden', xpReward: 150,
  },
  {
    id: 'hd-011', name: '不眠不休', description: '在 24 小时内发送 200+ 条消息', category: 'daily_volume',
    criteria: { type: 'message_count', count: 200 }, icon: '😤', tier: 'platinum', visibility: 'hidden', xpReward: 500,
  },
  {
    id: 'hd-012', name: '全成就之路', description: '解锁全部可见成就', category: 'token_volume',
    criteria: { type: 'total_tokens', threshold: 1 }, icon: '🏅', tier: 'diamond', visibility: 'hidden', xpReward: 2000,
  },
];

// ── DB seeding ─────────────────────────────────────────

/**
 * Seed the achievement_defs table with all built-in definitions.
 * Uses INSERT OR REPLACE so schema upgrades update existing rows.
 */
export function seedAchievements(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO achievement_defs (id, name, description, category, criteria, icon, tier, visibility, xp_reward)
    VALUES (@id, @name, @description, @category, @criteria, @icon, @tier, @visibility, @xpReward)
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
        tier: def.tier,
        visibility: def.visibility,
        xpReward: def.xpReward,
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
    SELECT id, name, description, category, criteria, icon, tier, visibility, xp_reward
    FROM achievement_defs
    ORDER BY
      CASE tier
        WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3
        WHEN 'platinum' THEN 4 WHEN 'diamond' THEN 5
      END,
      CASE category
        WHEN 'token_volume' THEN 1 WHEN 'daily_volume' THEN 2 WHEN 'streak' THEN 3
        WHEN 'model_variety' THEN 4 WHEN 'project' THEN 5 WHEN 'efficiency' THEN 6
      END,
      id
  `).all() as Array<{
    id: string; name: string; description: string;
    category: AchievementDef['category']; criteria: string;
    icon: string; tier: AchievementDef['tier'];
    visibility: AchievementDef['visibility']; xp_reward: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    criteria: JSON.parse(r.criteria) as AchievementCriteria,
    icon: r.icon,
    tier: r.tier,
    visibility: r.visibility,
    xpReward: r.xp_reward,
  }));
}

/** Return count of visible achievements */
export function countVisible(defs: AchievementDef[]): number {
  return defs.filter((d) => d.visibility === 'visible').length;
}

export { ACHIEVEMENTS, XP };
