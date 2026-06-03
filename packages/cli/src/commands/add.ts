import chalk from 'chalk';
import { getDb, addManualEntry, closeDb } from '@achievements/core';
import { formatNumber } from '../display/format.js';

export interface AddOptions {
  model: string;
  input: string;
  output: string;
  source?: string;
  project?: string;
}

export function addCommand(options: AddOptions): void {
  const inputTokens = parseInt(options.input, 10);
  const outputTokens = parseInt(options.output, 10);

  if (isNaN(inputTokens) || isNaN(outputTokens) || inputTokens < 0 || outputTokens < 0) {
    console.error(chalk.red('\n  ❌ Invalid token counts. Must be non-negative integers.\n'));
    process.exit(1);
  }

  const db = getDb();
  try {
    const record = addManualEntry(db, {
      model: options.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      source: options.source || 'manual',
      project: options.project,
    });

    console.log('');
    console.log(chalk.green('  ✅ Manual entry added:'));
    console.log(`     Model:    ${chalk.bold(record.model)}`);
    console.log(`     Input:    ${chalk.yellow(formatNumber(record.input_tokens))}`);
    console.log(`     Output:   ${chalk.yellow(formatNumber(record.output_tokens))}`);
    console.log(`     Total:    ${chalk.red(formatNumber(record.input_tokens + record.output_tokens))}`);
    if (record.project) {
      console.log(`     Project:  ${chalk.gray(record.project)}`);
    }
    console.log('');
  } finally {
    closeDb();
  }
}
