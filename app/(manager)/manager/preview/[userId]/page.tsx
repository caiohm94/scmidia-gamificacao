import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Avatar } from '@/components/shared/Avatar'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Tables, UserProfile } from '@/types/database'

type PointWithRule = Tables<'point_transactions'> & { scoring_rules: { name: string } | null }
type LevelEntry = { id: string; name: string; badge_icon: string; color: string; min_points: number }
type BonusEntry = { id: string; bonuses: { name: string; badge_icon: string } | null }

const fnLabel: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
}

export default async function PreviewPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireRole('manager')
  const { userId } = await params
  const admin = createAdminClient()

  const { data: userRaw } = await admin.from('users').select('*, teams(name, color)').eq('id', userId).single()
  if (!userRaw) return <div className="p-6" style={{ color: 'rgba(63,62,62,0.5)' }}>Usuário não encontrado.</div>
  const user = userRaw as unknown as UserProfile

  const { data: campaigns } = await admin.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  const { data: rawPoints } = await admin
    .from('point_transactions')
    .select('*, scoring_rules(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const myPoints = (rawPoints ?? []) as PointWithRule[]
  const totalPoints = myPoints.reduce((sum, p) => sum + p.points, 0)

  let myPosition: number | null = null
  let myStreak = 0
  let currentLevel: LevelEntry | undefined
  let earnedBonuses: BonusEntry[] = []

  if (campaign) {
    const ranking = await getRanking(admin, { campaign_id: campaign.id })
    const me = ranking.find(r => r.user_id === userId)
    myPosition = me?.position ?? null
    myStreak = me?.current_streak ?? 0

    const { data: levels } = await admin
      .from('levels').select('id, name, badge_icon, color, min_points')
      .eq('campaign_id', campaign.id)
      .lte('min_points', totalPoints)
      .order('min_points', { ascending: false }).limit(1)
    currentLevel = levels?.[0] as LevelEntry | undefined

    const { data: bonuses } = await admin
      .from('user_bonuses').select('id, bonuses(name, badge_icon)')
      .eq('user_id', userId).eq('campaign_id', campaign.id)
    earnedBonuses = (bonuses ?? []) as BonusEntry[]
  }

  const statCard = (value: string, label: string, color: string) => (
    <div style={{
      background: '#fff', border: '1px solid rgba(63,62,62,0.1)',
      borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{value}</div>
      <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.3rem' }}>{label}</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <Link href="/manager/users">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(63,62,62,0.4)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Prévia — {user.name}</h1>
            <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.1rem' }}>Visualizando como participante</p>
          </div>
        </div>
      </div>

      <div className="p-6" style={{ maxWidth: 700 }}>
        {/* Participant header */}
        <div style={{
          background: '#fff', border: '1px solid rgba(63,62,62,0.1)',
          borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Avatar src={user.avatar_url} name={user.name} size={52} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#3F3E3E', fontFamily: 'var(--font-outfit)' }}>
                Olá, {user.name.split(' ')[0]}! 👋
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.1rem' }}>
                {fnLabel[user.function ?? ''] ?? user.function ?? ''}
                {user.teams && (
                  <span style={{
                    marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                    borderRadius: '0 0.2rem 0.2rem 0.2rem',
                    background: (user.teams?.color ?? '#8DB23C') + '22',
                    color: user.teams?.color ?? '#8DB23C',
                    fontWeight: 600,
                  }}>
                    {user.teams?.name}
                  </span>
                )}
              </p>
              {campaign && <p style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.3)', marginTop: '0.1rem' }}>{campaign.name}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
            {myStreak > 0 && <StreakBadge streak={myStreak} />}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {statCard(totalPoints.toLocaleString('pt-BR'), 'pontos totais ⚽', '#8DB23C')}
          {statCard(myPosition ? `#${myPosition}` : '—', 'posição no ranking 🏆', '#3F3E3E')}
          {statCard(String(myStreak), 'dias seguidos 🔥', '#f97316')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
          {/* Recent points */}
          <div style={{ background: '#fff', border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.07)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#3F3E3E', fontFamily: 'var(--font-outfit)' }}>Últimos pontos</p>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {myPoints.length === 0 ? (
                <p style={{ padding: '1rem', fontSize: '0.8rem', color: 'rgba(63,62,62,0.35)', textAlign: 'center' }}>Nenhum ponto ainda.</p>
              ) : myPoints.slice(0, 8).map(pt => (
                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.04)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#3F3E3E', flex: 1 }}>{pt.scoring_rules?.name ?? 'Bônus'}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(63,62,62,0.35)', marginRight: '0.75rem' }}>
                    {format(new Date(pt.event_date), 'dd/MM', { locale: ptBR })}
                  </span>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700, padding: '0.1rem 0.45rem',
                    borderRadius: '0 0.25rem 0.25rem 0.25rem',
                    background: pt.points > 0 ? 'rgba(141,178,60,0.12)' : 'rgba(220,53,69,0.1)',
                    color: pt.points > 0 ? '#5C7435' : '#dc3545',
                  }}>
                    {pt.points > 0 ? '+' : ''}{pt.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bonuses */}
          {earnedBonuses.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(63,62,62,0.1)', borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.07)' }}>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#3F3E3E', fontFamily: 'var(--font-outfit)' }}>Conquistas</p>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {earnedBonuses.map(ub => (
                  <div key={ub.id} style={{
                    textAlign: 'center', padding: '0.6rem 0.75rem',
                    borderRadius: '0 0.5rem 0.5rem 0.5rem',
                    background: 'rgba(63,62,62,0.04)', border: '1px solid rgba(63,62,62,0.08)',
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(63,62,62,0.55)', marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
