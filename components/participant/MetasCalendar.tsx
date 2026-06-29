'use client'
import { useState } from 'react'
import { formatValueCompact } from '@/lib/goals/helpers'

type GoalEntry = {
  id: string
  actual_value: number | null
  target_value: number
  period_date: string
}

type Rule = {
  name: string
  value_type: string
  decimal_places: number
}

interface Props {
  days: number[]
  goals: GoalEntry[]
  year: number
  month: number
  today: string
  rule: Rule
}

export function MetasCalendar({ days, goals, year, month, today, rule }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const muted = 'var(--p-muted)'
  const cardBorder = 'var(--p-card-border)'
  const vt = rule.value_type
  const dp = rule.decimal_places

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function goalForDay(d: number) {
    return goals.find(g => g.period_date === dateStr(d))
  }

  function dayColors(d: number) {
    const ds = dateStr(d)
    const g = goalForDay(d)
    const isFuture = ds > today
    const isToday = ds === today
    const achieved = g != null && g.actual_value != null && g.actual_value >= g.target_value
    const hasData = g != null && g.actual_value != null

    let bg = 'rgba(255,255,255,0.06)'
    let color = muted
    let border = cardBorder
    if (!g || isFuture) { bg = 'rgba(255,255,255,0.03)'; color = 'rgba(255,255,255,0.2)' }
    else if (achieved) { bg = 'rgba(141,178,60,0.2)'; color = '#8DB23C'; border = 'rgba(141,178,60,0.3)' }
    else if (hasData) { bg = 'rgba(249,115,22,0.15)'; color = '#f97316'; border = 'rgba(249,115,22,0.25)' }

    return { bg, color, border, isToday, achieved, hasData, isFuture, g }
  }

  const selectedGoal = selectedDay != null ? goalForDay(selectedDay) : null
  const selectedDate = selectedDay != null ? dateStr(selectedDay) : null
  const selectedPct = selectedGoal && selectedGoal.target_value > 0
    ? Math.min(((selectedGoal.actual_value ?? 0) / selectedGoal.target_value) * 100, 100)
    : 0
  const selectedAchieved = selectedGoal != null
    && selectedGoal.actual_value != null
    && selectedGoal.actual_value >= selectedGoal.target_value

  // Build sparkline data for all days (only days with data, % of target)
  const sparkData = days.map(d => {
    const g = goalForDay(d)
    if (!g || g.actual_value == null || g.target_value === 0) return null
    return Math.min((g.actual_value / g.target_value) * 100, 120)
  })
  const hasSparkData = sparkData.some(v => v !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Calendar grid */}
      <p style={{ fontSize: '0.7rem', color: muted, marginBottom: '0.25rem', fontWeight: 500 }}>
        Dias do mês — clique para ver detalhes
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {days.map(d => {
          const { bg, color, border, isToday, g } = dayColors(d)
          const isSelected = selectedDay === d

          return (
            <button
              key={d}
              onClick={() => setSelectedDay(prev => prev === d ? null : d)}
              style={{
                width: 34, height: 34,
                borderRadius: isToday ? '50%' : '0 0.35rem 0.35rem 0.35rem',
                background: isSelected ? 'rgba(255,223,0,0.2)' : bg,
                border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#FFDF00' : isToday ? '#FFDF00' : border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: isToday || isSelected ? 700 : 500,
                color: isSelected ? '#FFDF00' : isToday ? '#FFDF00' : color,
                cursor: g ? 'pointer' : 'default',
                outline: 'none',
                transition: 'border 0.12s, background 0.12s',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
              }}
              disabled={!g}
              title={g ? `${formatValueCompact(g.actual_value ?? 0, vt, dp)} / ${formatValueCompact(g.target_value, vt, dp)}` : undefined}
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { color: '#8DB23C', label: 'Bateu a meta' },
          { color: '#f97316', label: 'Abaixo da meta' },
          { color: 'rgba(255,255,255,0.2)', label: 'Sem meta / futuro' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: '0.65rem', color: muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay != null && (
        <div style={{
          background: 'var(--p-card-bg)', border: '1px solid rgba(255,223,0,0.25)',
          borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.9rem',
          animation: 'fadeSlideIn 0.18s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)' }}>
                {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: muted, marginTop: '0.1rem' }}>{rule.name}</p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              style={{ background: 'none', border: 'none', color: muted, fontSize: '1.1rem', cursor: 'pointer', padding: '0.2rem 0.4rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {selectedGoal ? (
            <>
              {/* Big values */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--p-card-bg)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: selectedAchieved ? '#8DB23C' : '#f97316' }}>
                    {formatValueCompact(selectedGoal.actual_value ?? 0, vt, dp)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>realizado</p>
                </div>
                <div style={{ background: 'var(--p-card-bg)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'rgba(255,255,255,0.6)' }}>
                    {formatValueCompact(selectedGoal.target_value, vt, dp)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>meta</p>
                </div>
                <div style={{ background: selectedAchieved ? 'rgba(141,178,60,0.1)' : 'rgba(249,115,22,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem', border: `1px solid ${selectedAchieved ? 'rgba(141,178,60,0.25)' : 'rgba(249,115,22,0.2)'}` }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: selectedAchieved ? '#8DB23C' : '#f97316' }}>
                    {Math.round(selectedPct)}%
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>{selectedAchieved ? '✅ meta batida' : 'atingido'}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--p-track)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 5,
                    width: `${selectedPct}%`,
                    background: selectedAchieved ? '#8DB23C' : selectedPct >= 70 ? '#FFDF00' : '#f97316',
                    transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                </div>
              </div>

              {/* Sparkline — all days of month */}
              {hasSparkData && (
                <div>
                  <p style={{ margin: 0, marginBottom: '0.4rem', fontSize: '0.65rem', color: muted }}>Evolução do mês</p>
                  <svg width="100%" height="48" viewBox={`0 0 ${days.length * 14} 48`} preserveAspectRatio="none">
                    {days.map((d, i) => {
                      const val = sparkData[i]
                      if (val === null) return null
                      const barH = Math.max(3, (val / 100) * 44)
                      const isThisDay = d === selectedDay
                      const barColor = val >= 100 ? '#8DB23C' : val >= 70 ? '#FFDF00' : '#f97316'
                      return (
                        <rect
                          key={d}
                          x={i * 14 + 1}
                          y={48 - barH}
                          width={11}
                          height={barH}
                          rx={2}
                          fill={isThisDay ? '#FFDF00' : barColor}
                          opacity={isThisDay ? 1 : 0.55}
                        />
                      )
                    })}
                    {/* 100% line */}
                    <line x1={0} y1={4} x2={days.length * 14} y2={4} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="3 3" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', textAlign: 'right' }}>barra amarela = dia selecionado</p>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: muted, fontSize: '0.82rem', textAlign: 'center', padding: '0.5rem' }}>
              Sem meta registrada para este dia.
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
