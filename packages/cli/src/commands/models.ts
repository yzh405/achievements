import chalk from 'chalk';
import { getDb, getModelBreakdown, closeDb } from '@achievements/core';
import { renderModelTable } from '../display/table.js';

export interface ModelsOptions {
  period?: string;
}

export function modelsCommand(options: ModelsOptions): void {
  const db = getDb();
  try {
    let since: string | undefined;
    if (options.period === 'daily') {
      since = new Date(Date.now() - 86400000).toISOString();
    } else if (options.period === 'weekly') {
      since = new Date(Date.now() - 7 * 86400000).toISOString();
    } else if (options.period === 'monthly') {
      since = new Date(Date.now() - 30 * 86400000).toISOString();
    }

    const models = getModelBreakdown(db, since);

    if (models.length === 0) {
      console.log(chalk.yellow('\n  No model data available.\n'));
      return;
    }

    const periodLabel = options.period || 'all time';
    console.log('');
    console.log(chalk.bold.cyan(`  🤖 Model Breakdown — ${periodLabel}`));
    console.log('');
    console.log(renderModelTable(models));
  } finally {
    closeDb();
  }
}
