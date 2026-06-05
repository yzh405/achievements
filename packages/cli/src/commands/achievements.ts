import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { getDb, evaluateAll, getActiveMissions, getCurrentLevel, closeDb } from '@achievements/core';
import type { EvaluateAllResult, AchievementEvalResult, LevelInfo, ActiveMission } from '@achievements/core';
import { renderAchievementTable, renderAchievementSummary, renderMissionTable, renderLevelDisplay } from '../display/table.js';
import { levelBar } from '../display/format.js';

export interface CheckOptions {
  notify?: boolean;
  quiet?: boolean;
}

/**
 * achievements list — show all achievements grouped by category and tier.
 */
function listCommand(): void {
  const db = getDb();
  try {
    const result: EvaluateAllResult = evaluateAll(db);

    if (result.newlyUnlocked.length > 0) {
      printCelebration(result.newlyUnlocked);
      sendNotifications(result.newlyUnlocked);
    }

    printHeader(result);
  } finally {
    closeDb();
  }
}

/**
 * achievements check — evaluate and check for new unlocks.
 */
function checkCommand(options: CheckOptions = {}): void {
  const db = getDb();
  try {
    const result: EvaluateAllResult = evaluateAll(db);

    if (result.newlyUnlocked.length > 0) {
      if (!options.quiet) printCelebration(result.newlyUnlocked);
      if (options.notify) sendNotifications(result.newlyUnlocked);
    } else {
      if (options.quiet) return;
      console.log('');
      console.log(chalk.bold.cyan('  🏆 Achievement Check'));
      console.log('');
      console.log(`  ${chalk.green('No new achievements unlocked this time.')}`);
      if (result.xpEarned > 0) {
        console.log(`  ${chalk.yellow(`+${result.xpEarned} XP earned this session`)}`);
      }
    }

    if (!options.quiet) printHeader(result);
  } finally {
    closeDb();
  }
}

function printHeader(result: EvaluateAllResult): void {
  console.log('');
  console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('              🏆 Achievement System v2              ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════╝'));
  console.log('');

  // Level display
  console.log(renderLevelDisplay(result.level));
  console.log('');

  // Achievement summary
  const next = getNextAchievement(result.results);
  console.log(`  ${renderAchievementSummary(result.totalUnlocked, result.totalAchievements, result.unlockedVisible, result.totalVisible, next.name, next.progress)}`);
  console.log('');

  // Achievement table
  console.log(renderAchievementTable(result.results));

  // Weekly missions
  const db = getDb();
  const missions = getActiveMissions(db);
  if (missions.length > 0) {
    console.log('');
    console.log(chalk.bold.cyan('  📋 Weekly Missions'));
    console.log(renderMissionTable(missions));
  }

  console.log('');
}

// ── Celebration & notifications ────────────────────────

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

function sendNotifications(newlyUnlocked: AchievementEvalResult[]): void {
  if (process.platform !== 'darwin') return;

  const notifierDir = `${homedir()}/.achievements`;
  const notifierApp = `${notifierDir}/AchievementsNotifier.app`;

  // Auto-create the notifier app on first run
  if (!existsSync(notifierApp)) {
    try {
      mkdirSync(notifierDir, { recursive: true });
      const script = `on run
  set t to system attribute "NOTIFY_TITLE"
  set b to system attribute "NOTIFY_BODY"
  if t is not missing value and b is not missing value then
    display notification b with title t sound name "Glass"
  end if
end run`;
      const scriptPath = `/tmp/ach-notifier.applescript`;
      writeFileSync(scriptPath, script);
      execSync(`osacompile -o '${notifierApp}' '${scriptPath}'`, { timeout: 5000, stdio: 'ignore' });
    } catch { /* fall back to osascript below */ }
  }

  for (const a of newlyUnlocked) {
    const title = `${a.icon} 成就解锁：${a.name}`;
    const body = a.description;
    try {
      if (existsSync(notifierApp)) {
        // Pass via env vars — clicking notification opens our app (silent), not Script Editor
        execSync(`NOTIFY_TITLE='${title}' NOTIFY_BODY='${body}' open '${notifierApp}'`, { timeout: 5000, stdio: 'ignore' });
      } else {
        execSync(`osascript -e 'display notification "${body}" with title "${title}" sound name "Glass"'`, { timeout: 3000, stdio: 'ignore' });
      }
    } catch { /* ignore */ }
  }

  // Play celebratory sound
  try {
    execSync('afplay /System/Library/Sounds/Glass.aiff', { timeout: 3000, stdio: 'ignore' });
  } catch { /* ignore */ }
}

// ── Helpers ─────────────────────────────────────────────

function getNextAchievement(results: AchievementEvalResult[]): { name: string | null; progress: number | null } {
  const inProgress = results
    .filter((r) => r.unlockedAt === 'in-progress' || r.unlockedAt === null)
    .filter((r) => r.progress > 0)
    .sort((a, b) => b.progress - a.progress);
  if (inProgress.length === 0) return { name: null, progress: null };
  return { name: inProgress[0].name, progress: inProgress[0].progress };
}

export { listCommand, checkCommand };
