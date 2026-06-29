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
}

export function GoalProgressBar({ label, actual, target, valueType, decimalPlaces, periodLabel }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const pct = target > 0 ? Math.min(((actual ?? 0) / target) * 100, 100) : 0
  const achieved = (actual ?? 0) >= target && target > 0

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    el.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.width = `${pct}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [pct])

  const barColor = achieved ? '#8DB23C' : pct >= 70 ? '#FFDF00' : 'var(--p-track)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--p-text-dim)' }}>
            {label}
          </span>
          {periodLabel && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--p-muted)',
              background: 'var(--p-tag-bg)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem',
            }}>
              {periodLabel}
            </span>
          )}
          {achieved && <span style={{ fontSize: '0.7rem' }}>✅</span>}
        </div>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-outfit)',
          color: achieved ? '#8DB23C' : 'var(--p-muted)',
        }}>
          {formatValueCompact(actual ?? 0, valueType, decimalPlaces)}
          {' / '}
          {formatValueCompact(target, valueType, decimalPlaces)}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--p-track)', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', borderRadius: 3, background: barColor, width: '0%' }} />
      </div>
    </div>
  )
}
