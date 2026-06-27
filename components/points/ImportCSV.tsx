'use client'

import { useState, useRef } from 'react'
import { parsePointsCSV, type ParsedRow } from '@/lib/csv/parser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  campaignId: string
}

export function ImportCSV({ campaignId }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; batch_id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = await parsePointsCSV(file)
    setRows(parsed)
    setResult(null)
    setError(null)
  }

  const validRows = rows.filter(r => !r._error)
  const invalidRows = rows.filter(r => r._error)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/points/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          rows: validRows.map(r => ({
            user_id: campaignId, // placeholder: in production resolve participante -> user_id
            scoring_rule_id: null,
            points: r.pontos,
            event_date: r.data,
            description: r.observacao,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erro ao importar')
      } else {
        const body = await res.json()
        setResult(body)
        setRows([])
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar Pontos via CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Colunas esperadas: <code>participante, criterio, pontos, data (YYYY-MM-DD), observacao</code>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
          />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Preview — {validRows.length} válidas / {invalidRows.length} com erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 pr-4">Linha</th>
                    <th className="text-left py-1 pr-4">Participante</th>
                    <th className="text-left py-1 pr-4">Critério</th>
                    <th className="text-left py-1 pr-4">Pontos</th>
                    <th className="text-left py-1 pr-4">Data</th>
                    <th className="text-left py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={`border-b last:border-0 ${row._error ? 'bg-red-50' : ''}`}>
                      <td className="py-1 pr-4 text-muted-foreground">{row._line}</td>
                      <td className="py-1 pr-4">{row.participante}</td>
                      <td className="py-1 pr-4">{row.criterio}</td>
                      <td className="py-1 pr-4">{row.pontos}</td>
                      <td className="py-1 pr-4">{row.data}</td>
                      <td className="py-1">
                        {row._error
                          ? <Badge variant="destructive" className="text-xs">{row._error}</Badge>
                          : <Badge variant="default" className="text-xs">OK</Badge>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validRows.length > 0 && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Importando...' : `Confirmar ${validRows.length} linhas`}
                </Button>
                <Button variant="outline" onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = '' }}>
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500/50 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm text-green-700">
              Importação concluída: {result.inserted} registros inseridos.
              <span className="block text-xs text-green-600 mt-1">Lote: {result.batch_id}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/50 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
