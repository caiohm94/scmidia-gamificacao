import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import type { CampaignRanking } from '@/types/database'
import Image from 'next/image'

const MEDALS = ['🥇', '🥈', '🥉']

const fnLabel: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
}

function ClassificacaoList({ rows, highlightUserId }: { rows: CampaignRanking[]; highlightUserId?: string }) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--p-card-bg)', border: '1px solid var(--p-card-border)', borderRadius: '0 1rem 1rem 1rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--p-muted)' }}>Nenhum participante ainda.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map(row => {
        const isMe = row.user_id === highlightUserId
        const isTop3 = row.position <= 3
        return (
          <div key={row.user_id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: '0 0.75rem 0.75rem 0.75rem',
            background: isMe ? 'rgba(141,178,60,0.12)' : 'var(--p-card-bg)',
            border: isMe ? '2px solid #8DB23C' : '1px solid var(--p-card-border)',
            boxShadow: isMe ? '0 2px 16px rgba(141,178,60,0.15)' : undefined,
            position: 'relative',
          }}>
            {/* Position */}
            <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
              {isTop3
                ? <span style={{ fontSize: '1.4rem' }}>{MEDALS[row.position - 1]}</span>
                : <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%',
                    background: isMe ? 'rgba(141,178,60,0.2)' : 'rgba(255,255,255,0.07)',
                    fontSize: '0.78rem', fontWeight: 700,
                    color: isMe ? '#8DB23C' : 'var(--p-muted)',
                  }}>{row.position}</span>}
            </div>

            {/* Avatar */}
            <div style={{
              width: 64, height: 64, flexShrink: 0,
              borderRadius: '0 0.6rem 0.6rem 0.6rem',
              overflow: 'hidden',
              border: isMe ? '2px solid #8DB23C' : '1.5px solid rgba(255,255,255,0.1)',
            }}>
              {row.avatar_url ? (
                <Image
                  src={row.avatar_url}
                  alt={row.name ?? ''}
                  width={128}
                  height={128}
                  priority={row.position <= 5}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-outfit)' }}>
                  {row.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            {/* Name + tag */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <p style={{
                  fontWeight: isMe ? 800 : 600,
                  fontSize: isMe ? '0.95rem' : '0.88rem',
                  color: isMe ? '#8DB23C' : 'var(--p-text)',
                  fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.name || '—'}
                </p>
                {isMe && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.4rem',
                    borderRadius: '0 0.3rem 0.3rem 0.3rem',
                    background: '#8DB23C', color: '#fff', flexShrink: 0,
                    fontFamily: 'var(--font-outfit)',
                  }}>Você</span>
                )}
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                {row.team_name ? (
                  <span style={{
                    fontSize: '0.63rem', padding: '0.05rem 0.35rem',
                    borderRadius: '0 0.2rem 0.2rem 0.2rem',
                    background: (row.team_color ?? '#8DB23C') + '20',
                    color: row.team_color ?? '#8DB23C', fontWeight: 600,
                  }}>{row.team_name}</span>
                ) : row.function ? (
                  <span style={{ fontSize: '0.63rem', color: 'var(--p-muted)' }}>{fnLabel[row.function] ?? row.function}</span>
                ) : null}
              </div>
            </div>

            {/* Streak */}
            {row.current_streak > 0 && (
              <div style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>
                🔥{row.current_streak}
              </div>
            )}

            {/* Points */}
            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 64 }}>
              <p style={{
                fontFamily: 'var(--font-outfit)', fontWeight: 800,
                fontSize: isTop3 || isMe ? '1.3rem' : '1.05rem',
                color: isMe ? '#8DB23C' : isTop3 ? '#FFDF00' : 'var(--p-text)',
                margin: 0, lineHeight: 1,
                textShadow: isTop3 ? '0 0 20px rgba(255,223,0,0.3)' : undefined,
              }}>
                {row.total_points.toLocaleString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.58rem', color: 'var(--p-muted)', margin: 0 }}>pts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function ParticipantRankingPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]
  if (!campaign) return <div style={{ padding: '1.5rem', color: 'var(--p-muted)' }}>Nenhuma campanha ativa.</div>

  const [overall, teamRanking] = await Promise.all([
    getRanking(supabase, { campaign_id: campaign.id }),
    user?.team_id ? getRanking(supabase, { campaign_id: campaign.id, team_id: user.team_id }) : Promise.resolve([]),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>
        🏆 Classificação Geral
      </h1>

      {teamRanking.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Geral</p>
            <ClassificacaoList rows={overall} highlightUserId={user?.id} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Meu Time</p>
            <ClassificacaoList rows={teamRanking} highlightUserId={user?.id} />
          </div>
        </div>
      ) : (
        <ClassificacaoList rows={overall} highlightUserId={user?.id} />
      )}
    </div>
  )
}
