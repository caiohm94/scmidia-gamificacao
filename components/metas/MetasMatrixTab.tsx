'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getDaysInMonth, periodDateForDay, parseMonthParam, formatGoalValue } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type Participant = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null }

interface Props {
  ruleId: string
  campaignId: string
  month: string
  participants: Participant[]
}

interface CellEditState {
  userId: string
  day: number
  value: string
}

export function MetasMatrixTab({ ruleId, campaignId, month, participants }: Props) {
  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)
  const [goals, setGoals] = useState<ParticipantGoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CellEditState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${month}`)
    if (res.ok) setGoals(await res.json())
    else toast.error('Erro ao carregar metas')
    setLoading(false)
  }, [ruleId, month])

  useEffect(() => { load() }, [load])

  function getGoal(userId: string, day: number): ParticipantGoalRow | undefined {
    const date = periodDateForDay(year, m, day)
    return goals.find(g => g.user_id === userId && g.period_date === date)
  }

  async function saveCell(userId: string, day: number, value: string) {
    if (saving) return
    const numVal = parseFloat(value.replace(',', '.'))
    if (isNaN(numVal) || numVal < 0) { setEditing(null); return }
    const date = periodDateForDay(year, m, day)
    setSaving(true)
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: [{ scoring_rule_id: ruleId, campaign_id: campaignId, user_id: userId, period_date: date, target_value: numVal }],
      }),
    })
    setSaving(false)
    setEditing(null)
    if (res.ok) { await load() } else { toast.error('Erro ao salvar meta') }
  }

  async function handleReplicate(userId: string) {
    const res = await fetch('/api/goals/replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, user_id: userId, month }),
    })
    if (res.ok) {
      const { created } = await res.json()
      toast.success(`Meta replicada para ${created} dias`)
      await load()
    } else {
      const { error } = await res.json()
      toast.error(error ?? 'Erro ao replicar')
    }
  }

  async function handleCopyToAll(userId: string, userName: string) {
    if (!confirm(`Copiar todas as metas de ${userName} para os outros participantes?`)) return
    const res = await fetch('/api/goals/copy-to-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, from_user_id: userId, month }),
    })
    if (res.ok) {
      toast.success('Metas copiadas para todos')
      await load()
    } else {
      toast.error('Erro ao copiar metas')
    }
  }

  function countDaysWithMeta(userId: string) {
    return days.filter(d => {
      const g = getGoal(userId, d)
      return g && g.target_value != null
    }).length
  }

  const cellStyle = {
    padding: '0.3rem 0.4rem',
    fontSize: '0.72rem',
    textAlign: 'center' as const,
    borderRight: '1px solid rgba(63,62,62,0.06)',
    minWidth: 46,
    cursor: 'pointer',
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.1)' }}>
            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', whiteSpace: 'nowrap', minWidth: 160 }}>
              Participante
            </th>
            {days.map(d => (
              <th key={d} style={{ ...cellStyle, color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit)', fontWeight: 500 }}>
                {String(d).padStart(2, '0')}
              </th>
            ))}
            <th style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Resumo
            </th>
            <th style={{ padding: '0.3rem 0.4rem', minWidth: 120 }} />
          </tr>
        </thead>
        <tbody>
          {participants.map((p, pi) => (
            <tr key={p.id} style={{ borderTop: pi === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: '#3F3E3E', whiteSpace: 'nowrap' }}>
                {p.name}
              </td>
              {days.map(d => {
                const goal = getGoal(p.id, d)
                const isEditing = editing?.userId === p.id && editing.day === d
                return (
                  <td key={d} style={{ ...cellStyle, background: goal?.target_value ? 'rgba(141,178,60,0.04)' : 'transparent' }}
                    onClick={() => !isEditing && setEditing({ userId: p.id, day: d, value: goal?.target_value != null ? String(goal.target_value) : '' })}>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        value={editing.value}
                        onChange={e => setEditing({ ...editing, value: e.target.value })}
                        onBlur={() => saveCell(p.id, d, editing.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCell(p.id, d, editing.value); if (e.key === 'Escape') setEditing(null) }}
                        style={{ width: 52, border: '1px solid #8DB23C', borderRadius: '0 0.25rem 0.25rem 0.25rem', padding: '0.1rem 0.25rem', fontSize: '0.7rem', textAlign: 'center' }}
                        disabled={saving}
                      />
                    ) : (
                      <span style={{ color: goal?.target_value ? '#3F3E3E' : 'rgba(63,62,62,0.2)' }}>
                        {goal?.target_value != null ? formatGoalValue(goal.target_value) : '—'}
                      </span>
                    )}
                  </td>
                )
              })}
              <td style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', whiteSpace: 'nowrap' }}>
                {countDaysWithMeta(p.id)}/{days.length} dias
              </td>
              <td style={{ padding: '0.3rem 0.5rem', whiteSpace: 'nowrap' }}>
                <button onClick={() => handleReplicate(p.id)}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'rgba(141,178,60,0.1)', color: '#5C7435', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer', marginRight: '0.25rem' }}>
                  Replicar
                </button>
                <button onClick={() => handleCopyToAll(p.id, p.name)}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'rgba(63,62,62,0.06)', color: 'rgba(63,62,62,0.6)', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer' }}>
                  ↕ Todos
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {participants.length === 0 && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem', padding: '2rem', textAlign: 'center' }}>
          Nenhum participante nesta campanha.
        </p>
      )}
    </div>
  )
}
