import chalk from 'chalk';
import { getDb, getOverallStats, closeDb } from '@achievements/core';
import { formatNumber } from '../display/format.js';

export function statsCommand(): void {
  const db = getDb();
  try {
    const stats = getOverallStats(db);

    if (stats.message_count === 0) {
      console.log(chalk.yellow('\n  No data yet. Run `achievements ingest` to import data.\n'));
      return;
    }

    console.log('');
    console.log(chalk.bold.cyan('  📊 Quick Stats'));
    console.log('');
    console.log(`  Total Tokens:      ${chalk.bold.red(formatNumber(stats.total_tokens))}`);
    console.log(`  Input Tokens:      ${chalk.yellow(formatNumber(stats.total_input_tokens))}`);
    console.log(`  Output Tokens:     ${chalk.green(formatNumber(stats.total_output_tokens))}`);
    console.log(`  Cache Read Hits:   ${chalk.blue(formatNumber(stats.total_cache_read))}`);
    console.log(`  Cache Writes:      ${chalk.blue(formatNumber(stats.total_cache_creation))}`);
    console.log(`  Total Messages:    ${chalk.bold(stats.message_count.toString())}`);
    console.log(`  Total Sessions:    ${chalk.bold(stats.session_count.toString())}`);
    if (stats.first_date) {
      console.log(`  Date Range:        ${stats.first_date} → ${stats.last_date}`);
    }
    console.log('');

    // Fun comparison
    if (stats.total_tokens > 1_000_000) {
      console.log(chalk.green(`  🎉 You've used over 1M tokens! That's like reading the entire Harry Potter series... twice!\n`));
    } else if (stats.total_tokens > 100_000) {
      console.log(chalk.yellow(`  📖 100K+ tokens — about the length of a novel!\n`));
    }
  } finally {
    closeDb();
  }
}
