'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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
  targetPeriod?: string
}

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function RealizadoTab({ ruleId, campaignId, participants, valueType, decimalPlaces, targetPeriod }: Props) {
  const isMonthly = targetPeriod === 'monthly'
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [goals, setGoals] = useState<ParticipantGoalRow[]>([])
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({})
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

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
    if (isMonthly) {
      const daily = goals.find(g => g.user_id === userId && g.period_date === selectedDate)
      if (daily) return daily
      const [y, mo] = selectedDate.split('-')
      const monthlyDate = `${y}-${mo}-01`
      return goals.find(g => g.user_id === userId && g.period_date === monthlyDate)
    }
    return goals.find(g => g.user_id === userId && g.period_date === selectedDate)
  }

  function pctFor(goal: ParticipantGoalRow | undefined, inputValue: string) {
    if (!goal?.target_value) return null
    const actual = parseFloat(inputValue)
    if (isNaN(actual)) return null
    return (actual / goal.target_value) * 100
  }

  async function handleSaveAll() {
    const goalsToSave = participants
      .map(p => {
        const val = actualInputs[p.id]
        const goal = getGoalForDate(p.id)
        if (!goal?.target_value || val === undefined || val === '') return null
        const num = parseFloat(val.replace(',', '.'))
        if (isNaN(num)) return null
        const [y, mo] = selectedDate.split('-')
        const saveDate = isMonthly ? `${y}-${mo}-01` : selectedDate
        return {
          scoring_rule_id: ruleId,
          campaign_id: campaignId,
          user_id: p.id,
          period_date: saveDate,
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

  // Key navigation: Enter/Tab to move to next row
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const next = participants[idx + 1]
      if (next) {
        inputRefs.current[next.id]?.focus()
      } else {
        handleSaveAll()
      }
    }
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem', padding: '1rem 0' }}>Carregando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <style>{`
        .realizado-cell-input {
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          padding: 0;
          font-size: 0.85rem;
          font-family: var(--font-outfit, sans-serif);
          color: #1a1a1a;
          caret-color: #1557b0;
        }
        .realizado-cell-input:disabled {
          color: rgba(63,62,62,0.35);
          cursor: default;
        }
        .realizado-cell-input::placeholder {
          color: rgba(63,62,62,0.3);
        }
        .realizado-row:hover .realizado-cell {
          background: rgba(66,133,244,0.04);
        }
        .realizado-cell.focused {
          background: #e8f0fe !important;
          box-shadow: inset 0 0 0 2px #1557b0;
        }
      `}</style>

      {/* Date picker row — minimal, spreadsheet-toolbar style */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.4rem 0.6rem',
        background: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '0 0.3rem 0.3rem 0.3rem',
        width: 'fit-content',
      }}>
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, -1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.35rem', fontSize: '0.9rem', color: '#5f6368', lineHeight: 1 }}
        >←</button>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.82rem', color: '#3c4043', fontFamily: 'var(--font-outfit)', cursor: 'pointer' }}
        />
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, +1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.35rem', fontSize: '0.9rem', color: '#5f6368', lineHeight: 1 }}
        >→</button>
        <span style={{ borderLeft: '1px solid #e0e0e0', paddingLeft: '0.5rem', marginLeft: '0.1rem', fontSize: '0.78rem', color: '#80868b', fontFamily: 'var(--font-outfit)' }}>
          {formatDateLabel(selectedDate)}
        </span>
      </div>

      {/* Spreadsheet table */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: '0 0.4rem 0.4rem 0.4rem', overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
              {['Participante', 'Meta', 'Realizado', 'Atingido'].map(h => (
                <th key={h} style={{
                  padding: '0.45rem 0.75rem', textAlign: 'left',
                  fontSize: '0.72rem', fontWeight: 600,
                  color: '#5f6368', letterSpacing: '0.02em',
                  borderRight: h !== 'Atingido' ? '1px solid #e0e0e0' : 'none',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const goal = getGoalForDate(p.id)
              const inputVal = actualInputs[p.id] ?? (goal?.actual_value != null ? String(goal.actual_value) : '')
              const pct = pctFor(goal, inputVal)
              const isFocused = focusedId === p.id
              const canEdit = !!(goal?.target_value) && !goal?.points_awarded

              return (
                <tr key={p.id} className="realizado-row" style={{ borderTop: i === 0 ? 'none' : '1px solid #e0e0e0' }}>
                  {/* Participante */}
                  <td className="realizado-cell" style={{ padding: '0 0.75rem', height: 36, borderRight: '1px solid #e0e0e0', color: '#3c4043', fontWeight: 500 }}>
                    {p.name}
                  </td>

                  {/* Meta */}
                  <td className="realizado-cell" style={{ padding: '0 0.75rem', height: 36, borderRight: '1px solid #e0e0e0', color: '#5f6368' }}>
                    {goal?.target_value != null
                      ? formatValueFull(goal.target_value, valueType, decimalPlaces)
                      : <span style={{ color: '#bdbdbd' }}>Sem meta</span>}
                  </td>

                  {/* Realizado — editable cell */}
                  <td
                    className={`realizado-cell${isFocused ? ' focused' : ''}`}
                    style={{ padding: '0 0.75rem', height: 36, borderRight: '1px solid #e0e0e0', cursor: canEdit ? 'text' : 'default', minWidth: 120 }}
                    onClick={() => canEdit && inputRefs.current[p.id]?.focus()}
                  >
                    <input
                      ref={el => { inputRefs.current[p.id] = el }}
                      type="number"
                      className="realizado-cell-input"
                      value={inputVal}
                      onChange={e => setActualInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onFocus={() => setFocusedId(p.id)}
                      onBlur={() => setFocusedId(null)}
                      onKeyDown={e => handleKeyDown(e, i)}
                      disabled={!canEdit}
                      placeholder={canEdit ? '0' : '—'}
                      title={goal?.points_awarded ? 'Pontos já gerados' : (!goal?.target_value ? 'Defina a meta primeiro' : '')}
                      step={decimalPlaces > 0 ? Math.pow(10, -decimalPlaces) : 1}
                    />
                    {goal?.points_awarded && (
                      <span style={{ fontSize: '0.68rem', color: '#5C7435', marginLeft: '0.3rem' }}>✓</span>
                    )}
                  </td>

                  {/* Atingido % */}
                  <td className="realizado-cell" style={{ padding: '0 0.75rem', height: 36 }}>
                    {pct != null ? (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: pct >= 100 ? '#2e7d32' : pct >= 75 ? '#8B6914' : '#c62828',
                      }}>
                        {pct >= 100 ? '✅ ' : ''}{Math.round(pct)}%
                      </span>
                    ) : (
                      <span style={{ color: '#bdbdbd', fontSize: '0.75rem' }}>—</span>
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
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
