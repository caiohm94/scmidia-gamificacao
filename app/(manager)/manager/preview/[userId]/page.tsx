import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Avatar } from '@/components/shared/Avatar'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { RankingTable } from '@/components/game/RankingTable'
import { FeedItem } from '@/components/game/FeedItem'
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { MetasCalendar } from '@/components/participant/MetasCalendar'
import { PreviewShell } from '@/components/participant/PreviewShell'
import { getDaysInMonth, todayBrazil } from '@/lib/goals/helpers'
import { MonthNav } from '@/components/participant/MonthNav'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import type { UserProfile } from '@/types/database'

type PointWithRule = { id: string; points: number; event_date: string; created_at: string; description: string | null; origin: string; status: string; scoring_rules: { name: string } | null; campaigns: { name: string } | null }
type FeedEvent = { id: string; event_type: string; payload: Record<string, unknown>; created_at: string; user_id: string }
type LevelEntry = { id: string; name: string; badge_icon: string; color: string; min_points: number }
type BonusEntry = { id: string; bonuses: { name: string; badge_icon: string } | null }
type GoalWithRule = { id: string; scoring_rule_id: string; actual_value: number | null; target_value: number; period_date: string; scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean } | null }

const NAV_TABS = [
  { key: 'painel', label: 'Painel' },
  { key: 'metas', label: 'Metas' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'historico', label: 'Histórico' },
  { key: 'feed', label: 'Feed' },
]

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ tab?: string; month?: string }>
}) {
  await requireRole('manager')
  const { userId } = await params
  const { tab = 'painel', month: monthParam } = await searchParams
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
  let todayPreviewGoals: GoalWithRule[] = []
  let allPreviewGoals: GoalWithRule[] = []
  let navMonthGoals: GoalWithRule[] = []
  let previewYear = 0
  let previewMonth = 0
  let navYear = 0
  let navMonth = 0

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

    const todayStr = todayBrazil()
    const [gy, gm] = todayStr.slice(0, 7).split('-').map(Number)
    previewYear = gy
    previewMonth = gm
    const monthStart = `${gy}-${String(gm).padStart(2, '0')}-01`
    const lastDay = new Date(gy, gm, 0).getDate()
    const monthEnd = `${gy}-${String(gm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data: goalsRaw } = await admin
      .from('participant_goals')
      .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period, is_cumulative)')
      .eq('user_id', userId)
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd)
    allPreviewGoals = (goalsRaw ?? []) as GoalWithRule[]

    // Nav month for metas tab (may differ from current month)
    const todayMonth = `${gy}-${String(gm).padStart(2, '0')}`
    const navMonthStr = monthParam?.match(/^\d{4}-\d{2}$/) ? monthParam : todayMonth
    const [ny, nm] = navMonthStr.split('-').map(Number)
    navYear = ny
    navMonth = nm
    if (navMonthStr === todayMonth) {
      navMonthGoals = allPreviewGoals
    } else {
      const navStart = `${ny}-${String(nm).padStart(2, '0')}-01`
      const navLastDay = new Date(ny, nm, 0).getDate()
      const navEnd = `${ny}-${String(nm).padStart(2, '0')}-${String(navLastDay).padStart(2, '0')}`
      const { data: navRaw } = await admin
        .from('participant_goals')
        .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period, is_cumulative)')
        .eq('user_id', userId)
        .gte('period_date', navStart)
        .lte('period_date', navEnd)
      navMonthGoals = (navRaw ?? []) as GoalWithRule[]
    }

    // Fetch participant photo for the active campaign
    const { data: cp } = await admin
      .from('campaign_participants')
      .select('photo_url')
      .eq('campaign_id', campaign.id)
      .eq('user_id', userId)
      .single()
    if (cp?.photo_url) user.avatar_url = cp.photo_url

    // Mirror participant dashboard: deduplicate by rule, apply is_cumulative aggregation
    const byRuleMap = new Map<string, GoalWithRule[]>()
    for (const g of allPreviewGoals) {
      const arr = byRuleMap.get(g.scoring_rule_id) ?? []
      arr.push(g)
      byRuleMap.set(g.scoring_rule_id, arr)
    }
    todayPreviewGoals = [...byRuleMap.entries()].map(([, entries]) => {
      const rule = entries[0].scoring_rules
      if (rule?.is_cumulative) {
        const totalActual = entries.reduce((s, g) => s + (g.actual_value ?? 0), 0)
        const totalTarget = entries.filter(g => g.period_date <= todayStr).reduce((s, g) => s + g.target_value, 0)
        return { ...entries[0], actual_value: totalActual, target_value: totalTarget, period_date: monthStart }
      }
      if (rule?.target_period === 'monthly') {
        return entries.find(g => g.period_date === monthStart) ?? entries[0]
      }
      return entries.find(g => g.period_date === todayStr) ?? entries[0]
    }).filter(Boolean) as GoalWithRule[]
  }

  // --- FEED data — filtered to this user only (mirror participant feed) ---
  const { data: feedEvents } = await admin
    .from('feed_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const bg = '#0d1a0f'
  const border = 'rgba(255,255,255,0.07)'
  const cardBg = 'rgba(255,255,255,0.04)'
  const cardBorder = 'rgba(255,255,255,0.08)'
  const muted = 'rgba(255,255,255,0.45)'

  function navHref(t: string) {
    return `/manager/preview/${userId}?tab=${t}`
  }

  return (
    <PreviewShell>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hero — foto + info + stats no mesmo card */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1.25rem 1.25rem 1.25rem', overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
              <div style={{ width: 220, flexShrink: 0 }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', minHeight: 220, background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#8DB23C', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, padding: '1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.1 }}>
                    Olá, {user.name.split(' ')[0]}! 👋
                  </h1>
                  {campaign && <p style={{ fontSize: '0.75rem', color: muted, marginTop: '0.3rem' }}>{campaign.name}</p>}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                    {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
                    <StreakBadge streak={myStreak} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(255,223,0,0.08)', border: '1px solid rgba(255,223,0,0.2)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <AnimatedCounter value={totalPoints} style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFDF00', fontFamily: 'var(--font-outfit)', lineHeight: 1.1, display: 'block' }} />
                    <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>pontos ⚽</p>
                  </div>
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myPosition ? `#${myPosition}` : '—'}</div>
                    <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>ranking 🏆</p>
                  </div>
                  <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f97316', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myStreak}</div>
                    <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>sequência 🔥</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals */}
            {todayPreviewGoals.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Minhas metas</p>
                  <Link href={navHref('metas')} style={{ fontSize: '0.72rem', color: '#8DB23C', textDecoration: 'none' }}>Ver tudo →</Link>
                </div>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {todayPreviewGoals.map(g => (
                    <GoalProgressBar
                      key={g.id}
                      label={g.scoring_rules?.name ?? 'Meta'}
                      actual={g.actual_value}
                      target={g.target_value}
                      valueType={g.scoring_rules?.value_type ?? 'number'}
                      decimalPlaces={g.scoring_rules?.decimal_places ?? 0}
                      periodLabel={g.scoring_rules?.is_cumulative ? 'Acumulado' : g.scoring_rules?.target_period === 'monthly' ? 'Mensal' : 'Hoje'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Points + bonuses */}
            <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Últimos pontos</p>
                </div>
                <div>
                  {myPoints.length === 0
                    ? <p style={{ padding: '1.5rem', textAlign: 'center', color: muted, fontSize: '0.82rem' }}>Nenhum ponto ainda.</p>
                    : myPoints.slice(0, 8).map(pt => (
                        <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 500 }}>
                              {pt.scoring_rules?.name ?? 'Bônus'}
                            </p>
                            {pt.description && (
                              <p style={{ fontSize: '0.68rem', color: muted, margin: 0, marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pt.description.replace(/^SF Import — [^(]+/, '').replace(/^\s*—\s*/, '').replace(/[()]/g, '').trim() || pt.description}
                              </p>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: muted, whiteSpace: 'nowrap' }}>
                            {format(new Date(pt.event_date), 'dd/MM', { locale: ptBR })}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '0 0.25rem 0.25rem 0.25rem', whiteSpace: 'nowrap', background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)', color: pt.points > 0 ? '#8DB23C' : '#f87171' }}>
                            {pt.points > 0 ? '+' : ''}{pt.points}
                          </span>
                        </div>
                      ))}
                </div>
              </div>
              {earnedBonuses.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Conquistas</p>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {earnedBonuses.map(ub => (
                      <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${cardBorder}` }}>
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

        {/* ---- METAS ---- */}
        {tab === 'metas' && (() => {
          const byRule = new Map<string, GoalWithRule[]>()
          for (const g of navMonthGoals) {
            const arr = byRule.get(g.scoring_rule_id) ?? []
            arr.push(g)
            byRule.set(g.scoring_rule_id, arr)
          }
          const days = getDaysInMonth(navYear, navMonth)
          const todayStr = todayBrazil()
          const navMonthStr = `${navYear}-${String(navMonth).padStart(2, '0')}`
          const navMonthLabel = navYear > 0
            ? new Date(navYear, navMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : ''
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>🎯 Minhas Metas</h1>
                <MonthNav yearMonth={navMonthStr} label={navMonthLabel} basePath={`/manager/preview/${userId}?tab=metas`} />
              </div>
              {byRule.size === 0 && (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: muted, fontSize: '0.85rem' }}>Nenhuma meta definida para este mês.</p>
                </div>
              )}
              {[...byRule.entries()].map(([ruleId, ruleGoals]) => {
                const rule = ruleGoals[0].scoring_rules
                const isMonthly = rule?.target_period === 'monthly'
                const isCumulative = rule?.is_cumulative ?? false
                const monthStart = `${navYear}-${String(navMonth).padStart(2, '0')}-01`
                const monthlyGoal = isMonthly ? ruleGoals.find(g => g.period_date === monthStart) ?? ruleGoals[0] : null

                let barLabel: string
                let barActual: number | null
                let barTarget: number
                if (isMonthly) {
                  barLabel = 'Meta do mês'
                  barActual = monthlyGoal?.actual_value ?? null
                  barTarget = monthlyGoal?.target_value ?? 0
                } else if (isCumulative) {
                  barLabel = 'Acumulado até hoje'
                  barActual = ruleGoals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
                  barTarget = ruleGoals.filter(g => g.period_date <= todayStr).reduce((s, g) => s + g.target_value, 0)
                } else {
                  barLabel = 'Meta de hoje'
                  const todayGoal = ruleGoals.find(g => g.period_date === todayStr)
                  barActual = todayGoal?.actual_value ?? null
                  barTarget = todayGoal?.target_value ?? 0
                }

                return (
                  <div key={ruleId} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>{rule?.name ?? 'Meta'}</p>
                      <span style={{ fontSize: '0.65rem', color: muted, background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>
                        {isMonthly ? 'Mensal' : isCumulative ? 'Acumulativo' : 'Diário'}
                      </span>
                    </div>
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <GoalProgressBar
                        label={barLabel}
                        actual={barActual}
                        target={barTarget}
                        valueType={rule?.value_type ?? 'number'}
                        decimalPlaces={rule?.decimal_places ?? 0}
                      />
                      {!isMonthly && rule && (
                        <MetasCalendar
                          days={days}
                          goals={ruleGoals.map(g => ({
                            id: g.id,
                            actual_value: g.actual_value,
                            target_value: g.target_value,
                            period_date: g.period_date,
                          }))}
                          year={navYear}
                          month={navMonth}
                          today={todayStr}
                          rule={{
                            name: rule.name,
                            value_type: rule.value_type,
                            decimal_places: rule.decimal_places,
                          }}
                          is_cumulative={isCumulative}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>Histórico de Pontos</h1>
            {myPoints.length === 0
              ? <p style={{ color: muted, textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>Nenhum ponto registrado ainda.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {myPoints.map(pt => (
                    <div key={pt.id} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '0 0.75rem 0.75rem 0.75rem',
                      background: pt.status === 'reversed' ? 'rgba(255,255,255,0.01)' : cardBg,
                      border: `1px solid ${cardBorder}`,
                      opacity: pt.status === 'reversed' ? 0.45 : 1,
                    }}>
                      {/* Points badge — LEFT */}
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
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)' }}>
                          {pt.scoring_rules?.name ?? 'Bônus'}
                        </p>
                        {pt.description && (
                          <p style={{ margin: 0, marginTop: '0.15rem', fontSize: '0.72rem', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pt.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          {pt.campaigns?.name && (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', padding: '0.05rem 0.35rem', borderRadius: '0.2rem' }}>
                              {pt.campaigns.name}
                            </span>
                          )}
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>
                            {pt.origin === 'salesforce' ? 'Salesforce' : pt.origin === 'manual' ? 'Manual' : pt.origin}
                          </span>
                          {pt.status === 'reversed' && (
                            <span style={{ fontSize: '0.65rem', color: '#f87171' }}>Estornado</span>
                          )}
                        </div>
                      </div>
                      {/* Date — RIGHT */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                          {format(new Date(pt.event_date), 'dd/MM')}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: muted }}>
                          {format(new Date(pt.event_date), 'MMM yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* ---- FEED ---- */}
        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Minhas Atividades 📡</h1>
            {(feedEvents ?? []).length === 0
              ? <p style={{ color: muted, textAlign: 'center', padding: '3rem' }}>Nenhuma atividade ainda.</p>
              : (feedEvents ?? [] as FeedEvent[]).map((e) => <FeedItem key={e.id} event={e as FeedEvent} />)}
          </div>
        )}

      </main>
    </PreviewShell>
  )
}
