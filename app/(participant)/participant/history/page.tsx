import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type HistoryRow = {
  id: string
  points: number
  event_date: string
  status: string
  origin: string
  description: string | null
  scoring_rules: { name: string } | null
  campaigns: { name: string } | null
}

export default async function HistoryPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: rawPoints } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name), campaigns(name)')
    .eq('user_id', user!.id)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })

  const points = (rawPoints ?? []) as HistoryRow[]

  const cardBg = 'var(--p-card-bg)'
  const cardBorder = 'var(--p-card-border)'
  const muted = 'var(--p-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>
        Histórico de Pontos
      </h1>

      {points.length === 0 && (
        <p style={{ color: muted, textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
          Nenhum ponto registrado ainda.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {points.map(pt => (
          <div
            key={pt.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '0 0.75rem 0.75rem 0.75rem',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              opacity: pt.status === 'reversed' ? 0.45 : 1,
            }}
          >
            {/* Points badge */}
            <div style={{
              minWidth: 54, textAlign: 'center', padding: '0.3rem 0.5rem',
              borderRadius: '0 0.4rem 0.4rem 0.4rem',
              background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)',
              color: pt.points > 0 ? '#8DB23C' : '#f87171',
              fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-outfit)',
            }}>
              {pt.points > 0 ? '+' : ''}{pt.points}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--p-text)' }}>
                {pt.scoring_rules?.name ?? 'Bônus'}
              </p>
              {pt.description && (
                <p style={{ margin: 0, marginTop: '0.15rem', fontSize: '0.72rem', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pt.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                {pt.campaigns?.name && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--p-muted)', background: 'var(--p-tag-bg)', padding: '0.05rem 0.35rem', borderRadius: '0.2rem' }}>
                    {pt.campaigns.name}
                  </span>
                )}
                <span style={{ fontSize: '0.65rem', color: 'var(--p-muted)' }}>
                  {pt.origin === 'salesforce' ? 'Salesforce' : pt.origin === 'manual' ? 'Manual' : pt.origin}
                </span>
                {pt.status === 'reversed' && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171' }}>Estornado</span>
                )}
              </div>
            </div>

            {/* Date */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--p-text-dim)' }}>
                {format(new Date(pt.event_date), 'dd/MM')}
              </p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>
                {format(new Date(pt.event_date), "MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
