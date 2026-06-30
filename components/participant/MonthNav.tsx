'use client'
import { useRouter } from 'next/navigation'

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--p-card-border, rgba(0,0,0,0.1))',
  borderRadius: '0 0.35rem 0.35rem 0.35rem',
  padding: '0.2rem 0.55rem',
  cursor: 'pointer',
  fontSize: '0.85rem',
  color: 'var(--p-text-dim, #2a3d2b)',
  lineHeight: 1,
}

export function MonthNav({ yearMonth, label, basePath }: { yearMonth: string; label: string; basePath: string }) {
  const router = useRouter()

  function shift(delta: number) {
    const [y, mo] = yearMonth.split('-').map(Number)
    const d = new Date(y, mo - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`${basePath}?month=${next}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button style={btnStyle} onClick={() => shift(-1)} aria-label="Mês anterior">←</button>
      <span style={{ fontSize: '0.82rem', color: 'var(--p-muted, #6b7d6c)', textTransform: 'capitalize', minWidth: 120, textAlign: 'center' }}>
        {label}
      </span>
      <button style={btnStyle} onClick={() => shift(+1)} aria-label="Próximo mês">→</button>
    </div>
  )
}
