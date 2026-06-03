import Table from 'cli-table3';
import chalk from 'chalk';
import type { DayStats, ModelBreakdown, ProjectBreakdown, WeekStats } from '@achievements/core';
import { formatNumber, formatDate, formatTokens, barChart } from './format.js';

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
