'use client'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useIsDark } from './hooks/useIsDark'

export type CumDataPoint = { day: number; actual: number; target: number }

interface Props {
  data: CumDataPoint[]
  selectedDay: number | null
  formatY: (v: number) => string
  forceDark?: boolean
}

export function CumulativeLineChart({ data, selectedDay, formatY, forceDark }: Props) {
  const isDarkHook = useIsDark()
  const dark = forceDark ?? isDarkHook

  // SC Mídia brand palette — dark: muted whites; light: Onyx/Fern/Apple Green
  const legendText  = dark ? 'rgba(255,255,255,0.4)'  : 'rgba(63,62,62,0.6)'
  const legendLine  = dark ? 'rgba(255,255,255,0.28)' : 'rgba(92,116,53,0.5)'   // Fern
  const axisColor   = dark ? 'rgba(255,255,255,0.3)'  : 'rgba(63,62,62,0.45)'
  const axisLine    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(63,62,62,0.1)'
  const targetLine  = dark ? 'rgba(255,255,255,0.25)' : 'rgba(92,116,53,0.45)'  // Fern
  const refColor    = dark ? 'rgba(255,223,0,0.5)'    : 'rgba(141,178,60,0.6)'  // Apple Green
  const cursorColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(141,178,60,0.15)'
  const tooltipBg   = dark ? 'rgba(13,26,15,0.97)'    : '#F5F5F5'
  const tooltipBdr  = dark ? 'rgba(255,255,255,0.1)'  : 'rgba(141,178,60,0.3)'
  const tooltipDay  = dark ? 'rgba(255,255,255,0.35)' : 'rgba(63,62,62,0.55)'
  const tooltipSub  = dark ? 'rgba(255,255,255,0.4)'  : 'rgba(63,62,62,0.55)'

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 18, height: 2, background: '#8DB23C', borderRadius: 1 }} />
          <span style={{ fontSize: '0.65rem', color: legendText }}>Realizado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ width: 18, height: 0, borderTop: `2px dashed ${legendLine}` }} />
          <span style={{ fontSize: '0.65rem', color: legendText }}>Orçado</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cumActualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8DB23C" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#8DB23C" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: axisColor }}
            tickLine={false}
            axisLine={{ stroke: axisLine }}
            interval="preserveStartEnd"
          />

          <Tooltip
            cursor={{ stroke: cursorColor, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as CumDataPoint
              return (
                <div style={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBdr}`,
                  borderRadius: '0 0.4rem 0.4rem 0.4rem',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.74rem',
                  boxShadow: dark ? 'none' : '0 2px 8px rgba(63,62,62,0.1)',
                }}>
                  <p style={{ color: tooltipDay, margin: 0, marginBottom: '0.25rem' }}>Dia {d.day} — acumulado</p>
                  <p style={{ color: '#8DB23C', margin: 0, fontWeight: 700 }}>✓ {formatY(d.actual)}</p>
                  <p style={{ color: tooltipSub, margin: '0.15rem 0 0' }}>□ {formatY(d.target)}</p>
                </div>
              )
            }}
          />

          {selectedDay != null && (
            <ReferenceLine
              x={selectedDay}
              stroke={refColor}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          <Area
            type="monotone"
            dataKey="target"
            stroke={targetLine}
            strokeDasharray="5 2.5"
            strokeWidth={1.2}
            fill="none"
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#8DB23C"
            strokeWidth={2}
            fill="url(#cumActualGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#8DB23C', stroke: dark ? 'rgba(13,26,15,0.8)' : '#fff', strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
