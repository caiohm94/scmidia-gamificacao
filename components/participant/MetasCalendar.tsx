'use client'
import { useState } from 'react'
import { formatValueCompact } from '@/lib/goals/helpers'
import { CumulativeLineChart } from './CumulativeLineChart'
import { DailyBarChart } from './DailyBarChart'
import type { CumDataPoint } from './CumulativeLineChart'
import type { DailyBarPoint } from './DailyBarChart'

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

function perfColor(pct: number): { bg: string; color: string; border: string } {
  if (pct >= 100) return { bg: 'rgba(141,178,60,0.2)', color: '#8DB23C', border: 'rgba(141,178,60,0.3)' }
  if (pct >= 75)  return { bg: 'rgba(255,223,0,0.12)', color: '#FFDF00', border: 'rgba(255,223,0,0.25)' }
  return               { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  border: 'rgba(239,68,68,0.25)' }
}

export function MetasCalendar({ days, goals, year, month, today, rule, is_cumulative }: Props) {
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
    const hasData = g != null && g.actual_value != null && g.target_value > 0
    const pct = hasData ? ((g!.actual_value ?? 0) / g!.target_value) * 100 : -1

    let bg = 'var(--p-card-bg)'
    let color = muted as string
    let border = cardBorder as string
    if (!g || isFuture) { bg = 'transparent'; color = muted as string }
    else if (hasData) {
      const c = perfColor(pct)
      bg = c.bg; color = c.color; border = c.border
    }
    return { bg, color, border, isToday, pct, g }
  }

  const selectedGoal = selectedDay != null ? goalForDay(selectedDay) : null
  const selectedDate = selectedDay != null ? dateStr(selectedDay) : null

  const selectedPctRaw = selectedGoal && selectedGoal.target_value > 0
    ? ((selectedGoal.actual_value ?? 0) / selectedGoal.target_value) * 100
    : 0
  const selectedPct = Math.min(selectedPctRaw, 100)
  const selectedColor = selectedPctRaw >= 100 ? '#8DB23C' : selectedPctRaw >= 75 ? '#FFDF00' : '#ef4444'

  const cutoffDate = selectedDate ?? today
  const monthTotalActual = goals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
  const monthTargetUntilCutoff = goals.filter(g => g.period_date <= cutoffDate).reduce((s, g) => s + g.target_value, 0)
  const monthPctRaw = monthTargetUntilCutoff > 0 ? (monthTotalActual / monthTargetUntilCutoff) * 100 : 0
  const monthPct = Math.min(monthPctRaw, 100)
  const monthAchieved = monthTotalActual >= monthTargetUntilCutoff && monthTargetUntilCutoff > 0
  const monthColor = monthPctRaw >= 100 ? '#8DB23C' : monthPctRaw >= 75 ? '#FFDF00' : '#ef4444'

  // Recharts bar chart data for daily view (non-cumulative)
  const dailyBarData: DailyBarPoint[] = days.map(d => {
    const g = goalForDay(d)
    if (!g || g.actual_value == null || g.target_value === 0) return { day: d, pct: null, actual: 0, target: 0 }
    return { day: d, pct: (g.actual_value / g.target_value) * 100, actual: g.actual_value, target: g.target_value }
  })
  const hasDailyData = dailyBarData.some(d => d.pct != null)

  // Recharts area chart data for cumulative view
  const cumChartData: CumDataPoint[] = (() => {
    if (!is_cumulative) return []
    let runA = 0, runT = 0
    return days.map(d => {
      const g = goalForDay(d)
      if (g) { runA += g.actual_value ?? 0; runT += g.target_value }
      return { day: d, actual: runA, target: runT }
    }).filter(p => p.target > 0)
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.7rem', color: muted, marginBottom: '0.25rem', fontWeight: 500 }}>
        Dias do mês — clique para ver detalhes
      </p>

      {/* Day grid */}
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
                background: isSelected ? 'rgba(255,223,0,0.18)' : bg,
                border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#FFDF00' : isToday ? '#FFDF00' : border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: isToday || isSelected ? 700 : 500,
                color: isSelected ? '#FFDF00' : isToday ? '#FFDF00' : color,
                cursor: g ? 'pointer' : 'default',
                outline: 'none',
                transition: 'border 0.12s, background 0.12s, transform 0.1s',
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
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        {[
          { color: '#8DB23C', label: '≥ 100%' },
          { color: '#FFDF00', label: '75–99%' },
          { color: '#ef4444', label: '< 75%' },
          { color: muted, label: 'Sem meta / futuro' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: '0.62rem', color: muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay != null && (
        <div style={{
          background: 'var(--p-card-bg)',
          border: '1px solid rgba(255,223,0,0.2)',
          borderRadius: '0 0.75rem 0.75rem 0.75rem',
          padding: '1rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          animation: 'fadeSlideIn 0.18s ease',
        }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)' }}>
                {selectedDate
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                  : ''}
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
              {/* "Este dia" label for cumulative */}
              {is_cumulative && (
                <p style={{ margin: 0, fontSize: '0.65rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Este dia
                </p>
              )}

              {/* Daily value cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                <StatCard value={formatValueCompact(selectedGoal.actual_value ?? 0, vt, dp)} label="realizado" color={selectedColor} cardBorder={cardBorder} />
                <StatCard value={formatValueCompact(selectedGoal.target_value, vt, dp)} label="meta" color="var(--p-text-dim)" cardBorder={cardBorder} />
                <StatCard
                  value={`${Math.round(selectedPctRaw)}%`}
                  label={selectedPctRaw >= 100 ? '✅ meta batida' : 'atingido'}
                  color={selectedColor}
                  cardBorder={cardBorder}
                  tinted={selectedPctRaw}
                />
              </div>

              {/* Cumulative section */}
              {is_cumulative && (
                <>
                  <div style={{ height: 1, background: 'var(--p-separator, rgba(255,255,255,0.06))' }} />
                  <p style={{ margin: 0, fontSize: '0.65rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Acumulado no mês
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                    <StatCard value={formatValueCompact(monthTotalActual, vt, dp)} label="realizado" color={monthColor} cardBorder={cardBorder} />
                    <StatCard value={formatValueCompact(monthTargetUntilCutoff, vt, dp)} label={`orçado até dia ${selectedDay}`} color="var(--p-text-dim)" cardBorder={cardBorder} />
                    <StatCard
                      value={`${Math.round(monthPctRaw)}%`}
                      label={monthAchieved ? '✅ meta batida' : 'atingido'}
                      color={monthColor}
                      cardBorder={cardBorder}
                      tinted={monthPctRaw}
                    />
                  </div>

                  {/* Cumulative line chart (only for cumulative rules) */}
                  {cumChartData.length > 1 && (
                    <CumulativeLineChart
                      data={cumChartData}
                      selectedDay={selectedDay}
                      formatY={v => formatValueCompact(v, vt, dp)}
                    />
                  )}
                </>
              )}

              {/* Progress bar */}
              <div>
                <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--p-track, rgba(0,0,0,0.12))', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4,
                    width: `${is_cumulative ? monthPct : selectedPct}%`,
                    background: is_cumulative ? monthColor : selectedColor,
                    transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                </div>
              </div>

              {/* Daily bar chart (only for non-cumulative rules) */}
              {!is_cumulative && hasDailyData && (
                <DailyBarChart
                  data={dailyBarData}
                  selectedDay={selectedDay}
                  formatV={v => formatValueCompact(v, vt, dp)}
                />
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
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function StatCard({
  value, label, color, cardBorder, tinted,
}: {
  value: string; label: string; color: string; cardBorder: string; tinted?: number
}) {
  const bg = tinted != null
    ? tinted >= 100 ? 'rgba(141,178,60,0.1)' : tinted >= 75 ? 'rgba(255,223,0,0.07)' : 'rgba(239,68,68,0.08)'
    : 'var(--p-card-bg)'
  const border = tinted != null
    ? tinted >= 100 ? 'rgba(141,178,60,0.25)' : tinted >= 75 ? 'rgba(255,223,0,0.2)' : 'rgba(239,68,68,0.2)'
    : cardBorder
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.6rem 0.4rem' }}>
      <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color }}>{value}</p>
      <p style={{ margin: 0, fontSize: '0.62rem', color: 'var(--p-muted)', marginTop: '0.1rem' }}>{label}</p>
    </div>
  )
}
