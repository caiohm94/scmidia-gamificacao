import Link from 'next/link'

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--p-card-bg, rgba(0,0,0,0.07))',
  border: '1px solid var(--p-card-border, rgba(0,0,0,0.2))',
  borderRadius: '0 0.35rem 0.35rem 0.35rem',
  padding: '0.25rem 0.65rem',
  fontSize: '1rem',
  color: 'var(--p-text, #111c12)',
  lineHeight: 1,
  fontWeight: 700,
  textDecoration: 'none',
}

function monthUrl(basePath: string, yearMonth: string, delta: number): string {
  const [y, mo] = yearMonth.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const [path, qs] = basePath.includes('?') ? basePath.split('?') : [basePath, '']
  const params = new URLSearchParams(qs)
  params.set('month', next)
  return `${path}?${params.toString()}`
}

export function MonthNav({ yearMonth, label, basePath }: { yearMonth: string; label: string; basePath: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <Link href={monthUrl(basePath, yearMonth, -1)} style={btnStyle} prefetch aria-label="Mês anterior">←</Link>
      <span style={{ fontSize: '0.82rem', color: 'var(--p-text-dim, #2a3d2b)', textTransform: 'capitalize', minWidth: 130, textAlign: 'center' }}>
        {label}
      </span>
      <Link href={monthUrl(basePath, yearMonth, +1)} style={btnStyle} prefetch aria-label="Próximo mês">→</Link>
    </div>
  )
}
