export function getDaysInMonth(year: number, month: number): number[] {
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, i) => i + 1)
}

export function periodDateForDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseMonthParam(month: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) }
}

export function formatGoalValue(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return (m % 1 === 0 ? String(m) : m.toFixed(1).replace('.', ',')) + 'M'
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return (k % 1 === 0 ? String(k) : k.toFixed(1).replace('.', ',')) + 'k'
  }
  return String(value)
}
