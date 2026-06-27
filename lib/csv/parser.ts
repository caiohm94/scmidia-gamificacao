import Papa from 'papaparse'
import { csvRowSchema, type CSVRow } from '@/schemas/point'

export type ParsedRow = CSVRow & { _line: number; _error?: string }

function parseRows(data: Record<string, string>[]): ParsedRow[] {
  return data.map((row, i) => {
    const parsed = csvRowSchema.safeParse(row)
    if (!parsed.success) {
      return { ...row, _line: i + 2, _error: parsed.error.issues[0]?.message } as ParsedRow
    }
    return { ...parsed.data, _line: i + 2 }
  })
}

export async function parsePointsCSV(file: File): Promise<ParsedRow[]> {
  const content = await file.text()
  const { data } = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })
  return parseRows(data)
}
