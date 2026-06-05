import Table from 'cli-table3';
import chalk from 'chalk';
import type { DayStats, ModelBreakdown, ProjectBreakdown, WeekStats, AchievementEvalResult, ActiveMission, LevelInfo } from '@achievements/core';
import { formatNumber, formatDate, formatTokens, barChart, progressBar, achievementStatusIcon, tierColor, tierLabel, levelBar } from './format.js';

/**
 * Render a daily stats table.
 */
export function renderDailyTable(days: DayStats[]): string {
  if (days.length === 0) return chalk.gray('  No data for this period.\n');

  const maxTokens = Math.max(...days.map((d) => d.total_tokens), 1);

  const table = new Table({
    head: ['Date', 'Day', 'Input', 'Output', 'Total', 'Msgs', 'Bar'],
    style: { head: ['cyan'] },
    colWidths: [12, 10, 12, 12, 12, 8, 32],
  });

  for (const d of days) {
    table.push([
      d.date,
      formatDate(d.date),
      formatNumber(d.input_tokens),
      formatNumber(d.output_tokens),
      formatTokens(d.total_tokens),
      d.message_count.toString(),
      barChart(d.total_tokens, maxTokens, 28),
    ]);
  }

  return table.toString();
}

/**
 * Render a weekly stats table.
 */
export function renderWeeklyTable(weeks: WeekStats[]): string {
  if (weeks.length === 0) return chalk.gray('  No data for this period.\n');

  const maxTokens = Math.max(...weeks.map((w) => w.total_tokens), 1);

  const table = new Table({
    head: ['Week', 'Input', 'Output', 'Total', 'Msgs', 'Sessions', 'Bar'],
    style: { head: ['cyan'] },
    colWidths: [18, 12, 12, 12, 8, 10, 30],
  });

  for (const w of weeks) {
    const label = `${w.week_start} → ${w.week_end}`;
    table.push([
      label,
      formatNumber(w.input_tokens),
      formatNumber(w.output_tokens),
      formatTokens(w.total_tokens),
      w.message_count.toString(),
      w.session_count.toString(),
      barChart(w.total_tokens, maxTokens, 26),
    ]);
  }

  return table.toString();
}

/**
 * Render a model breakdown table.
 */
export function renderModelTable(models: ModelBreakdown[]): string {
  if (models.length === 0) return chalk.gray('  No model data available.\n');

  const table = new Table({
    head: ['Model', 'Input', 'Output', 'Total', '%', 'Msgs'],
    style: { head: ['cyan'] },
    colWidths: [24, 12, 12, 12, 8, 8],
  });

  for (const m of models) {
    table.push([
      chalk.bold(m.model),
      formatNumber(m.input_tokens),
      formatNumber(m.output_tokens),
      formatTokens(m.total_tokens),
      `${m.percentage.toFixed(1)}%`,
      m.message_count.toString(),
    ]);
  }

  return table.toString();
}

/**
 * Render a project breakdown table.
 */
export function renderProjectTable(projects: ProjectBreakdown[]): string {
  if (projects.length === 0) return chalk.gray('  No project data available.\n');

  const maxTokens = Math.max(...projects.map((p) => p.total_tokens), 1);
  const shortName = (p: string) => {
    const parts = p.split('/');
    return parts[parts.length - 1] || p;
  };

  const table = new Table({
    head: ['Project', 'Input', 'Output', 'Total', 'Msgs', 'Bar'],
    style: { head: ['cyan'] },
    colWidths: [28, 12, 12, 12, 8, 28],
  });

  for (const p of projects) {
    table.push([
      chalk.bold(shortName(p.project)),
      formatNumber(p.input_tokens),
      formatNumber(p.output_tokens),
      formatTokens(p.total_tokens),
      p.message_count.toString(),
      barChart(p.total_tokens, maxTokens, 24),
    ]);
  }

  return table.toString();
}

