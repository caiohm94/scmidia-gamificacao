'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'

interface Rule {
  id: string
  name: string
  points: number
  description?: string | null
  target_period?: string | null
}

interface Props {
  campaignId: string
  rule: Rule
}

export function EditRuleButton({ campaignId, rule }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: rule.name,
    points: String(rule.points),
    description: rule.description ?? '',
    target_period: rule.target_period ?? '',
  })

  const inputStyle = { width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#3F3E3E', background: '#fff', outline: 'none' } as const
  const labelStyle = { fontSize: '0.75rem', fontWeight: 500, color: 'rgba(63,62,62,0.6)', display: 'block', marginBottom: '0.2rem' } as const

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        points: parseInt(form.points),
        description: form.description || undefined,
        target_period: form.target_period || undefined,
      }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao atualizar regra'); return }
    toast.success('Regra atualizada!')
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      title="Editar regra"
      style={{ background: 'none', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.3rem 0.3rem 0.3rem', padding: '0.2rem 0.5rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}
    >
      <Pencil size={11} />
      Editar
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1.5rem', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.95rem', color: '#3F3E3E' }}>Editar Regra</p>
          <button onClick={() => setOpen(false)} style={{ fontSize: '1.2rem', color: 'rgba(63,62,62,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label style={labelStyle}>Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Pontos *</label>
              <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Período</label>
              <select value={form.target_period} onChange={e => setForm(f => ({ ...f, target_period: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Nenhum</option>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Opcional" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="sc-btn-primary cursor-pointer" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="sc-btn-outline cursor-pointer" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
