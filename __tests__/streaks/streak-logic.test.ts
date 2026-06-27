import { describe, it, expect } from 'vitest'
import { isStreakBroken, getStreakBonus } from '@/lib/streaks/helpers'

describe('isStreakBroken', () => {
  it('returns true when there is a gap of 2 days between last activity and today', () => {
    // 2026-06-25 → 2026-06-27 = gap of 2 days
    expect(isStreakBroken('2026-06-25', '2026-06-27')).toBe(true)
  })

  it('returns false when last activity was the day before today (consecutive)', () => {
    // 2026-06-26 → 2026-06-27 = gap of 1 day = still active
    expect(isStreakBroken('2026-06-26', '2026-06-27')).toBe(false)
  })

  it('returns false when lastActivityDate is null (no streak to break)', () => {
    expect(isStreakBroken(null, '2026-06-27')).toBe(false)
  })

  it('returns false when last activity was today', () => {
    expect(isStreakBroken('2026-06-27', '2026-06-27')).toBe(false)
  })
})

describe('getStreakBonus', () => {
  it('returns 10 for a 5-day streak', () => {
    expect(getStreakBonus(5)).toBe(10)
  })

  it('returns 50 for a 20-day streak', () => {
    expect(getStreakBonus(20)).toBe(50)
  })

  it('returns 0 for streaks below 5', () => {
    expect(getStreakBonus(4)).toBe(0)
    expect(getStreakBonus(0)).toBe(0)
  })

  it('returns 20 for a 10-day streak', () => {
    expect(getStreakBonus(10)).toBe(20)
  })

  it('returns 30 for a 15-day streak', () => {
    expect(getStreakBonus(15)).toBe(30)
  })

  it('returns 50 for streaks above 20', () => {
    expect(getStreakBonus(25)).toBe(50)
  })
})
