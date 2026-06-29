import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Avatar } from '@/components/shared/Avatar'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { RankingTable } from '@/components/game/RankingTable'
import { FeedItem } from '@/components/game/FeedItem'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import type { UserProfile } from '@/types/database'

type PointWithRule = { id: string; points: number; event_date: string; created_at: string; description: string | null; origin: string; status: string; scoring_rules: { name: string } | null; campaigns: { name: string } | null }
type FeedEvent = { id: string; event_type: string; payload: Record<string, unknown>; created_at: string; user_id: string }
type LevelEntry = { id: string; name: string; badge_icon: string; color: string; min_points: number }
type BonusEntry = { id: string; bonuses: { name: string; badge_icon: string } | null }

const NAV_TABS = [
  { key: 'painel', label: 'Painel' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'historico', label: 'Histórico' },
  { key: 'feed', label: 'Feed' },
]

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  await requireRole('manager')
  const { userId } = await params
  const { tab = 'painel' } = await searchParams
  const admin = createAdminClient()

  const { data: userRaw } = await admin.from('users').select('*, teams(name, color)').eq('id', userId).single()
  if (!userRaw) return <div style={{ color: '#fff', padding: '2rem' }}>Usuário não encontrado.</div>
  const user = userRaw as unknown as UserProfile

  const { data: campaigns } = await admin.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  // --- PAINEL data ---
  const { data: rawPoints } = await admin
    .from('point_transactions')
    .select('*, scoring_rules(name), campaigns(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const myPoints = (rawPoints ?? []) as PointWithRule[]
  const totalPoints = myPoints.reduce((sum, p) => sum + p.points, 0)

  let myPosition: number | null = null
  let myStreak = 0
  let currentLevel: LevelEntry | undefined
  let earnedBonuses: BonusEntry[] = []
  let rankingRows: Awaited<ReturnType<typeof getRanking>> = []

  if (campaign) {
    rankingRows = await getRanking(admin, { campaign_id: campaign.id })
    const me = rankingRows.find(r => r.user_id === userId)
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

  // --- FEED data ---
  const { data: feedEvents } = await admin
    .from('feed_events').select('*').order('created_at', { ascending: false }).limit(50)

  const bg = '#0d1a0f'
  const border = 'rgba(255,255,255,0.07)'
  const cardBg = 'rgba(255,255,255,0.04)'
  const cardBorder = 'rgba(255,255,255,0.08)'
  const muted = 'rgba(255,255,255,0.45)'

  function navHref(t: string) {
    return `/manager/preview/${userId}?tab=${t}`
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: '#fff' }}>

      {/* Manager banner */}
      <div style={{ background: 'rgba(141,178,60,0.15)', borderBottom: '1px solid rgba(141,178,60,0.3)', padding: '0.4rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: '#8DB23C', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>
          👁 Prévia como participante — {user.name}
        </span>
        <Link href={`/manager/users/${userId}`} style={{ fontSize: '0.72rem', color: 'rgba(141,178,60,0.8)', textDecoration: 'none' }}>← Voltar ao cadastro</Link>
      </div>

      {/* Participant header */}
      <header style={{ borderBottom: `1px solid ${border}`, padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(13,26,15,0.95)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Image src="/logo-scmidia.png" alt="SCMídia" width={72} height={22} style={{ filter: 'brightness(0) invert(1)', opacity: 0.7, objectFit: 'contain' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '0.9rem', color: '#FFDF00' }}>
            {campaign?.name ?? 'Campanha'}
          </span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          {NAV_TABS.map(t => (
            <Link key={t.key} href={navHref(t.key)} style={{
              padding: '0.35rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none',
              borderRadius: '0 0.35rem 0.35rem 0.35rem',
              fontFamily: 'var(--font-outfit)',
              background: tab === t.key ? 'rgba(141,178,60,0.18)' : 'transparent',
              color: tab === t.key ? '#8DB23C' : 'rgba(255,255,255,0.5)',
              fontWeight: tab === t.key ? 600 : 400,
            }}>
              {t.label}
            </Link>
          ))}
        </nav>

        <Avatar src={user.avatar_url} name={user.name} size={30} />
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ---- PAINEL ---- */}
        {tab === 'painel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>
                  Olá, {user.name.split(' ')[0]}! 👋
                </h1>
                {campaign && <p style={{ fontSize: '0.85rem', color: muted, marginTop: '0.2rem' }}>{campaign.name}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
                <StreakBadge streak={myStreak} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
              {[
                { value: totalPoints.toLocaleString('pt-BR'), label: 'pontos totais ⚽', color: '#FFDF00', border: 'rgba(255,223,0,0.2)' },
                { value: myPosition ? `#${myPosition}` : '—', label: 'posição no ranking 🏆', color: '#fff', border: cardBorder },
                { value: String(myStreak), label: 'dias seguidos 🔥', color: '#f97316', border: 'rgba(249,115,22,0.2)' },
              ].map(s => (
                <div key={s.label} style={{ background: cardBg, border: `1px solid ${s.border}`, borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{s.value}</div>
                  <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              {/* Recent points */}
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 0.75rem 0.75rem 0.75rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', fontFamily: 'var(--font-outfit)' }}>Últimos pontos</p>
                </div>
                <div>
                  {myPoints.length === 0
                    ? <p style={{ padding: '1.5rem', textAlign: 'center', color: muted, fontSize: '0.82rem' }}>Nenhum ponto ainda.</p>
                    : myPoints.slice(0, 8).map(pt => (
                        <div key={pt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1rem', borderBottom: `1px solid ${border}` }}>
                          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', flex: 1 }}>{pt.scoring_rules?.name ?? 'Bônus'}</span>
                          <span style={{ fontSize: '0.72rem', color: muted, marginRight: '0.75rem' }}>
                            {format(new Date(pt.event_date), 'dd/MM', { locale: ptBR })}
                          </span>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                            borderRadius: '0 0.25rem 0.25rem 0.25rem',
                            background: pt.points > 0 ? 'rgba(141,178,60,0.2)' : 'rgba(220,53,69,0.15)',
                            color: pt.points > 0 ? '#8DB23C' : '#f87171',
                          }}>
                            {pt.points > 0 ? '+' : ''}{pt.points}
                          </span>
                        </div>
                      ))}
                </div>
              </div>

              {/* Bonuses */}
              {earnedBonuses.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 0.75rem 0.75rem 0.75rem', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${border}` }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', fontFamily: 'var(--font-outfit)' }}>Conquistas</p>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {earnedBonuses.map(ub => (
                      <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(255,255,255,0.06)', border: `1px solid ${cardBorder}` }}>
                        <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                        <div style={{ fontSize: '0.65rem', color: muted, marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- RANKING ---- */}
        {tab === 'ranking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>
              🏆 {campaign?.name ?? ''} — Ranking
            </h1>
            <RankingTable rows={rankingRows} highlightUserId={userId} />
          </div>
        )}

        {/* ---- HISTÓRICO ---- */}
        {tab === 'historico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Histórico de Pontos</h1>
            {myPoints.length === 0
              ? <p style={{ color: muted, textAlign: 'center', padding: '3rem' }}>Nenhum ponto ainda.</p>
              : myPoints.map(pt => (
                  <div key={pt.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem', borderRadius: '0 0.75rem 0.75rem 0.75rem',
                    background: cardBg, border: `1px solid ${cardBorder}`,
                    opacity: pt.status === 'reversed' ? 0.45 : 1,
                  }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{pt.scoring_rules?.name ?? 'Bônus'}</p>
                      <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.15rem' }}>{pt.campaigns?.name}</p>
                      {pt.description && <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.1rem' }}>{pt.description}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', padding: '0.2rem 0.6rem', fontSize: '0.85rem', fontWeight: 700,
                        borderRadius: '0 0.35rem 0.35rem 0.35rem',
                        background: pt.points > 0 ? 'rgba(141,178,60,0.2)' : 'rgba(220,53,69,0.15)',
                        color: pt.points > 0 ? '#8DB23C' : '#f87171',
                      }}>
                        {pt.points > 0 ? '+' : ''}{pt.points} pts
                      </span>
                      <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>
                        {format(new Date(pt.event_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                      </p>
                      {pt.status === 'reversed' && <p style={{ fontSize: '0.68rem', color: '#f87171', marginTop: '0.15rem' }}>Estornado</p>}
                    </div>
                  </div>
                ))}
          </div>
        )}

        {/* ---- FEED ---- */}
        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Feed ao Vivo 📡</h1>
            {(feedEvents ?? []).length === 0
              ? <p style={{ color: muted, textAlign: 'center', padding: '3rem' }}>Nenhuma atividade ainda.</p>
              : (feedEvents ?? [] as FeedEvent[]).map((e) => <FeedItem key={e.id} event={e as FeedEvent} />)}
          </div>
        )}

      </main>
    </div>
  )
}
