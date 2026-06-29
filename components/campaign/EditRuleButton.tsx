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
  applies_to?: string | null
  category?: string | null
  data_origin?: string | null
  sf_soql?: string | null
  sf_value_field?: string | null
  sf_alias_field?: string | null
  sf_frequency?: string | null
  sf_run_time?: string | null
  sf_run_day?: number | null
  value_type?: string | null
  decimal_places?: number | null
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
    applies_to: rule.applies_to ?? 'all',
    category: rule.category ?? 'goal',
    data_origin: rule.data_origin ?? 'manual',
    sf_soql: rule.sf_soql ?? '',
    sf_alias_field: rule.sf_alias_field ?? 'Owner.Alias',
    sf_frequency: rule.sf_frequency ?? '',
    sf_run_time: rule.sf_run_time ?? '',
    sf_run_day: rule.sf_run_day != null ? String(rule.sf_run_day) : '',
    value_type: rule.value_type ?? 'number',
    decimal_places: String(rule.decimal_places ?? 0),
  })

  const isSF = form.data_origin === 'salesforce'

  const inputStyle = {
    width: '100%', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
    padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#3F3E3E', background: '#fff',
    outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    fontSize: '0.75rem', fontWeight: 500 as const, color: 'rgba(63,62,62,0.6)',
    display: 'block', marginBottom: '0.2rem',
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: Record<string, unknown> = {
      name: form.name,
      points: parseInt(form.points),
      description: form.description || undefined,
      target_period: form.target_period || undefined,
      applies_to: form.applies_to,
      category: form.category,
      data_origin: form.data_origin,
      value_type: form.value_type,
      decimal_places: parseInt(form.decimal_places) || 0,
    }
    if (isSF) {
      payload.sf_soql = form.sf_soql || null
      payload.sf_alias_field = form.sf_alias_field || 'Owner.Alias'
      payload.sf_frequency = form.sf_frequency || null
      payload.sf_run_time = form.sf_run_time || null
      payload.sf_run_day = form.sf_run_day !== '' ? parseInt(form.sf_run_day) : null
    } else {
      payload.sf_soql = null
      payload.sf_frequency = null
      payload.sf_run_time = null
      payload.sf_run_day = null
    }
    const res = await fetch(`/api/campaigns/${campaignId}/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div style={{ background: '#fff', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.95rem', color: '#3F3E3E' }}>Editar Regra</p>
          <button onClick={() => setOpen(false)} style={{ fontSize: '1.2rem', color: 'rgba(63,62,62,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
          </div>

          {/* Pontos + Categoria */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Pontos *</label>
              <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="goal">Meta</option>
                <option value="activity">Atividade</option>
                <option value="behavior">Comportamento</option>
                <option value="bonus">Bônus</option>
                <option value="penalty">Penalidade</option>
              </select>
            </div>
          </div>

          {/* Tipo de valor + Casas decimais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Tipo de valor</label>
              <select value={form.value_type} onChange={e => setForm(f => ({ ...f, value_type: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="number">Número</option>
                <option value="currency">Monetário (R$)</option>
                <option value="percentage">Percentual (%)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Casas decimais</label>
              <input
                type="number"
                min="0"
                max="4"
                value={form.decimal_places}
                onChange={e => setForm(f => ({ ...f, decimal_places: e.target.value }))}
                style={inputStyle}
                placeholder="0"
              />
            </div>
          </div>

          {/* Aplica-se a + Período */}
          <div style={{ display: 'grid', gridTemplateColumns: form.category === 'goal' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Aplica-se a</label>
              <select value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="all">Todos</option>
                <option value="internal_seller">Vendedor Interno</option>
                <option value="external_seller">Vendedor Externo</option>
                <option value="hunter">Hunter</option>
              </select>
            </div>
            {form.category === 'goal' && (
              <div>
                <label style={labelStyle}>Período</label>
                <select value={form.target_period} onChange={e => setForm(f => ({ ...f, target_period: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Nenhum</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Opcional" />
          </div>

          {/* Origem dos dados */}
          <div>
            <label style={labelStyle}>Origem dos dados</label>
            <select value={form.data_origin} onChange={e => setForm(f => ({ ...f, data_origin: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="manual">Manual</option>
              <option value="salesforce">Salesforce</option>
            </select>
          </div>

          {/* Salesforce fields */}
          {isSF && (
            <>
              <div>
                <label style={labelStyle}>Query SOQL *</label>
                <textarea
                  value={form.sf_soql}
                  onChange={e => setForm(f => ({ ...f, sf_soql: e.target.value }))}
                  rows={4}
                  placeholder={`SELECT Id, Owner.Name, Owner.Alias, Account.Name, Description, CreatedDate\nFROM Task\nWHERE Subject = 'Chamada'`}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.2rem' }}>A query deve retornar registros individuais com: Id, Owner.Alias (para match), e opcionalmente Owner.Name, Account.Name, Description, CreatedDate.</p>
              </div>

              <div>
                <label style={labelStyle}>Campo do alias</label>
                <input value={form.sf_alias_field} onChange={e => setForm(f => ({ ...f, sf_alias_field: e.target.value }))} placeholder="ex: Owner.Alias" style={inputStyle} />
                <p style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.2rem' }}>Campo da SOQL que contém o alias do usuário no Salesforce.</p>
              </div>

              <div>
                <label style={labelStyle}>Frequência de sincronização *</label>
                <select value={form.sf_frequency} onChange={e => setForm(f => ({ ...f, sf_frequency: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Selecione...</option>
                  <option value="5min">A cada 5 minutos</option>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>

              {(form.sf_frequency === 'daily' || form.sf_frequency === 'weekly') && (
                <div style={{ display: 'grid', gridTemplateColumns: form.sf_frequency === 'weekly' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Horário</label>
                    <input type="time" value={form.sf_run_time} onChange={e => setForm(f => ({ ...f, sf_run_time: e.target.value }))} style={inputStyle} />
                  </div>
                  {form.sf_frequency === 'weekly' && (
                    <div>
                      <label style={labelStyle}>Dia da semana</label>
                      <select value={form.sf_run_day} onChange={e => setForm(f => ({ ...f, sf_run_day: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Selecione...</option>
                        <option value="0">Domingo</option>
                        <option value="1">Segunda</option>
                        <option value="2">Terça</option>
                        <option value="3">Quarta</option>
                        <option value="4">Quinta</option>
                        <option value="5">Sexta</option>
                        <option value="6">Sábado</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
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
