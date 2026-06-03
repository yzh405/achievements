import chalk from 'chalk';
import { getDb, ingestClaudeCodeTranscripts, dryRunIngest, closeDb } from '@achievements/core';

export interface IngestOptions {
  all?: boolean;
  quick?: boolean;
  dryRun?: boolean;
  dataDir?: string;
}

export function ingestCommand(options: IngestOptions): void {
  if (options.dryRun) {
    console.log(chalk.cyan('\n🔍 Dry-run: scanning Claude Code transcripts...\n'));
    const result = dryRunIngest(options.dataDir);

    console.log(`  Files found:    ${chalk.bold(result.fileCount.toString())}`);
    console.log(`  Records found:  ${chalk.bold(result.recordCount.toString())}`);

    if (result.errors.length > 0) {
      console.log(chalk.yellow(`\n  ⚠ ${result.errors.length} error(s) during scan:`));
      for (const err of result.errors.slice(0, 5)) {
        console.log(chalk.gray(`    - ${err}`));
      }
    }

    console.log(chalk.green('\n  Dry-run complete. No data was written.\n'));
    return;
  }

  console.log(chalk.cyan('\n📥 Ingesting Claude Code transcripts...\n'));

  const db = getDb();
  try {
    const result = ingestClaudeCodeTranscripts(db, options.dataDir);

    console.log(`  Files scanned:    ${chalk.bold(result.filesScanned.toString())}`);
    console.log(`  New records:      ${chalk.green(result.newRecords.toString())}`);
    console.log(`  Duplicates (skipped): ${chalk.gray(result.skippedDuplicates.toString())}`);

    if (result.errors.length > 0) {
      console.log(chalk.yellow(`\n  ⚠ ${result.errors.length} error(s):`));
      for (const err of result.errors.slice(0, 5)) {
        console.log(chalk.gray(`    - ${err}`));
      }
      if (result.errors.length > 5) {
        console.log(chalk.gray(`    ... and ${result.errors.length - 5} more`));
      }
    }

    console.log(chalk.green('\n  ✅ Ingest complete.\n'));
  } finally {
    closeDb();
  }
}
