import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { getDb, evaluateAll, closeDb } from '@achievements/core';
import type { EvaluateAllResult, AchievementEvalResult } from '@achievements/core';
import { renderAchievementTable, renderAchievementSummary } from '../display/table.js';

export interface CheckOptions {
  notify?: boolean;
  quiet?: boolean;
}

/**
 * achievements list — show all achievements grouped by category.
 */
function listCommand(): void {
  const db = getDb();
  try {
    const result: EvaluateAllResult = evaluateAll(db);

    // Check for newly unlocked even in list mode (first run should unlock many)
    if (result.newlyUnlocked.length > 0) {
      printCelebration(result.newlyUnlocked);
      sendNotifications(result.newlyUnlocked);
    }

    console.log('');
    console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('              🏆 Achievement System               ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(`  ${renderAchievementSummary(result.totalUnlocked, result.totalAchievements, getNextAchievement(result.results).name, getNextAchievement(result.results).progress)}`);
    console.log('');
    console.log(renderAchievementTable(result.results));
    console.log('');
  } finally {
    closeDb();
  }
}

/**
 * achievements check — evaluate and check for new unlocks.
 *
 * Options:
 *   --notify   Send macOS desktop notification for each newly unlocked achievement
 *   --quiet    Suppress table output; only show celebration or single-line summary
 */
function checkCommand(options: CheckOptions = {}): void {
  const db = getDb();
  try {
    const result: EvaluateAllResult = evaluateAll(db);

    if (result.newlyUnlocked.length > 0) {
      if (!options.quiet) {
        printCelebration(result.newlyUnlocked);
      }
      if (options.notify) {
        sendNotifications(result.newlyUnlocked);
      }
    } else {
      if (options.quiet) {
        // Silent — nothing to report
        return;
      }
      console.log('');
      console.log(chalk.bold.cyan('  🏆 Achievement Check'));
      console.log('');
      console.log(`  ${chalk.green('No new achievements unlocked this time.')}`);
      console.log(`  ${renderAchievementSummary(result.totalUnlocked, result.totalAchievements, getNextAchievement(result.results).name, getNextAchievement(result.results).progress)}`);
    }

    if (!options.quiet) {
      console.log('');
      console.log(renderAchievementTable(result.results));
      console.log('');
    }
  } finally {
    closeDb();
  }
}

/**
 * Send macOS desktop notifications for newly unlocked achievements.
 */
function sendNotifications(newlyUnlocked: AchievementEvalResult[]): void {
  const platform = process.platform;
  if (platform !== 'darwin') return; // only macOS for now

  for (const a of newlyUnlocked) {
    const title = `${a.icon} 成就解锁：${a.name}`;
    const body = a.description;
    try {
      execSync(
        `osascript -e 'display notification "${body}" with title "${title}" sound name "Glass"'`,
        { timeout: 3000, stdio: 'ignore' }
      );
    } catch {
      // ignore notification errors (e.g., no GUI session in SSH)
    }
  }
}

/**
 * Print a celebration banner for newly unlocked achievements.
 */
function printCelebration(newlyUnlocked: AchievementEvalResult[]): void {
  console.log('');
  console.log(chalk.bold.yellow('  ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.yellow('  ║') + chalk.bold.green('     🎉  ACHIEVEMENT UNLOCKED!  🎉                    ') + chalk.bold.yellow('║'));
  console.log(chalk.bold.yellow('  ╚══════════════════════════════════════════════════════╝'));
  console.log('');

  for (const a of newlyUnlocked) {
    console.log(`    ${a.icon}  ${chalk.bold.green(a.name)}  —  ${chalk.white(a.description)}`);
  }
  console.log('');
}

/**
 * Find the closest-to-completion in-progress achievement.
 */
function getNextAchievement(results: AchievementEvalResult[]): { name: string | null; progress: number | null } {
  const inProgress = results
    .filter((r) => r.unlockedAt === 'in-progress' || r.unlockedAt === null)
    .filter((r) => r.progress > 0)
    .sort((a, b) => b.progress - a.progress);

  if (inProgress.length === 0) return { name: null, progress: null };
  return { name: inProgress[0].name, progress: inProgress[0].progress };
}

// Export the sub-command handlers
export { listCommand, checkCommand };
