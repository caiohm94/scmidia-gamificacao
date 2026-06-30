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
  is_cumulative?: boolean
}

export function MetasCalendar({ days, goals, year, month, today, rule, is_cumulative }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

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

    let bg = 'var(--p-card-bg)'
    let color = muted
    let border = cardBorder
    if (!g || isFuture) { bg = 'transparent'; color = muted }
    else if (achieved) { bg = 'rgba(141,178,60,0.2)'; color = '#8DB23C'; border = 'rgba(141,178,60,0.3)' }
    else if (hasData) { bg = 'rgba(249,115,22,0.15)'; color = '#f97316'; border = 'rgba(249,115,22,0.25)' }

    return { bg, color, border, isToday, achieved, hasData, isFuture, g }
  }

  const selectedGoal = selectedDay != null ? goalForDay(selectedDay) : null
  const selectedDate = selectedDay != null ? dateStr(selectedDay) : null
  // Real % without capping — user can exceed 100%
  const selectedPctRaw = selectedGoal && selectedGoal.target_value > 0
    ? ((selectedGoal.actual_value ?? 0) / selectedGoal.target_value) * 100
    : 0
  const selectedPct = Math.min(selectedPctRaw, 100) // for visual bar only
  const selectedAchieved = selectedGoal != null
    && selectedGoal.actual_value != null
    && selectedGoal.actual_value >= selectedGoal.target_value

  // Acumulado: usa a data do dia selecionado quando há seleção, senão usa hoje
  const cutoffDate = selectedDate ?? today
  const monthTotalActual = goals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
  const monthTargetUntilCutoff = goals.filter(g => g.period_date <= cutoffDate).reduce((s, g) => s + g.target_value, 0)
  const monthPctRaw = monthTargetUntilCutoff > 0 ? (monthTotalActual / monthTargetUntilCutoff) * 100 : 0
  const monthPct = Math.min(monthPctRaw, 100) // bar only — display uses raw
  const monthAchieved = monthTotalActual >= monthTargetUntilCutoff && monthTargetUntilCutoff > 0

  // Bar chart data
  const sparkData = days.map(d => {
    const g = goalForDay(d)
    if (!g || g.actual_value == null || g.target_value === 0) return null
    return {
      pct: Math.min((g.actual_value / g.target_value) * 100, 120),
      val: g.actual_value,
      target: g.target_value,
    }
  })
  const hasSparkData = sparkData.some(v => v !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
          { color: muted, label: 'Sem meta / futuro' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: '0.65rem', color: muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Cumulative line chart — always visible for cumulative indicators */}
      {is_cumulative && (() => {
        const cumActual: number[] = []
        const cumTarget: number[] = []
        let runA = 0, runT = 0
        for (const d of days) {
          const g = goalForDay(d)
          if (g) { runA += g.actual_value ?? 0; runT += g.target_value }
          cumActual.push(runA)
          cumTarget.push(runT)
        }
        const maxVal = Math.max(...cumActual, ...cumTarget, 1)
        const n = days.length
        const toX = (i: number) => ((i / Math.max(n - 1, 1)) * 98 + 1).toFixed(2)
        const toY = (v: number) => (38 - (v / maxVal) * 36).toFixed(2)
        const tPts = days.map((_, i) => `${toX(i)},${toY(cumTarget[i])}`).join(' ')
        const aPts = days.map((_, i) => `${toX(i)},${toY(cumActual[i])}`).join(' ')
        const hasData = cumTarget.some(v => v > 0)
        if (!hasData) return null
        return (
          <div style={{ marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 14, height: 2, background: '#8DB23C', borderRadius: 1 }} />
                <span style={{ fontSize: '0.62rem', color: muted }}>Realizado</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 14, height: 2, background: 'var(--p-muted, rgba(255,255,255,0.3))', borderRadius: 1, borderTop: '1px dashed var(--p-muted, rgba(255,255,255,0.3))' }} />
                <span style={{ fontSize: '0.62rem', color: muted }}>Orçado</span>
              </div>
            </div>
            <svg viewBox="0 0 100 40" style={{ width: '100%', height: 70, display: 'block' }}>
              {/* zero line */}
              <line x1="1" y1="38" x2="99" y2="38" stroke="var(--p-separator, rgba(255,255,255,0.05))" strokeWidth="0.5" />
              {/* target line (dashed) */}
              <polyline points={tPts} fill="none" strokeWidth="0.8" strokeDasharray="2,1.2"
                style={{ stroke: 'var(--p-muted, rgba(255,255,255,0.3))' }} />
              {/* actual area fill */}
              <polyline points={`1,38 ${aPts} ${toX(n - 1)},38`} fill="rgba(141,178,60,0.1)" stroke="none" />
              {/* actual line */}
              <polyline points={aPts} fill="none" stroke="#8DB23C" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )
      })()}

      {/* Day detail panel */}
      {selectedDay != null && (
        <div style={{
          background: 'var(--p-card-bg)', border: '1px solid rgba(255,223,0,0.25)',
          borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.9rem',
          animation: 'fadeSlideIn 0.18s ease',
        }}>
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
              {/* Individual day values */}
              {is_cumulative && (
                <p style={{ margin: 0, fontSize: '0.68rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Este dia
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--p-card-bg)', border: `1px solid ${cardBorder}`, borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: selectedAchieved ? '#8DB23C' : '#f97316' }}>
                    {formatValueCompact(selectedGoal.actual_value ?? 0, vt, dp)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>realizado</p>
                </div>
                <div style={{ background: 'var(--p-card-bg)', border: `1px solid ${cardBorder}`, borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--p-text-dim)' }}>
                    {formatValueCompact(selectedGoal.target_value, vt, dp)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>meta</p>
                </div>
                <div style={{ background: selectedAchieved ? 'rgba(141,178,60,0.1)' : 'rgba(249,115,22,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem', border: `1px solid ${selectedAchieved ? 'rgba(141,178,60,0.25)' : 'rgba(249,115,22,0.2)'}` }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: selectedAchieved ? '#8DB23C' : '#f97316' }}>
                    {Math.round(selectedPctRaw)}%
                  </p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>{selectedAchieved ? '✅ meta batida' : 'atingido'}</p>
                </div>
              </div>

              {/* Accumulated totals for cumulative rules */}
              {is_cumulative && (
                <>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--p-separator)', paddingTop: '0.75rem' }}>
                    Acumulado no mês
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                    <div style={{ background: 'var(--p-card-bg)', border: `1px solid ${cardBorder}`, borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                      <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: monthAchieved ? '#8DB23C' : '#f97316' }}>
                        {formatValueCompact(monthTotalActual, vt, dp)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>realizado</p>
                    </div>
                    <div style={{ background: 'var(--p-card-bg)', border: `1px solid ${cardBorder}`, borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem' }}>
                      <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--p-text-dim)' }}>
                        {formatValueCompact(monthTargetUntilCutoff, vt, dp)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>{selectedDate ? `orçado até dia ${selectedDay}` : 'orçado até hoje'}</p>
                    </div>
                    <div style={{ background: monthAchieved ? 'rgba(141,178,60,0.1)' : 'rgba(249,115,22,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem', border: `1px solid ${monthAchieved ? 'rgba(141,178,60,0.25)' : 'rgba(249,115,22,0.2)'}` }}>
                      <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: monthAchieved ? '#8DB23C' : '#f97316' }}>
                        {Math.round(monthPctRaw)}%
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>{monthAchieved ? '✅ meta batida' : 'atingido'}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Progress bar — for cumulative shows month progress up to today */}
              <div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--p-track, rgba(0,0,0,0.09))', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 5,
                    width: `${is_cumulative ? monthPct : selectedPct}%`,
                    background: (is_cumulative ? monthAchieved : selectedAchieved) ? '#8DB23C' : (is_cumulative ? monthPct : selectedPct) >= 70 ? '#FFDF00' : '#f97316',
                    transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                </div>
              </div>

              {/* CSS bar chart — no SVG distortion */}
              {hasSparkData && (
                <div>
                  <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.65rem', color: muted }}>Evolução do mês</p>

                  {/* Hover tooltip summary */}
                  <div style={{ minHeight: 32, marginBottom: '0.4rem' }}>
                    {hoveredDay !== null && (() => {
                      const hi = days.indexOf(hoveredDay)
                      const hEntry = sparkData[hi]
                      const hGoal = goalForDay(hoveredDay)
                      if (!hEntry || !hGoal) return null
                      const ds = dateStr(hoveredDay)
                      const dateLabel = new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
                      const pctLabel = Math.round(hEntry.pct)
                      const pctColor = hEntry.pct >= 100 ? '#8DB23C' : hEntry.pct >= 70 ? '#FFDF00' : '#f97316'
                      return (
                        <div style={{
                          background: 'rgba(13,26,15,0.88)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
                          padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center',
                          gap: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap',
                        }}>
                          <span style={{ color: 'rgba(255,255,255,0.45)' }}>{dateLabel}</span>
                          <span style={{ color: '#8DB23C', fontWeight: 700 }}>✓ {formatValueCompact(hEntry.val, vt, dp)}</span>
                          <span style={{ color: 'rgba(255,255,255,0.45)' }}>□ {formatValueCompact(hGoal.target_value, vt, dp)}</span>
                          <span style={{ color: pctColor, fontWeight: 600 }}>{pctLabel}%</span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: 60, gap: '2px' }}>
                    {days.map((d, i) => {
                      const entry = sparkData[i]
                      const isThisDay = d === selectedDay
                      const isHovered = hoveredDay === d
                      if (!entry) return <div key={d} style={{ flex: 1 }} />
                      const { pct } = entry
                      const barH = Math.max(3, (pct / 100) * 56)
                      const barColor = pct >= 100 ? '#8DB23C' : pct >= 70 ? '#FFDF00' : '#f97316'
                      return (
                        <div
                          key={d}
                          style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredDay(d)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          <div style={{
                            width: '100%', height: barH,
                            background: isThisDay ? '#FFDF00' : barColor,
                            opacity: isThisDay ? 1 : isHovered ? 1 : 0.55,
                            borderRadius: '2px 2px 0 0',
                            transition: 'opacity 0.1s',
                          }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ height: 1, background: 'var(--p-separator, rgba(0,0,0,0.06))' }} />
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
