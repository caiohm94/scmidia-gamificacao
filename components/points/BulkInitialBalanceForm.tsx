'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Campaign { id: string; name: string; participant_count: number }
interface Participant { id: string; name: string }

interface Props {
  campaigns: Campaign[]
}

export function BulkInitialBalanceForm({ campaigns }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pointsMap, setPointsMap] = useState<Record<string, string>>({})
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('Saldo inicial')
  const [loading, setLoading] = useState(false)
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  const labelStyle = { fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', display: 'block', marginBottom: '0.35rem' } as const
  const inputStyle = { width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#3F3E3E', background: '#fff', outline: 'none' } as const

  useEffect(() => {
    if (!campaignId) { setParticipants([]); setPointsMap({}); return }
    setLoadingParticipants(true)
    fetch(`/api/campaigns/${campaignId}/participants`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ user_id: string; users: { id: string; name: string } | null }>) => {
        const ps = data.flatMap(p => p.users ? [{ id: p.users.id, name: p.users.name }] : [])
        setParticipants(ps)
        setPointsMap(Object.fromEntries(ps.map(p => [p.id, ''])))
        setLoadingParticipants(false)
      })
  }, [campaignId])

  function setAllPoints(value: string) {
    setPointsMap(Object.fromEntries(participants.map(p => [p.id, value])))
  }

  const filledCount = participants.filter(p => pointsMap[p.id] && parseInt(pointsMap[p.id]) !== 0).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const toSend = participants
      .map(p => ({ user_id: p.id, points: parseInt(pointsMap[p.id] ?? '') }))
      .filter(p => !isNaN(p.points) && p.points !== 0)
    if (toSend.length === 0) { toast.error('Informe pontos para pelo menos um participante'); return }

    setLoading(true)
    const res = await fetch('/api/points/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, participants: toSend, event_date: date, description }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao lançar saldo'); return }
    toast.success(`Saldo inicial lançado para ${json.inserted} participante(s)!`)
    setOpen(false)
    setCampaignId(''); setParticipants([]); setPointsMap({})
    router.refresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="sc-btn-outline cursor-pointer flex items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
      ⚡ Saldo Inicial em Lote
    </button>
  )

  return (
    <div className="sc-card" style={{ border: '1.5px solid rgba(141,178,60,0.3)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.95rem', color: '#3F3E3E' }}>Saldo Inicial em Lote</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', marginTop: '0.15rem' }}>Defina pontos individuais por participante</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ fontSize: '1.1rem', color: 'rgba(63,62,62,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Campanha + Data + Descrição */}
        <div>
          <label style={labelStyle}>Campanha</label>
          <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} required>
            <option value="">Selecione a campanha</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Data do evento</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Descrição</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Participants table */}
        {campaignId && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Pontos por participante {loadingParticipants ? '(carregando...)' : `(${participants.length})`}
              </label>
              {participants.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>Preencher todos:</span>
                  <input
                    type="number"
                    placeholder="pts"
                    style={{ width: 72, border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.3rem 0.3rem 0.3rem', padding: '0.25rem 0.4rem', fontSize: '0.78rem' }}
                    onChange={e => setAllPoints(e.target.value)}
                  />
                </div>
              )}
            </div>

            {participants.length > 0 && (
              <div style={{ border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 0.5rem 0.5rem 0.5rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(63,62,62,0.03)' }}>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.5)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>Participante</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.5)', borderBottom: '1px solid rgba(63,62,62,0.08)', width: 130 }}>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 500, color: '#3F3E3E' }}>{p.name}</td>
                        <td style={{ padding: '0.3rem 0.75rem' }}>
                          <input
                            type="number"
                            value={pointsMap[p.id] ?? ''}
                            onChange={e => setPointsMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="0"
                            style={{ width: '100%', border: '1px solid rgba(63,62,62,0.18)', borderRadius: '0 0.3rem 0.3rem 0.3rem', padding: '0.3rem 0.5rem', fontSize: '0.82rem', textAlign: 'right', outline: 'none' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            disabled={loading || !campaignId || filledCount === 0}
            className="sc-btn-primary cursor-pointer"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem', opacity: (loading || !campaignId || filledCount === 0) ? 0.6 : 1 }}
          >
            {loading ? 'Lançando...' : `Lançar para ${filledCount} participante(s)`}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="sc-btn-outline cursor-pointer" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
