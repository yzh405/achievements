#!/usr/bin/env node

import { Command } from 'commander';
import { ingestCommand } from './commands/ingest.js';
import { dashboardCommand } from './commands/dashboard.js';
import { dailyCommand } from './commands/daily.js';
import { weeklyCommand } from './commands/weekly.js';
import { modelsCommand } from './commands/models.js';
import { projectsCommand } from './commands/projects.js';
import { addCommand } from './commands/add.js';
import { statsCommand } from './commands/stats.js';

const program = new Command();

program
  .name('achievements')
  .description('🏆 Token usage tracker & achievement system for LLM power users')
  .version('0.1.0');

// Default command: dashboard
program
  .command('dashboard')
  .description('Show the token usage dashboard (default)')
  .option('-p, --period <days>', 'Number of days to show', '7')
  .action((options) => dashboardCommand(options));

// Ingest command
program
  .command('ingest')
  .description('Scan and import Claude Code transcript data')
  .option('--all', 'Re-scan everything')
  .option('--quick', 'Quick import from stats-cache.json only')
  .option('--dry-run', 'Preview without writing to database')
  .option('--data-dir <path>', 'Path to Claude Code data directory')
  .action((options) => ingestCommand(options));

// Daily command
program
  .command('daily')
  .description('Show daily token usage')
  .argument('[date]', 'Date in YYYY-MM-DD format')
  .option('-m, --model <name>', 'Filter by model')
  .option('-p, --period <days>', 'Show last N days (when no date given)', '7')
  .action((date, options) => dailyCommand({ ...options, date }));

// Weekly command
program
  .command('weekly')
  .description('Show weekly token usage')
  .argument('[date]', 'Any date in the target week (YYYY-MM-DD)')
  .option('-w, --weeks <count>', 'Number of recent weeks to show', '4')
  .action((date, options) => weeklyCommand({ ...options, date }));

// Models command
program
  .command('models')
  .description('Show token breakdown by model')
  .option('-p, --period <period>', 'Filter: daily, weekly, monthly, all')
  .action((options) => modelsCommand(options));

// Projects command
program
  .command('projects')
  .description('Show token breakdown by project')
  .action(() => projectsCommand());

// Add command
program
  .command('add')
  .description('Manually record a token usage entry')
  .requiredOption('-m, --model <name>', 'Model name')
  .requiredOption('-i, --input <n>', 'Input token count')
  .requiredOption('-o, --output <n>', 'Output token count')
  .option('-s, --source <source>', 'Data source', 'manual')
  .option('-p, --project <path>', 'Associated project path')
  .action((options) => addCommand(options));

// Stats command
program
  .command('stats')
  .description('Quick summary of all-time token usage')
  .action(() => statsCommand());

// Also support "today" as an alias for daily with today's date
program
  .command('today')
  .description('Show today\'s token usage')
  .option('-p, --project <path>', 'Filter by project')
  .action(() => {
    const today = new Date().toISOString().slice(0, 10);
    dailyCommand({ date: today });
  });

// Default action: show dashboard if no command given
program.action(() => {
  dashboardCommand({ period: '7' });
});

program.parse();
