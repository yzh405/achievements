import chalk from 'chalk';

/**
 * Format a large number with thousands separators.
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

/**
 * Format a date string for display.
 */
export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

/**
 * Draw a horizontal bar chart in terminal.
 */
export function barChart(
  value: number,
  max: number,
  width: number = 30
): string {
  if (max === 0) return '';
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Format token count with color based on magnitude.
 */
export function formatTokens(n: number): string {
  const s = formatNumber(n).padStart(8);
  if (n > 100_000) return chalk.red(s);
  if (n > 10_000) return chalk.yellow(s);
  return chalk.green(s);
}

/**
 * Draw a compact progress bar for achievement progress display.
 * ─███████████░░░░░░░░░─ 55%
 */
export function progressBar(
  progress: number,
  width: number = 20
): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;

  if (progress >= 1.0) {
    return chalk.green('█'.repeat(width)) + '  ✨';
  }

  const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const pct = chalk.white(`${Math.round(progress * 100)}%`);
  return `${bar}  ${pct}`;
}

/**
 * Get a status icon for an achievement based on its evaluation result.
 */
export function achievementStatusIcon(
  isNewlyUnlocked: boolean,
  progress: number,
  unlockedAt: string | null
): string {
  if (isNewlyUnlocked) return '🎉';
  if (unlockedAt !== null && unlockedAt !== 'in-progress') return '🔓';
  if (progress > 0) return '⬜';
  return '🔒';
}

// ── Tier & Level formatting ────────────────────────────

/** Tier display with color */
export function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    bronze: '🥉 青铜',
    silver: '🥈 白银',
    gold: '🥇 黄金',
    platinum: '💎 铂金',
    diamond: '👑 钻石',
  };
  return labels[tier] || tier;
}

/** Color a string by tier */
export function tierColor(tier: string, text: string): string {
  switch (tier) {
    case 'diamond': return chalk.cyan.bold(text);
    case 'platinum': return chalk.magenta(text);
    case 'gold': return chalk.yellow(text);
    case 'silver': return chalk.white(text);
    case 'bronze': return chalk.gray(text);
    default: return text;
  }
}

/** Format XP as a simple number */
export function formatXp(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K XP`;
  return `${n} XP`;
}

/** Draw an XP level bar */
export function levelBar(currentXp: number, xpToNext: number, width: number = 20): string {
  const total = currentXp + xpToNext;
  if (total === 0) return chalk.gray('░'.repeat(width));
  const filled = Math.round((currentXp / total) * width);
  const empty = width - filled;
  return chalk.yellow('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}
