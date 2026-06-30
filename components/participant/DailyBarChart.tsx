'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { useIsDark } from './hooks/useIsDark'

export type DailyBarPoint = {
  day: number
  pct: number | null
  actual: number
  target: number
}

interface Props {
  data: DailyBarPoint[]
  selectedDay: number | null
  formatV: (v: number) => string
}

export function DailyBarChart({ data, selectedDay, formatV }: Props) {
  const dark = useIsDark()

  const validPcts = data.flatMap(d => d.pct != null ? [d.pct] : [])
  const maxPct = validPcts.length ? Math.max(...validPcts) : 120
  const yMax = Math.max(130, Math.ceil(maxPct / 20) * 20 + 10)

  // SC Mídia brand palette — dark: muted whites; light: Onyx/Apple Green
  const axisColor    = dark ? 'rgba(255,255,255,0.22)' : 'rgba(63,62,62,0.55)'
  const axisLine     = dark ? 'rgba(255,255,255,0.06)' : 'rgba(63,62,62,0.12)'
  const refColor     = dark ? 'rgba(255,255,255,0.12)' : 'rgba(141,178,60,0.3)'
  const titleColor   = dark ? 'rgba(255,255,255,0.3)'  : 'rgba(63,62,62,0.45)'
  const tooltipBg    = dark ? 'rgba(8,18,10,0.97)'     : '#F5F5F5'
  const tooltipTitle = dark ? 'rgba(255,255,255,0.35)' : 'rgba(63,62,62,0.55)'
  const tooltipSub   = dark ? 'rgba(255,255,255,0.38)' : 'rgba(63,62,62,0.55)'
  const cursorFill   = dark ? 'rgba(255,255,255,0.04)' : 'rgba(141,178,60,0.06)'

  return (
    <div>
      <p style={{ margin: 0, marginBottom: '0.35rem', fontSize: '0.63rem', color: titleColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        Evolução diária
      </p>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <YAxis domain={[0, yMax]} hide />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 8, fill: axisColor }}
            tickLine={false}
            axisLine={{ stroke: axisLine }}
            interval="preserveStartEnd"
          />
          <ReferenceLine y={100} stroke={refColor} strokeDasharray="4 3" />
          <Tooltip
            cursor={{ fill: cursorFill, radius: 3 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as DailyBarPoint
              if (d.pct == null) return null
              const color = d.pct >= 100 ? '#8DB23C' : d.pct >= 75 ? '#FFDF00' : '#ef4444'
              return (
                <div style={{
                  background: tooltipBg,
                  border: `1px solid ${color}${dark ? '40' : '70'}`,
                  borderRadius: '0 0.45rem 0.45rem 0.45rem',
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.74rem',
                  minWidth: 110,
                  boxShadow: dark ? 'none' : '0 2px 8px rgba(63,62,62,0.12)',
                }}>
                  <p style={{ color: tooltipTitle, margin: 0, marginBottom: '0.25rem', fontSize: '0.66rem' }}>Dia {d.day}</p>
                  <p style={{ color, margin: 0, fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-outfit)' }}>{Math.round(d.pct)}%</p>
                  <p style={{ color: '#8DB23C', margin: '0.2rem 0 0', fontWeight: 600 }}>✓ {formatV(d.actual)}</p>
                  <p style={{ color: tooltipSub, margin: '0.08rem 0 0' }}>□ {formatV(d.target)}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive>
            {data.map(entry => (
              <Cell
                key={entry.day}
                fill={
                  entry.pct == null ? 'transparent' :
                  entry.day === selectedDay ? '#FFDF00' :
                  entry.pct >= 100 ? '#8DB23C' :
                  entry.pct >= 75 ? '#FFDF00' :
                  '#ef4444'
                }
                fillOpacity={entry.pct == null ? 0 : entry.day === selectedDay ? 1 : 0.72}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
