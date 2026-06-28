'use client'
import { useState, useRef } from 'react'
import { parsePointsCSV, type ParsedRow } from '@/lib/csv/parser'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  campaigns: { id: string; name: string }[]
  users: { id: string; name: string; email: string }[]
  rules: { id: string; name: string; campaign_id: string }[]
}

export function CsvImporter({ campaigns, users, rules }: Props) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; batch_id: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function resolveUser(participante: string) {
    const lower = participante.toLowerCase()
    return users.find(u => u.email.toLowerCase() === lower || u.name.toLowerCase() === lower)
  }

  function resolveRule(criterio: string) {
    const lower = criterio.toLowerCase()
    return rules.find(r => r.name.toLowerCase() === lower && r.campaign_id === campaignId)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = await parsePointsCSV(file)
    setRows(parsed)
    setResult(null)
  }

  function reset() {
    setRows([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const enriched = rows.map(r => ({
    ...r,
    user: resolveUser(r.participante ?? ''),
    rule: r.criterio ? resolveRule(r.criterio) : null,
    _resolveError: !r._error && !resolveUser(r.participante ?? '') ? 'Participante não encontrado' : undefined,
  }))

  const validRows = enriched.filter(r => !r._error && !r._resolveError)
  const errorRows = enriched.filter(r => r._error || r._resolveError)

  async function handleConfirm() {
    if (!campaignId) return
    setLoading(true)
    try {
      const res = await fetch('/api/points/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          rows: validRows.map(r => ({
            user_id: r.user!.id,
            scoring_rule_id: r.rule?.id ?? null,
            points: r.pontos,
            event_date: r.data,
            description: r.observacao ?? undefined,
          })),
        }),
      })
      const body = await res.json()
      if (!res.ok) { toast.error(body.error ?? 'Erro ao importar'); return }
      setResult(body)
      reset()
      toast.success(`${body.inserted} registros importados com sucesso!`)
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Instructions */}
      <div className="sc-card-accent">
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', marginBottom: '0.5rem' }}>Formato esperado do CSV</p>
        <code style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.65)', display: 'block', lineHeight: 1.8 }}>
          participante, criterio, pontos, data, observacao<br />
          joao@scmidia.com.br, Venda de pacote, 100, 2026-06-28, Cliente X<br />
          Maria Silva, , 50, 2026-06-28, Bônus manual
        </code>
        <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.5rem' }}>
          <b>participante:</b> e-mail ou nome exato · <b>criterio:</b> nome da regra (opcional) · <b>data:</b> YYYY-MM-DD
        </p>
      </div>

      {/* Campaign + file */}
      <div className="sc-card space-y-4">
        <div className="space-y-1">
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)' }}>Campanha</label>
          <select value={campaignId} onChange={e => { setCampaignId(e.target.value); reset() }}
            style={{ display: 'block', width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem', color: '#3F3E3E', background: '#fff' }}>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)' }}>Arquivo CSV</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1.5px dashed rgba(63,62,62,0.2)', borderRadius: '0 0.5rem 0.5rem 0.5rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#8DB23C')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(63,62,62,0.2)')}>
            <Upload size={18} color="rgba(63,62,62,0.4)" />
            <span style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.5)' }}>Clique para selecionar ou arraste o arquivo .csv</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(63,62,62,0.08)', background: 'rgba(63,62,62,0.02)' }}>
            <div className="flex items-center gap-2">
              <FileText size={15} color="#3F3E3E" />
              <span style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.85rem', color: '#3F3E3E' }}>Preview</span>
            </div>
            <div className="flex gap-3" style={{ fontSize: '0.75rem' }}>
              <span style={{ color: '#5C7435', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={13} /> {validRows.length} válidas
              </span>
              {errorRows.length > 0 && (
                <span style={{ color: '#c0622a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <XCircle size={13} /> {errorRows.length} com erro
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgba(63,62,62,0.03)', borderBottom: '1px solid rgba(63,62,62,0.07)' }}>
                  {['Linha', 'Participante', 'Critério', 'Pontos', 'Data', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map((row, idx) => {
                  const err = row._error ?? row._resolveError
                  return (
                    <tr key={idx} style={{ borderTop: idx > 0 ? '1px solid rgba(63,62,62,0.06)' : 'none', background: err ? 'rgba(192,98,42,0.04)' : 'transparent' }}>
                      <td className="px-3 py-2" style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.75rem' }}>{row._line}</td>
                      <td className="px-3 py-2" style={{ fontWeight: row.user ? 500 : 400, color: row.user ? '#3F3E3E' : '#c0622a', fontSize: '0.82rem' }}>{row.participante}</td>
                      <td className="px-3 py-2" style={{ color: 'rgba(63,62,62,0.6)', fontSize: '0.82rem' }}>{row.criterio || '—'}</td>
                      <td className="px-3 py-2" style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, color: (row.pontos ?? 0) > 0 ? '#5C7435' : '#c0622a', fontSize: '0.82rem' }}>
                        {(row.pontos ?? 0) > 0 ? '+' : ''}{row.pontos}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'rgba(63,62,62,0.55)', fontSize: '0.82rem' }}>{row.data}</td>
                      <td className="px-3 py-2">
                        {err
                          ? <span style={{ fontSize: '0.7rem', color: '#c0622a', background: 'rgba(192,98,42,0.1)', padding: '0.1rem 0.45rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', fontWeight: 500 }}>{err}</span>
                          : <span style={{ fontSize: '0.7rem', color: '#5C7435', background: 'rgba(92,116,53,0.1)', padding: '0.1rem 0.45rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', fontWeight: 500 }}>OK</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {validRows.length > 0 && (
            <div className="flex gap-2 px-4 py-3" style={{ borderTop: '1px solid rgba(63,62,62,0.08)' }}>
              <button className="sc-btn-primary text-sm cursor-pointer" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Importando...' : `Confirmar ${validRows.length} linhas`}
              </button>
              <button className="sc-btn-outline text-sm cursor-pointer" onClick={reset}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div style={{ background: 'rgba(141,178,60,0.08)', border: '1px solid rgba(141,178,60,0.3)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, color: '#5C7435', fontFamily: 'var(--font-outfit, sans-serif)', fontSize: '0.875rem' }}>
            ✓ {result.inserted} registros importados com sucesso
          </p>
          <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.25rem' }}>Lote: {result.batch_id}</p>
        </div>
      )}
    </div>
  )
}
