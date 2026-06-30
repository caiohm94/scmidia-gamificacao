'use client'
import { format } from 'date-fns'

export type PointEntry = {
  id: string
  points: number
  event_date: string
  description: string | null
  scoring_rules: { name: string } | null
}

export function PointsHistory({ points }: { points: PointEntry[] }) {
  if (points.length === 0) {
    return (
      <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--p-muted, #6b7d6c)', fontSize: '0.82rem' }}>
        Nenhum ponto ainda.
      </p>
    )
  }

  return (
    <>
      {points.map(pt => (
        <div
          key={pt.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid var(--p-card-border, rgba(0,0,0,0.07))',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--p-text, #111c12)', margin: 0, fontWeight: 500 }}>
              {pt.scoring_rules?.name ?? 'Bônus'}
            </p>
            {pt.description && (
              <p style={{
                fontSize: '0.68rem', color: 'var(--p-muted, #6b7d6c)',
                margin: 0, marginTop: '0.1rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pt.description.replace(/^SF Import — [^(]+/, '').replace(/^\s*—\s*/, '').replace(/[()]/g, '').trim() || pt.description}
              </p>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--p-muted, #6b7d6c)', whiteSpace: 'nowrap' }}>
            {format(new Date(pt.event_date), 'dd/MM')}
          </span>
          <span style={{
            fontSize: '0.8rem', fontWeight: 700, padding: '0.15rem 0.55rem',
            borderRadius: '0 0.25rem 0.25rem 0.25rem', whiteSpace: 'nowrap',
            background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)',
            color: pt.points > 0 ? '#8DB23C' : '#f87171',
          }}>
            {pt.points > 0 ? '+' : ''}{pt.points}
          </span>
        </div>
      ))}
    </>
  )
}
