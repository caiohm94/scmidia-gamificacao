'use client'
import { useRouter } from 'next/navigation'

const btnStyle: React.CSSProperties = {
  background: 'var(--p-card-bg, rgba(0,0,0,0.06))',
  border: '1px solid var(--p-card-border, rgba(0,0,0,0.18))',
  borderRadius: '0 0.35rem 0.35rem 0.35rem',
  padding: '0.2rem 0.6rem',
  cursor: 'pointer',
  fontSize: '0.95rem',
  color: 'var(--p-text, #111c12)',
  lineHeight: 1,
  fontWeight: 600,
}

export function MonthNav({ yearMonth, label, basePath }: { yearMonth: string; label: string; basePath: string }) {
  const router = useRouter()

  function shift(delta: number) {
    const [y, mo] = yearMonth.split('-').map(Number)
    const d = new Date(y, mo - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    // Preserve existing query params in basePath (e.g. ?tab=metas)
    const url = new URL(basePath, window.location.href)
    url.searchParams.set('month', next)
    router.push(url.pathname + url.search)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button style={btnStyle} onClick={() => shift(-1)} aria-label="Mês anterior">←</button>
      <span style={{ fontSize: '0.82rem', color: 'var(--p-text-dim, #2a3d2b)', textTransform: 'capitalize', minWidth: 130, textAlign: 'center' }}>
        {label}
      </span>
      <button style={btnStyle} onClick={() => shift(+1)} aria-label="Próximo mês">→</button>
    </div>
  )
}
