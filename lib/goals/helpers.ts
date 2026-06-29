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

// Compact display for matrix cells (e.g. 120000 → "120k" or "R$ 120k")
export function formatValueCompact(value: number, valueType: string, decimalPlaces: number): string {
  const prefix = valueType === 'currency' ? 'R$ ' : ''
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    const s = decimalPlaces > 0 ? m.toFixed(1).replace('.', ',') : (m % 1 === 0 ? String(m) : m.toFixed(1).replace('.', ','))
    return prefix + s + 'M'
  }
  if (Math.abs(value) >= 1_000) {
    const k = value / 1_000
    const s = decimalPlaces > 0 ? k.toFixed(1).replace('.', ',') : (k % 1 === 0 ? String(k) : k.toFixed(1).replace('.', ','))
    return prefix + s + 'k'
  }
  const s = value.toLocaleString('pt-BR', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })
  return prefix + s
}

// Full display for realizado tab (e.g. 120000 → "R$ 120.000,00")
export function formatValueFull(value: number, valueType: string, decimalPlaces: number): string {
  const s = value.toLocaleString('pt-BR', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })
  return valueType === 'currency' ? `R$ ${s}` : s
}

// Legacy — kept for existing tests; new code uses formatValueCompact/formatValueFull
export function formatGoalValue(value: number): string {
  return formatValueCompact(value, 'number', 0)
}
