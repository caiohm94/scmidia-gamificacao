'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { getDaysInMonth, periodDateForDay, parseMonthParam, formatValueCompact } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type Participant = { id: string; name: string }

interface Props {
  ruleId: string
  campaignId: string
  month: string
  participants: Participant[]
  valueType: string
  decimalPlaces: number
}

export function MetasMatrixTab({ ruleId, campaignId, month, participants, valueType, decimalPlaces }: Props) {
  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)

  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const cellKey = (userId: string, date: string) => `${userId}::${date}`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${month}`)
    if (res.ok) {
      const goals: ParticipantGoalRow[] = await res.json()
      const next: Record<string, string> = {}
      for (const g of goals) {
        if (g.target_value != null) next[cellKey(g.user_id, g.period_date)] = String(g.target_value)
      }
      setValues(next)
    } else {
      toast.error('Erro ao carregar metas')
    }
    setLoading(false)
  }, [ruleId, month])

  useEffect(() => { load() }, [load])

  function focusCell(pi: number, di: number) {
    const p = participants[pi]
    if (!p) return
    const date = periodDateForDay(year, m, days[di])
    const el = cellRefs.current[cellKey(p.id, date)]
    if (el) { el.focus(); el.select() }
  }

  async function saveCells(cells: Array<{ userId: string; date: string; value: number }>) {
    if (saving) return
    setSaving(true)
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: cells.map(c => ({
          scoring_rule_id: ruleId,
          campaign_id: campaignId,
          user_id: c.userId,
          period_date: c.date,
          target_value: c.value,
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) toast.error('Erro ao salvar meta')
  }

  function handleBlur(userId: string, date: string) {
    const raw = values[cellKey(userId, date)] ?? ''
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num >= 0) saveCells([{ userId, date, value: num }])
  }

  function handleKeyDown(e: React.KeyboardEvent, pi: number, di: number) {
    const userId = participants[pi].id
    const date = periodDateForDay(year, m, days[di])

    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const raw = values[cellKey(userId, date)] ?? ''
      const num = parseFloat(raw.replace(',', '.'))
      if (!isNaN(num) && num >= 0) saveCells([{ userId, date, value: num }])
      if (e.key === 'Tab') {
        if (di < days.length - 1) focusCell(pi, di + 1)
        else if (pi < participants.length - 1) focusCell(pi + 1, 0)
      } else {
        if (pi < participants.length - 1) focusCell(pi + 1, di)
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (di > 0) focusCell(pi, di - 1)
      else if (pi > 0) focusCell(pi - 1, days.length - 1)
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
      e.preventDefault(); if (di < days.length - 1) focusCell(pi, di + 1)
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      e.preventDefault(); if (di > 0) focusCell(pi, di - 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); if (pi < participants.length - 1) focusCell(pi + 1, di)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); if (pi > 0) focusCell(pi - 1, di)
    }
  }

  function handlePaste(e: React.ClipboardEvent, pi: number, di: number) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const rows = text.trimEnd().split('\n').map(r => r.split('\t'))
    const cells: Array<{ userId: string; date: string; value: number }> = []
    const next = { ...values }

    rows.forEach((row, rowOff) => {
      row.forEach((cell, colOff) => {
        const npi = pi + rowOff
        const ndi = di + colOff
        if (npi >= participants.length || ndi >= days.length) return
        const raw = cell.trim().replace(/[R$\s.]/g, '').replace(',', '.')
        const num = parseFloat(raw)
        if (!isNaN(num) && num >= 0) {
          const userId = participants[npi].id
          const date = periodDateForDay(year, m, days[ndi])
          next[cellKey(userId, date)] = String(num)
          cells.push({ userId, date, value: num })
        }
      })
    })

    setValues(next)
    if (cells.length > 0) saveCells(cells)
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
      toast.error('Erro ao replicar')
    }
  }

  async function handleCopyToAll(userId: string, userName: string) {
    if (!confirm(`Copiar todas as metas de ${userName} para os outros participantes?`)) return
    const res = await fetch('/api/goals/copy-to-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, from_user_id: userId, month }),
    })
    if (res.ok) { toast.success('Metas copiadas para todos'); await load() }
    else toast.error('Erro ao copiar metas')
  }

  function countDaysWithMeta(userId: string) {
    return days.filter(d => {
      const k = cellKey(userId, periodDateForDay(year, m, d))
      const v = parseFloat(values[k] ?? '')
      return !isNaN(v) && v >= 0
    }).length
  }

  const headerCell: React.CSSProperties = {
    padding: '0.4rem 0.3rem', fontSize: '0.7rem', textAlign: 'center',
    color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit)', fontWeight: 500,
    borderRight: '1px solid rgba(63,62,62,0.06)', minWidth: 52, whiteSpace: 'nowrap',
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      {saving && <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.4)', marginBottom: '0.4rem' }}>Salvando...</p>}
      <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: 'rgba(63,62,62,0.03)', borderBottom: '1px solid rgba(63,62,62,0.1)' }}>
            <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-outfit)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', minWidth: 160, whiteSpace: 'nowrap' }}>
              Participante
            </th>
            {days.map(d => (
              <th key={d} style={headerCell}>{String(d).padStart(2, '0')}</th>
            ))}
            <th style={{ ...headerCell, minWidth: 70 }}>Resumo</th>
            <th style={{ minWidth: 120 }} />
          </tr>
        </thead>
        <tbody>
          {participants.map((p, pi) => (
            <tr key={p.id} style={{ borderTop: pi === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
              <td style={{ padding: '0.25rem 0.75rem', fontWeight: 500, color: '#3F3E3E', whiteSpace: 'nowrap' }}>
                {p.name}
              </td>
              {days.map((d, di) => {
                const date = periodDateForDay(year, m, d)
                const key = cellKey(p.id, date)
                const raw = values[key] ?? ''
                const hasVal = raw !== '' && !isNaN(parseFloat(raw))
                return (
                  <td key={d} style={{ padding: '0.15rem 0.1rem', borderRight: '1px solid rgba(63,62,62,0.06)', background: hasVal ? 'rgba(141,178,60,0.04)' : 'transparent' }}>
                    <input
                      ref={el => { cellRefs.current[key] = el }}
                      type="number"
                      value={raw}
                      step={decimalPlaces > 0 ? Math.pow(10, -decimalPlaces) : 1}
                      onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => handleBlur(p.id, date)}
                      onKeyDown={e => handleKeyDown(e, pi, di)}
                      onPaste={e => handlePaste(e, pi, di)}
                      onFocus={e => e.target.select()}
                      placeholder="—"
                      title={hasVal ? formatValueCompact(parseFloat(raw), valueType, decimalPlaces) : ''}
                      style={{
                        width: 52, border: 'none', borderRadius: 0,
                        padding: '0.25rem 0.2rem', fontSize: '0.7rem',
                        textAlign: 'center', background: 'transparent',
                        color: hasVal ? '#3F3E3E' : 'rgba(63,62,62,0.2)',
                        outline: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(141,178,60,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    />
                  </td>
                )
              })}
              <td style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', color: 'rgba(63,62,62,0.45)', whiteSpace: 'nowrap' }}>
                {countDaysWithMeta(p.id)}/{days.length}
              </td>
              <td style={{ padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}>
                <button onClick={() => handleReplicate(p.id)}
                  style={{ fontSize: '0.67rem', padding: '0.15rem 0.4rem', background: 'rgba(141,178,60,0.1)', color: '#5C7435', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer', marginRight: '0.25rem' }}>
                  Replicar
                </button>
                <button onClick={() => handleCopyToAll(p.id, p.name)}
                  style={{ fontSize: '0.67rem', padding: '0.15rem 0.4rem', background: 'rgba(63,62,62,0.06)', color: 'rgba(63,62,62,0.55)', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer' }}>
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
