'use client'
import { useEffect, useRef } from 'react'
import { formatValueCompact } from '@/lib/goals/helpers'

interface Props {
  label: string
  actual: number | null
  target: number
  valueType: string
  decimalPlaces: number
  periodLabel?: string
  size?: 'sm' | 'lg'
}

function pctColor(pct: number): string {
  if (pct >= 100) return '#8DB23C'
  if (pct >= 75)  return '#FFDF00'
  if (pct > 0)    return '#ef4444'
  return 'var(--p-track)'
}

export function GoalProgressBar({ label, actual, target, valueType, decimalPlaces, periodLabel, size = 'sm' }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const pctRaw = target > 0 ? ((actual ?? 0) / target) * 100 : 0
  const pct = Math.min(pctRaw, 100)
  const barColor = pctColor(pctRaw)
  const textColor = pctRaw >= 100 ? '#8DB23C' : pctRaw >= 75 ? '#FFDF00' : pctRaw > 0 ? '#ef4444' : 'var(--p-muted)'

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    el.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'width 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.width = `${pct}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [pct])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size === 'lg' ? '0.55rem' : '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <span style={{ fontSize: size === 'lg' ? '0.88rem' : '0.82rem', fontWeight: 600, color: 'var(--p-text-dim)' }}>
            {label}
          </span>
          {periodLabel && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--p-muted)',
              background: 'var(--p-tag-bg)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem', whiteSpace: 'nowrap',
            }}>
              {periodLabel}
            </span>
          )}
          {pctRaw >= 100 && <span style={{ fontSize: '0.8rem' }}>✅</span>}
        </div>
        <span style={{ fontSize: size === 'lg' ? '0.85rem' : '0.78rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', color: textColor, whiteSpace: 'nowrap' }}>
          {formatValueCompact(actual ?? 0, valueType, decimalPlaces)}
          {' / '}
          {formatValueCompact(target, valueType, decimalPlaces)}
        </span>
      </div>

      {size === 'lg' ? (
        /* Large variant: thick bar with % inside */
        <div style={{ position: 'relative', height: 32, borderRadius: 8, background: 'var(--p-track, rgba(0,0,0,0.12))', overflow: 'hidden' }}>
          <div
            ref={barRef}
            style={{
              position: 'absolute', left: 0, top: 0,
              height: '100%', borderRadius: 8,
              background: barColor,
              width: '0%',
            }}
          />
          {/* % label centered over the entire bar */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: '0.82rem', fontWeight: 800,
              fontFamily: 'var(--font-outfit)',
              color: '#fff',
              textShadow: '0 0 6px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)',
              letterSpacing: '0.02em',
            }}>
              {Math.round(pctRaw)}%
            </span>
          </div>
        </div>
      ) : (
        /* Small variant: thin bar */
        <div style={{ height: 6, borderRadius: 3, background: 'var(--p-track)', overflow: 'hidden' }}>
          <div ref={barRef} style={{ height: '100%', borderRadius: 3, background: barColor, width: '0%' }} />
        </div>
      )}
    </div>
  )
}
