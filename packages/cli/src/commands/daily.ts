import chalk from 'chalk';
import { getDb, getDailyStats, getDayStats, closeDb } from '@achievements/core';
import { renderDailyTable } from '../display/table.js';

export interface DailyOptions {
  date?: string;
  model?: string;
  period?: string;
}

export function dailyCommand(options: DailyOptions): void {
  const db = getDb();
  try {
    if (options.date) {
      // Single day view
      const date = options.date;
      const stats = getDayStats(db, date, options.model);

      if (!stats) {
        console.log(chalk.yellow(`\n  No data for ${date}\n`));
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan(`  📅 Token Usage — ${date}`));
      console.log('');
      console.log(renderDailyTable([stats]));
    } else {
      // Date range view
      const days = parseInt(options.period || '7', 10);
      const today = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

      const stats = getDailyStats(db, startDate, today, options.model);

      if (stats.length === 0) {
        console.log(chalk.yellow(`\n  No data for the last ${days} days\n`));
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan(`  📅 Daily Token Usage — Last ${days} Days`));
      if (options.model) {
        console.log(chalk.gray(`  Model: ${options.model}`));
      }
      console.log('');
      console.log(renderDailyTable(stats));
    }
  } finally {
    closeDb();
  }
}
