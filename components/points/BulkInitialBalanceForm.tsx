'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  campaigns: { id: string; name: string; participant_count: number }[]
}

export function BulkInitialBalanceForm({ campaigns }: Props) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState('')
  const [points, setPoints] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('Saldo inicial')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const selectedCampaign = campaigns.find(c => c.id === campaignId)

  const labelStyle = { fontSize: '0.8rem', fontWeight: 500, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', display: 'block', marginBottom: '0.35rem' } as const
  const inputStyle = { width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#3F3E3E', background: '#fff', outline: 'none' } as const
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId || !points) return
    setLoading(true)
    const res = await fetch('/api/points/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, points: parseInt(points), event_date: date, description }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao lançar saldo'); return }
    toast.success(`Saldo inicial lançado para ${json.inserted} participante(s)!`)
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="sc-btn-outline cursor-pointer flex items-center gap-1.5"
      style={{ fontSize: '0.85rem' }}
    >
      ⚡ Saldo Inicial em Lote
    </button>
  )

  return (
    <div className="sc-card" style={{ border: '1.5px solid rgba(141,178,60,0.3)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.95rem', color: '#3F3E3E' }}>Saldo Inicial em Lote</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', marginTop: '0.15rem' }}>Lança pontos para todos os participantes da campanha de uma vez</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ fontSize: '1.1rem', color: 'rgba(63,62,62,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label style={labelStyle}>Campanha</label>
          <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={selectStyle} required>
            <option value="">Selecione a campanha</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.participant_count} participante{c.participant_count !== 1 ? 's' : ''})</option>
            ))}
          </select>
          {selectedCampaign && (
            <p style={{ fontSize: '0.73rem', color: '#5C7435', marginTop: '0.3rem' }}>
              Serão criados {selectedCampaign.participant_count} lançamento(s)
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Pontos por participante</label>
            <input
              type="number"
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="Ex: 100"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Data do evento</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Descrição</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !campaignId || !points}
            className="sc-btn-primary cursor-pointer"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem', opacity: (loading || !campaignId || !points) ? 0.6 : 1 }}
          >
            {loading ? 'Lançando...' : `Lançar para ${selectedCampaign?.participant_count ?? 0} participante(s)`}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="sc-btn-outline cursor-pointer"
            style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
