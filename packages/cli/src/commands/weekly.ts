import chalk from 'chalk';
import { getDb, getWeeklyStats, getWeekStats, closeDb } from '@achievements/core';
import { renderWeeklyTable } from '../display/table.js';

export interface WeeklyOptions {
  date?: string;
  weeks?: string;
}

export function weeklyCommand(options: WeeklyOptions): void {
  const db = getDb();
  try {
    if (options.date) {
      const stats = getWeekStats(db, options.date);
      if (!stats) {
        console.log(chalk.yellow(`\n  No data for week containing ${options.date}\n`));
        return;
      }
      console.log('');
      console.log(chalk.bold.cyan(`  📊 Week of ${stats.week_start}`));
      console.log('');
      console.log(renderWeeklyTable([stats]));
    } else {
      const weeks = parseInt(options.weeks || '4', 10);
      const stats = getWeeklyStats(db, weeks);

      if (stats.length === 0) {
        console.log(chalk.yellow(`\n  No weekly data available\n`));
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan(`  📊 Weekly Token Usage — Last ${weeks} Weeks`));
      console.log('');
      console.log(renderWeeklyTable(stats));
    }
  } finally {
    closeDb();
  }
}
