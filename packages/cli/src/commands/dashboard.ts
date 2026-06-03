import chalk from 'chalk';
import { getDb, getOverallStats, getDailyStats, getModelBreakdown, closeDb } from '@achievements/core';
import { formatNumber } from '../display/format.js';
import { renderDailyTable, renderModelTable } from '../display/table.js';

export interface DashboardOptions {
  period?: string;
}

export function dashboardCommand(options: DashboardOptions): void {
  const db = getDb();
  try {
    const days = parseInt(options.period || '7', 10);
    const stats = getOverallStats(db);

    console.log('');
    console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('          🏆 Token Usage Dashboard — Last ') + chalk.bold.yellow(days.toString()) + chalk.bold.white(' Days          ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════════╝'));
    console.log('');

    // Overall stats
    console.log(chalk.bold('  Overview (All Time)'));
    console.log(`  ${chalk.gray('Total Input: ')} ${chalk.yellow(formatNumber(stats.total_input_tokens))}   ${chalk.gray('Total Output:')} ${chalk.green(formatNumber(stats.total_output_tokens))}`);
    console.log(`  ${chalk.gray('Cache Hits:  ')} ${chalk.blue(formatNumber(stats.total_cache_read))}    ${chalk.gray('Sessions:    ')} ${chalk.bold(stats.session_count.toString())}`);
    console.log(`  ${chalk.gray('All-time:    ')} ${chalk.red(formatNumber(stats.total_tokens))}     ${chalk.gray('Messages:    ')} ${chalk.bold(stats.message_count.toString())}`);
    if (stats.first_date) {
      console.log(`  ${chalk.gray('Date range:  ')} ${stats.first_date} → ${stats.last_date}`);
    }
    console.log('');

    // Daily breakdown
    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const dailyStats = getDailyStats(db, startDate, today);

    console.log(chalk.bold('  Daily Breakdown'));
    console.log(renderDailyTable(dailyStats));

    // Model breakdown
    const models = getModelBreakdown(db);
    console.log(chalk.bold('  By Model'));
    console.log(renderModelTable(models));

    console.log(chalk.gray(`\n  💡 Run ${chalk.white('achievements ingest')} to refresh data.\n`));
  } finally {
    closeDb();
  }
}
