'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatValueFull } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type Participant = { id: string; name: string }

interface Props {
  ruleId: string
  campaignId: string
  participants: Participant[]
  valueType: string
  decimalPlaces: number
}

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function RealizadoTab({ ruleId, campaignId, participants, valueType, decimalPlaces }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [goals, setGoals] = useState<ParticipantGoalRow[]>([])
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [year, m] = selectedDate.split('-').map(Number)

  const load = useCallback(async () => {
    setLoading(true)
    const monthStr = `${year}-${String(m).padStart(2, '0')}`
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${monthStr}`)
    if (res.ok) {
      const data: ParticipantGoalRow[] = await res.json()
      setGoals(data)
      const inputs: Record<string, string> = {}
      for (const g of data) {
        if (g.period_date === selectedDate && g.actual_value != null) {
          inputs[g.user_id] = String(g.actual_value)
        }
      }
      setActualInputs(inputs)
    }
    setLoading(false)
  }, [ruleId, year, m, selectedDate])

  useEffect(() => { load() }, [load])

  function getGoalForDate(userId: string) {
    return goals.find(g => g.user_id === userId && g.period_date === selectedDate)
  }

  function getStatus(goal: ParticipantGoalRow | undefined, inputValue: string) {
    if (!goal?.target_value) return null
    const actual = parseFloat(inputValue)
    if (isNaN(actual)) return null
    const pct = Math.round((actual / goal.target_value) * 100)
    if (actual >= goal.target_value) return { label: '✅ Bateu', color: '#5C7435', bg: 'rgba(92,116,53,0.1)' }
    return { label: `${pct}%`, color: '#8B6914', bg: 'rgba(255,193,7,0.15)' }
  }

  async function handleSaveAll() {
    const goalsToSave = participants
      .map(p => {
        const val = actualInputs[p.id]
        const goal = getGoalForDate(p.id)
        if (!goal?.target_value || val === undefined || val === '') return null
        const num = parseFloat(val.replace(',', '.'))
        if (isNaN(num)) return null
        return {
          scoring_rule_id: ruleId,
          campaign_id: campaignId,
          user_id: p.id,
          period_date: selectedDate,
          target_value: goal.target_value,
          actual_value: num,
        }
      })
      .filter(Boolean)

    if (goalsToSave.length === 0) { toast.error('Nenhum realizado para salvar'); return }

    setSaving(true)
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals: goalsToSave }),
    })
    setSaving(false)

    if (res.ok) {
      const { awarded } = await res.json()
      if (awarded > 0) toast.success(`${awarded} participante(s) atingiram a meta — pontos gerados!`)
      else toast.success('Realizado salvo')
      await load()
    } else {
      toast.error('Erro ao salvar')
    }
  }

  const inputStyle = {
    border: '1px solid rgba(63,62,62,0.2)',
    borderRadius: '0 0.35rem 0.35rem 0.35rem',
    padding: '0.3rem 0.5rem',
    fontSize: '0.82rem',
    color: '#3F3E3E',
    width: 120,
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'rgba(63,62,62,0.6)', fontFamily: 'var(--font-outfit)' }}>Data:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
              {['Participante', 'Meta', 'Realizado', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-outfit)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const goal = getGoalForDate(p.id)
              const inputVal = actualInputs[p.id] ?? (goal?.actual_value != null ? String(goal.actual_value) : '')
              const status = getStatus(goal, inputVal)
              return (
                <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: '#3F3E3E' }}>{p.name}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'rgba(63,62,62,0.6)', fontSize: '0.82rem' }}>
                    {goal?.target_value != null
                      ? formatValueFull(goal.target_value, valueType, decimalPlaces)
                      : <span style={{ color: 'rgba(63,62,62,0.3)' }}>Sem meta</span>}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <input
                      type="number"
                      value={inputVal}
                      onChange={e => setActualInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      disabled={!goal?.target_value || goal.points_awarded}
                      placeholder={goal?.target_value ? '0' : '—'}
                      title={goal?.points_awarded ? 'Pontos já gerados' : (!goal?.target_value ? 'Defina a meta primeiro' : '')}
                      style={{ ...inputStyle, opacity: (!goal?.target_value || goal.points_awarded) ? 0.45 : 1 }}
                    />
                    {goal?.points_awarded && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#5C7435' }}>✓ pontuado</span>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    {status ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.3)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="sc-btn-primary"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Salvando...' : 'Salvar tudo'}
        </button>
      </div>
    </div>
  )
}