/**
 * Render achievements grouped by category and tier with progress bars.
 */
export function renderAchievementTable(achievements: AchievementEvalResult[]): string {
  if (achievements.length === 0) return chalk.gray('  No achievements found.\n');

  const categoryLabels: Record<string, string> = {
    token_volume: '📊 Token Volume',
    daily_volume: '⚡ Daily Volume',
    streak: '🔥 Streaks',
    model_variety: '🔍 Model Variety',
    project: '📁 Projects',
    efficiency: '💾 Efficiency',
  };

  const grouped = new Map<string, AchievementEvalResult[]>();
  for (const a of achievements) {
    const list = grouped.get(a.category) || [];
    list.push(a);
    grouped.set(a.category, list);
  }

  const table = new Table({
    head: ['', 'Tier', 'Achievement', 'Progress', 'Status'],
    style: { head: ['cyan'] },
    colWidths: [4, 8, 20, 24, 8],
    wordWrap: true,
  });

  for (const [category, items] of grouped) {
    table.push([{ colSpan: 5, content: chalk.bold.cyan(categoryLabels[category] || category) }]);
    for (const a of items) {
      const status = achievementStatusIcon(a.isNewlyUnlocked, a.progress, a.unlockedAt);
      const unlocked = a.unlockedAt !== null && a.unlockedAt !== 'in-progress';

      // Hidden achievements: mask name/description until unlocked
      const showHidden = a.visibility === 'hidden' && !unlocked;
      const name = unlocked
        ? chalk.green(a.name)
        : (showHidden ? chalk.gray('???') : chalk.white(a.name));
      const desc = showHidden
        ? chalk.gray('  🔒 隐藏成就')
        : chalk.gray(`  ${a.description}`);
      const tierStr = tierColor(a.tier, tierLabel(a.tier));

      // For hidden achievements, show unlocked "!!!" instead of progress
      const progressDisplay = showHidden
        ? chalk.gray('???')
        : progressBar(a.progress);

      table.push([
        a.icon,
        tierStr,
        `${name}\n${desc}`,
        progressDisplay,
        status,
      ]);
    }
  }

  return table.toString();
}

/**
 * Render weekly missions.
 */
export function renderMissionTable(missions: ActiveMission[]): string {
  if (missions.length === 0) return '';

  const table = new Table({
    head: ['Mission', 'Progress', ''],
    style: { head: ['cyan'] },
    colWidths: [30, 24, 8],
    wordWrap: true,
  });

  for (const m of missions) {
    const status = m.completed ? '✅' : (m.progress > 0 ? '⬜' : '🔒');
    table.push([
      `${m.icon}  ${chalk.white(m.name)}\n${chalk.gray('  ' + m.description)}`,
      progressBar(m.progress),
      status,
    ]);
  }

  return table.toString();
}

/**
 * Render level display with XP bar.
 */
export function renderLevelDisplay(level: LevelInfo): string {
  return `  ${chalk.bold.yellow(`⚡ Level ${level.level}`)} ${chalk.gray(level.title)}  ${levelBar(level.currentXp, level.xpToNext)}  ${chalk.yellow(`${level.currentXp}/${level.currentXp + level.xpToNext} XP`)}`;
}

/**
 * Render a compact achievement summary line for the dashboard.
 */
export function renderAchievementSummary(
  totalUnlocked: number,
  totalAchievements: number,
  unlockedVisible: number,
  totalVisible: number,
  nextName: string | null,
  nextProgress: number | null
): string {
  const summary = `🏆 Achievements: ${chalk.bold(`${unlockedVisible}/${totalVisible}`)} visible unlocked | ${chalk.gray(`${totalUnlocked}/${totalAchievements}`)} total`;
  if (nextName && nextProgress !== null) {
    return `${summary}\n  ${chalk.gray('🔜 Next:')} ${chalk.cyan(nextName)} (${Math.round(nextProgress * 100)}%)`;
  }
  return summary;
}
