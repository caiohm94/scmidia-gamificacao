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
  const selectedPct = selectedGoal && selectedGoal.target_value > 0
    ? Math.min(((selectedGoal.actual_value ?? 0) / selectedGoal.target_value) * 100, 100)
    : 0
  const selectedAchieved = selectedGoal != null
    && selectedGoal.actual_value != null
    && selectedGoal.actual_value >= selectedGoal.target_value

  // Month totals for cumulative
  const monthTotalActual = goals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
  const monthTotalTarget = goals.reduce((s, g) => s + g.target_value, 0)
  const monthPct = monthTotalTarget > 0 ? Math.min((monthTotalActual / monthTotalTarget) * 100, 100) : 0
  const monthAchieved = monthTotalActual >= monthTotalTarget && monthTotalTarget > 0

  // Sparkline data
  const sparkData = days.map(d => {
    const g = goalForDay(d)
    if (!g || g.actual_value == null || g.target_value === 0) return null
    return {
      pct: Math.min((g.actual_value / g.target_value) * 100, 120),
      val: g.actual_value,
    }
  })
  const hasSparkData = sparkData.some(v => v !== null)

  const svgW = days.length * 14
  const barAreaH = 52
  const labelH = 26
  const svgH = barAreaH + labelH

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
                    {Math.round(selectedPct)}%
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
                        {formatValueCompact(monthTotalTarget, vt, dp)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>orçado</p>
                    </div>
                    <div style={{ background: monthAchieved ? 'rgba(141,178,60,0.1)' : 'rgba(249,115,22,0.08)', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem', border: `1px solid ${monthAchieved ? 'rgba(141,178,60,0.25)' : 'rgba(249,115,22,0.2)'}` }}>
                      <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: monthAchieved ? '#8DB23C' : '#f97316' }}>
                        {Math.round(monthPct)}%
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>{monthAchieved ? '✅ meta batida' : 'atingido'}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Progress bar */}
              <div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--p-track)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 5,
                    width: `${is_cumulative ? monthPct : selectedPct}%`,
                    background: (is_cumulative ? monthAchieved : selectedAchieved) ? '#8DB23C' : (is_cumulative ? monthPct : selectedPct) >= 70 ? '#FFDF00' : '#f97316',
                    transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                </div>
              </div>

              {/* Sparkline with value labels */}
              {hasSparkData && (
                <div>
                  <p style={{ margin: 0, marginBottom: '0.4rem', fontSize: '0.65rem', color: muted }}>Evolução do mês</p>
                  <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
                    {days.map((d, i) => {
                      const entry = sparkData[i]
                      if (entry === null) return null
                      const { pct, val } = entry
                      const barH = Math.max(3, (pct / 100) * barAreaH)
                      const isThisDay = d === selectedDay
                      const barColor = pct >= 100 ? '#8DB23C' : pct >= 70 ? '#FFDF00' : '#f97316'
                      const barX = i * 14 + 1
                      const barY = labelH + barAreaH - barH
                      const label = formatValueCompact(val, vt, dp)
                      return (
                        <g
                          key={d}
                          onMouseEnter={() => setHoveredDay(d)}
                          onMouseLeave={() => setHoveredDay(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Wider invisible hit area */}
                          <rect x={barX - 1} y={labelH} width={13} height={barAreaH} fill="transparent" />
                          <rect
                            x={barX}
                            y={barY}
                            width={11}
                            height={barH}
                            rx={2}
                            fill={isThisDay ? '#FFDF00' : barColor}
                            opacity={isThisDay ? 1 : hoveredDay === d ? 1 : 0.6}
                          />
                          <text
                            x={barX + 5.5}
                            y={labelH - 4}
                            textAnchor="middle"
                            fontSize={9}
                            fill={isThisDay ? '#FFDF00' : barColor}
                            opacity={isThisDay ? 1 : 0.8}
                            fontFamily="var(--font-outfit, sans-serif)"
                            fontWeight={isThisDay ? 700 : 500}
                          >
                            {label}
                          </text>
                        </g>
                      )
                    })}
                    {/* 100% reference line */}
                    <line x1={0} y1={labelH + 2} x2={svgW} y2={labelH + 2} stroke="var(--p-track)" strokeWidth={1} strokeDasharray="3 3" />

                    {/* Hover tooltip */}
                    {hoveredDay !== null && (() => {
                      const hi = days.indexOf(hoveredDay)
                      const hEntry = sparkData[hi]
                      const hGoal = goalForDay(hoveredDay)
                      if (!hEntry || !hGoal) return null
                      const cx = hi * 14 + 7
                      const tw = 96
                      const tx = Math.max(2, Math.min(cx - tw / 2, svgW - tw - 2))
                      return (
                        <g>
                          <rect x={tx} y={labelH + 6} width={tw} height={32} rx={4} fill="rgba(13,26,15,0.92)" />
                          <text x={tx + 7} y={labelH + 20} fontSize={8.5} fill="#8DB23C" fontFamily="sans-serif" fontWeight={700}>
                            ✓ {formatValueCompact(hEntry.val, vt, dp)}
                          </text>
                          <text x={tx + 7} y={labelH + 32} fontSize={8.5} fill="rgba(255,255,255,0.6)" fontFamily="sans-serif">
                            □ {formatValueCompact(hGoal.target_value, vt, dp)}
                          </text>
                        </g>
                      )
                    })()}
                  </svg>
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
