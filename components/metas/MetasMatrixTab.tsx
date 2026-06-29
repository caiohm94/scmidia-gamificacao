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


function parseRaw(raw: string): number | null {
  const cleaned = raw.trim().replace(/R\$\s?/g, '').replace(/\s/g, '')
  if (!cleaned) return null
  const normalized = /\d,\d/.test(cleaned)
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

const CELL_W = 78
const NAME_W = 190
const ROW_H = 40
const BORDER = '1px solid #e2e4e7'
const BORDER_HEAVY = '2px solid #d0d3d8'

export function MetasMatrixTab({ ruleId, campaignId, month, participants, valueType, decimalPlaces }: Props) {
  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)

  const [savedValues, setSavedValues] = useState<Record<string, number>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const cellKey = (userId: string, date: string) => `${userId}::${date}`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${month}`)
    if (res.ok) {
      const goals: ParticipantGoalRow[] = await res.json()
      const next: Record<string, number> = {}
      for (const g of goals) {
        if (g.target_value != null) next[cellKey(g.user_id, g.period_date)] = g.target_value
      }
      setSavedValues(next)
    } else {
      toast.error('Erro ao carregar metas')
    }
    setLoading(false)
  }, [ruleId, month])

  useEffect(() => { load() }, [load])

  function focusCell(pi: number, di: number) {
    const p = participants[pi]
    if (!p) return
    const key = cellKey(p.id, periodDateForDay(year, m, days[di]))
    cellRefs.current[key]?.focus()
  }

  function handleFocus(userId: string, date: string) {
    const key = cellKey(userId, date)
    const saved = savedValues[key]
    setEditingKey(key)
    setEditText(saved !== undefined ? String(saved) : '')
  }

  async function handleBlurSave(userId: string, date: string) {
    const key = cellKey(userId, date)
    const parsed = parseRaw(editText)
    setEditingKey(null)
    setEditText('')
    if (parsed !== null && parsed !== savedValues[key]) {
      setSavedValues(prev => ({ ...prev, [key]: parsed }))
      await saveCells([{ userId, date, value: parsed }])
    }
  }

  async function saveCells(cells: Array<{ userId: string; date: string; value: number }>) {
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

  function commit(userId: string, date: string) {
    const key = cellKey(userId, date)
    const parsed = parseRaw(editText)
    if (parsed !== null && parsed !== savedValues[key]) {
      setSavedValues(prev => ({ ...prev, [key]: parsed }))
      saveCells([{ userId, date, value: parsed }])
    }
    setEditingKey(null)
    setEditText('')
  }

  function handleKeyDown(e: React.KeyboardEvent, pi: number, di: number) {
    const userId = participants[pi].id
    const date = periodDateForDay(year, m, days[di])
    const inp = e.target as HTMLInputElement

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault(); commit(userId, date)
      if (di < days.length - 1) focusCell(pi, di + 1)
      else if (pi < participants.length - 1) focusCell(pi + 1, 0)
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault(); commit(userId, date)
      if (di > 0) focusCell(pi, di - 1)
      else if (pi > 0) focusCell(pi - 1, days.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault(); commit(userId, date)
      if (pi < participants.length - 1) focusCell(pi + 1, di)
    } else if (e.key === 'ArrowRight' && inp.selectionStart === editText.length) {
      e.preventDefault(); if (di < days.length - 1) focusCell(pi, di + 1)
    } else if (e.key === 'ArrowLeft' && inp.selectionStart === 0) {
      e.preventDefault(); if (di > 0) focusCell(pi, di - 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); if (pi < participants.length - 1) focusCell(pi + 1, di)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); if (pi > 0) focusCell(pi - 1, di)
    }
  }

  function handlePaste(e: React.ClipboardEvent, pi: number, di: number) {
    e.preventDefault()
    const rows = e.clipboardData.getData('text').trimEnd().split('\n').map(r => r.split('\t'))
    const cells: Array<{ userId: string; date: string; value: number }> = []
    const next = { ...savedValues }
    rows.forEach((row, ro) => {
      row.forEach((cell, co) => {
        const npi = pi + ro; const ndi = di + co
        if (npi >= participants.length || ndi >= days.length) return
        const num = parseRaw(cell)
        if (num !== null) {
          const uid = participants[npi].id
          const date = periodDateForDay(year, m, days[ndi])
          next[cellKey(uid, date)] = num
          cells.push({ userId: uid, date, value: num })
        }
      })
    })
    setSavedValues(next); setEditingKey(null)
    if (cells.length > 0) saveCells(cells)
  }

  async function handleReplicate(userId: string) {
    const res = await fetch('/api/goals/replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, user_id: userId, month }),
    })
    if (res.ok) { const { created } = await res.json(); toast.success(`Replicado para ${created} dias`); await load() }
    else toast.error('Erro ao replicar')
  }

  async function handleCopyToAll(userId: string, userName: string) {
    if (!confirm(`Copiar metas de ${userName} para todos os participantes?`)) return
    const res = await fetch('/api/goals/copy-to-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, from_user_id: userId, month }),
    })
    if (res.ok) { toast.success('Metas copiadas para todos'); await load() }
    else toast.error('Erro ao copiar')
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div>
      {saving && (
        <p style={{ fontSize: '0.7rem', color: '#8DB23C', marginBottom: '0.3rem' }}>Salvando...</p>
      )}
      <div style={{ overflowX: 'auto', border: BORDER, borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: NAME_W }} />
            {days.map(d => <col key={d} style={{ width: CELL_W }} />)}
            <col style={{ width: 136 }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{
                position: 'sticky', left: 0, zIndex: 3, background: '#f8f9fa',
                padding: '0.5rem 0.75rem', textAlign: 'left',
                fontFamily: 'var(--font-outfit)', fontWeight: 600, fontSize: '0.72rem',
                color: 'rgba(63,62,62,0.55)', letterSpacing: '0.02em', textTransform: 'uppercase',
                borderBottom: BORDER_HEAVY, borderRight: BORDER_HEAVY,
              }}>
                Participante
              </th>
              {days.map(d => (
                <th key={d} style={{
                  padding: '0.5rem 0.25rem', textAlign: 'center',
                  fontFamily: 'var(--font-outfit)', fontWeight: 600, fontSize: '0.7rem',
                  color: 'rgba(63,62,62,0.5)',
                  borderBottom: BORDER_HEAVY, borderRight: BORDER,
                }}>
                  {String(d).padStart(2, '0')}
                </th>
              ))}
              <th style={{
                padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.7rem',
                color: 'rgba(63,62,62,0.4)', fontFamily: 'var(--font-outfit)', fontWeight: 500,
                borderBottom: BORDER_HEAVY, borderLeft: BORDER_HEAVY,
              }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(63,62,62,0.35)', fontSize: '0.85rem' }}>
                  Nenhum participante nesta campanha.
                </td>
              </tr>
            ) : participants.map((p, pi) => (
              <tr key={p.id}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 2, background: '#fff',
                  padding: '0 0.75rem', height: ROW_H,
                  fontWeight: 500, fontSize: '0.82rem', color: '#3F3E3E', whiteSpace: 'nowrap',
                  borderTop: BORDER, borderRight: BORDER_HEAVY,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {p.name}
                </td>
                {days.map((d, di) => {
                  const date = periodDateForDay(year, m, d)
                  const key = cellKey(p.id, date)
                  const isEditing = editingKey === key
                  const saved = savedValues[key]
                  const hasValue = saved !== undefined

                  return (
                    <td key={d} style={{
                      padding: 0, height: ROW_H,
                      borderTop: BORDER, borderRight: BORDER,
                      background: hasValue ? 'rgba(141,178,60,0.06)' : '#fff',
                      outline: isEditing ? '2px solid #8DB23C' : 'none',
                      outlineOffset: -2,
                    }}>
                      <input
                        ref={el => { cellRefs.current[key] = el }}
                        type="text"
                        inputMode={decimalPlaces > 0 ? 'decimal' : 'numeric'}
                        value={isEditing ? editText : (hasValue ? formatValueCompact(saved, valueType, decimalPlaces) : '')}
                        placeholder="—"
                        onChange={e => isEditing && setEditText(e.target.value)}
                        onFocus={() => handleFocus(p.id, date)}
                        onBlur={() => handleBlurSave(p.id, date)}
                        onKeyDown={e => handleKeyDown(e, pi, di)}
                        onPaste={e => handlePaste(e, pi, di)}
                        style={{
                          width: '100%', height: '100%', boxSizing: 'border-box',
                          border: 'none', outline: 'none', background: 'transparent',
                          padding: '0 0.5rem',
                          fontSize: '0.78rem', textAlign: 'right',
                          color: hasValue ? '#3F3E3E' : 'rgba(63,62,62,0.2)',
                          cursor: 'cell',
                          fontFamily: 'var(--font-outfit, sans-serif)',
                          caretColor: '#8DB23C',
                        }}
                      />
                    </td>
                  )
                })}
                <td style={{
                  borderTop: BORDER, borderLeft: BORDER_HEAVY,
                  padding: '0 0.5rem', whiteSpace: 'nowrap', textAlign: 'center', height: ROW_H,
                }}>
                  <button onClick={() => handleReplicate(p.id)}
                    title="Replicar para todos os dias do mês"
                    style={{ fontSize: '0.67rem', padding: '0.2rem 0.45rem', background: 'rgba(141,178,60,0.12)', color: '#5C7435', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer', marginRight: '0.3rem' }}>
                    Replicar
                  </button>
                  <button onClick={() => handleCopyToAll(p.id, p.name)}
                    title="Copiar metas para todos os participantes"
                    style={{ fontSize: '0.67rem', padding: '0.2rem 0.45rem', background: 'rgba(63,62,62,0.07)', color: 'rgba(63,62,62,0.55)', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer' }}>
                    ↕ Todos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
