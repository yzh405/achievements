import type Database from 'better-sqlite3';
import type { StreakState } from '../types.js';

// ── Constants ──────────────────────────────────────────

const MAX_FREEZES = 1; // one freeze per week
const ANCHOR_THRESHOLD = 30; // after 30 days, streak gets an anchor

// ── Streak state ───────────────────────────────────────

/** Get current streak state from the DB */
export function getStreakState(db: Database.Database): StreakState {
  const row = db.prepare('SELECT * FROM streak_state WHERE id = 1').get() as {
    current_streak: number;
    longest_streak: number;
    freezes_used: number;
    freezes_available: number;
    last_active_date: string | null;
    streak_anchor: number;
  } | undefined;

  if (!row) {
    return { currentStreak: 0, longestStreak: 0, freezesUsed: 0, freezesAvailable: MAX_FREEZES, lastActiveDate: null, streakAnchor: 0 };
  }

  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    freezesUsed: row.freezes_used,
    freezesAvailable: row.freezes_available,
    lastActiveDate: row.last_active_date,
    streakAnchor: row.streak_anchor,
  };
}

/** Get distinct active dates from token_usage, sorted ascending */
export function getActiveDates(db: Database.Database): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT DATE(timestamp) AS d FROM token_usage ORDER BY d
  `).all() as Array<{ d: string }>;
  return rows.map((r) => r.d);
}

/** Calculate longest consecutive streak from a set of date strings */
export function calcLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const timestamps = dates.map((d) => new Date(d).getTime());
  let longest = 1;
  let current = 1;
  for (let i = 1; i < timestamps.length; i++) {
    const diff = (timestamps[i] - timestamps[i - 1]) / 86400000;
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}

/** Calculate current streak (must end today or yesterday to be active) */
export function calcCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const timestamps = dates.map((d) => new Date(d).getTime());
  const todayStart = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const lastDate = timestamps[timestamps.length - 1];

  // Must be within 1 day of today to be "active"
  const gapDays = (todayStart - lastDate) / 86400000;
  if (gapDays > 1) return 0;

  let streak = 1;
  for (let i = timestamps.length - 2; i >= 0; i--) {
    const diff = (timestamps[i + 1] - timestamps[i]) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Update streak state based on current usage data */
export function updateStreakState(db: Database.Database): StreakState {
  const dates = getActiveDates(db);
  const longest = calcLongestStreak(dates);
  const current = calcCurrentStreak(dates);
  const today = new Date().toISOString().slice(0, 10);

  const prev = getStreakState(db);

  // Determine new anchor
  let anchor = prev.streakAnchor;
  if (current >= ANCHOR_THRESHOLD) {
    anchor = Math.max(anchor, ANCHOR_THRESHOLD);
  }

  // Reset freezes weekly
  const weekStart = getWeekStart(today);
  const lastWeekStart = prev.lastActiveDate ? getWeekStart(prev.lastActiveDate) : '';
  let freezesAvailable = (weekStart !== lastWeekStart) ? MAX_FREEZES : prev.freezesAvailable;

  // Detect if streak was broken (current dropped)
  const streakBroke = prev.currentStreak > 0 && current === 0;
  let adjustedCurrent = current;
  let freezesUsed = prev.freezesUsed;

  if (streakBroke && freezesAvailable > 0) {
    // Auto-apply freeze — save the streak!
    adjustedCurrent = Math.max(prev.currentStreak, anchor);
    freezesAvailable--;
    freezesUsed++;
  }

  db.prepare(`
    UPDATE streak_state SET
      current_streak = ?,
      longest_streak = MAX(longest_streak, ?),
      freezes_used = ?,
      freezes_available = ?,
      last_active_date = ?,
      streak_anchor = ?
    WHERE id = 1
  `).run(
    adjustedCurrent,
    Math.max(longest, prev.longestStreak),
    freezesUsed,
    freezesAvailable,
    today,
    anchor
  );

  return getStreakState(db);
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}
