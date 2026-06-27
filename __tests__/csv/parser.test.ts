import { describe, it, expect } from 'vitest'
import { parsePointsCSV } from '@/lib/csv/parser'

function makeFile(content: string) {
  return new File([content], 'test.csv', { type: 'text/csv' })
}

describe('parsePointsCSV', () => {
  it('parses valid CSV rows', async () => {
    const csv = `participante,criterio,pontos,data,observacao\nJoão,Meta diária,10,2026-07-01,ok`
    const rows = await parsePointsCSV(makeFile(csv))
    expect(rows).toHaveLength(1)
    expect(rows[0].pontos).toBe(10)
    expect(rows[0]._error).toBeUndefined()
  }, 15000)

  it('flags rows with invalid date', async () => {
    const csv = `participante,criterio,pontos,data\nJoão,Meta,10,31-07-2026`
    const rows = await parsePointsCSV(makeFile(csv))
    expect(rows[0]._error).toBeDefined()
  }, 15000)
})
