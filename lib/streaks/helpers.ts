/**
 * Pure streak calculation helpers — no DB dependency, safe to unit test.
 */

/**
 * Returns true if the streak was broken (gap > 1 day between lastActivityDate and today).
 * Returns false if lastActivityDate is null (no activity yet = no streak to break).
 */
export function isStreakBroken(lastActivityDate: string | null, today: string): boolean {
  if (!lastActivityDate) return false
  const last = new Date(lastActivityDate)
  const t = new Date(today)
  const diffDays = Math.floor((t.getTime() - last.getTime()) / 86400000)
  return diffDays > 1
}

/**
 * Returns the streak bonus points earned at certain milestone thresholds.
 * Milestones: 5 days → +10, 10 → +20, 15 → +30, 20 → +50.
 */
export function getStreakBonus(currentStreak: number): number {
  if (currentStreak >= 20) return 50
  if (currentStreak >= 15) return 30
  if (currentStreak >= 10) return 20
  if (currentStreak >= 5) return 10
  return 0
}
