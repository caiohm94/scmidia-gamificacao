'use client'
import { useEffect, useRef } from 'react'

interface Props {
  value: number
  duration?: number
  style?: React.CSSProperties
}

export function AnimatedCounter({ value, duration = 1200, style }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el!.textContent = Math.round(eased * value).toLocaleString('pt-BR')
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return (
    <span ref={ref} style={style}>
      {value.toLocaleString('pt-BR')}
    </span>
  )
}
