import chalk from 'chalk';
import { getDb, getProjectBreakdown, closeDb } from '@achievements/core';
import { renderProjectTable } from '../display/table.js';

export function projectsCommand(): void {
  const db = getDb();
  try {
    const projects = getProjectBreakdown(db);

    if (projects.length === 0) {
      console.log(chalk.yellow('\n  No project data available.\n'));
      return;
    }

    console.log('');
    console.log(chalk.bold.cyan('  📁 Project Breakdown'));
    console.log('');
    console.log(renderProjectTable(projects));
  } finally {
    closeDb();
  }
}
