import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  periodDateForDay,
  parseMonthParam,
  formatGoalValue,
} from '@/lib/goals/helpers'

describe('getDaysInMonth', () => {
  it('returns 30 days for June', () => {
    expect(getDaysInMonth(2026, 6)).toHaveLength(30)
    expect(getDaysInMonth(2026, 6)[0]).toBe(1)
    expect(getDaysInMonth(2026, 6)[29]).toBe(30)
  })

  it('returns 28 days for Feb non-leap', () => {
    expect(getDaysInMonth(2025, 2)).toHaveLength(28)
  })

  it('returns 29 days for Feb leap', () => {
    expect(getDaysInMonth(2024, 2)).toHaveLength(29)
  })

  it('returns 31 days for January', () => {
    expect(getDaysInMonth(2026, 1)).toHaveLength(31)
  })
})

describe('periodDateForDay', () => {
  it('pads single-digit day and month', () => {
    expect(periodDateForDay(2026, 6, 5)).toBe('2026-06-05')
  })

  it('formats last day of month', () => {
    expect(periodDateForDay(2026, 6, 30)).toBe('2026-06-30')
  })
})

describe('parseMonthParam', () => {
  it('parses YYYY-MM string', () => {
    expect(parseMonthParam('2026-06')).toEqual({ year: 2026, month: 6 })
  })

  it('returns current month for invalid input', () => {
    const now = new Date()
    const result = parseMonthParam('invalid')
    expect(result.year).toBe(now.getFullYear())
    expect(result.month).toBe(now.getMonth() + 1)
  })
})

describe('formatGoalValue', () => {
  it('formats thousands as k', () => {
    expect(formatGoalValue(100000)).toBe('100k')
    expect(formatGoalValue(80000)).toBe('80k')
  })

  it('formats millions as M', () => {
    expect(formatGoalValue(1500000)).toBe('1,5M')
    expect(formatGoalValue(2000000)).toBe('2M')
  })

  it('formats values under 1000 as-is', () => {
    expect(formatGoalValue(500)).toBe('500')
  })

  it('formats decimal thousands', () => {
    expect(formatGoalValue(1500)).toBe('1,5k')
  })
})
