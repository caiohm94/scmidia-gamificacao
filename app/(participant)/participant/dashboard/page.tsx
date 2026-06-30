import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { PointsHistory } from '@/components/participant/PointsHistory'
import type { Tables } from '@/types/database'

type PointWithRule = Tables<'point_transactions'> & {
  scoring_rules: { name: string } | null
}
type LevelEntry = { id: string; name: string; badge_icon: string; color: string; min_points: number }
type BonusEntry = { id: string; bonuses: { name: string; badge_icon: string } | null }
type GoalWithRule = {
  id: string
  scoring_rule_id: string
  actual_value: number | null
  target_value: number
  period_date: string
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean } | null
}

export default async function ParticipantDashboard() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  const { data: rawPoints } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const myPoints = (rawPoints ?? []) as PointWithRule[]
  const totalPoints = myPoints.reduce((sum, p) => sum + p.points, 0)

  let myPosition: number | null = null
  let myStreak = 0
  let currentLevel: LevelEntry | undefined
  let earnedBonuses: BonusEntry[] = []
  let todayGoals: GoalWithRule[] = []

  if (campaign) {
    const ranking = await getRanking(supabase, { campaign_id: campaign.id })
    const me = ranking.find(r => r.user_id === user.id)
    myPosition = me?.position ?? null
    myStreak = me?.current_streak ?? 0

    const { data: levels } = await supabase
      .from('levels').select('id, name, badge_icon, color, min_points')
      .eq('campaign_id', campaign.id)
      .lte('min_points', totalPoints)
      .order('min_points', { ascending: false }).limit(1)
    currentLevel = levels?.[0] as LevelEntry | undefined

    const { data: bonuses } = await supabase
      .from('user_bonuses').select('id, bonuses(name, badge_icon)')
      .eq('user_id', user.id).eq('campaign_id', campaign.id)
    earnedBonuses = (bonuses ?? []) as BonusEntry[]

    const today = new Date().toISOString().slice(0, 10)
    const [y, m] = today.slice(0, 7).split('-').map(Number)
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: goalsRaw } = await supabase
      .from('participant_goals')
      .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period, is_cumulative)')
      .eq('user_id', user.id)
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd)
    const allGoals = (goalsRaw ?? []) as GoalWithRule[]

    // Deduplicate by rule: for cumulative daily rules, merge into one entry with accumulated value
    const byRule = new Map<string, GoalWithRule[]>()
    for (const g of allGoals) {
      const arr = byRule.get(g.scoring_rule_id) ?? []
      arr.push(g)
      byRule.set(g.scoring_rule_id, arr)
    }
    todayGoals = [...byRule.entries()].map(([, entries]) => {
      const rule = entries[0].scoring_rules
      if (rule?.is_cumulative) {
        const totalActual = entries.reduce((s, g) => s + (g.actual_value ?? 0), 0)
        // Target = sum of goals up to today (not full month)
        const totalTarget = entries.filter(g => g.period_date <= today).reduce((s, g) => s + g.target_value, 0)
        return { ...entries[0], actual_value: totalActual, target_value: totalTarget, period_date: monthStart }
      }
      if (rule?.target_period === 'monthly') {
        return entries.find(g => g.period_date === monthStart) ?? entries[0]
      }
      return entries.find(g => g.period_date === today) ?? entries[0]
    }).filter(g => g !== undefined) as GoalWithRule[]
  }

  // Fetch participant photo for active campaign
  let participantPhoto: string | null = user.avatar_url ?? null
  if (campaign) {
    const { data: cp } = await supabase
      .from('campaign_participants')
      .select('photo_url')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .single()
    if (cp?.photo_url) participantPhoto = cp.photo_url
  }

  const cardBg = 'var(--p-card-bg, rgba(0,0,0,0.035))'
  const cardBorder = 'var(--p-card-border, rgba(0,0,0,0.1))'
  const muted = 'var(--p-muted, #6b7d6c)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Hero — photo + info + stats no mesmo card */}
      <div style={{
        background: cardBg, border: `1px solid ${cardBorder}`,
        borderRadius: '0 1.25rem 1.25rem 1.25rem', overflow: 'hidden',
        display: 'flex', alignItems: 'stretch',
      }}>
        {/* Photo column — natural size, no crop */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {participantPhoto ? (
            <img
              src={participantPhoto}
              alt={user.name}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', minHeight: 220, background: 'rgba(141,178,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#8DB23C', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Info + stats column */}
        <div style={{ flex: 1, padding: '1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.1 }}>
              Olá, {user.name.split(' ')[0]}! 👋
            </h1>
            {campaign && (
              <p style={{ fontSize: '0.75rem', color: muted, marginTop: '0.3rem' }}>{campaign.name}</p>
            )}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              {currentLevel && (
                <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />
              )}
              <StreakBadge streak={myStreak} />
            </div>
          </div>

          {/* Stats grid — dentro do hero, sem espaço perdido */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', marginTop: 'auto' }}>
            <div style={{
              background: 'rgba(255,223,0,0.08)', border: '1px solid rgba(255,223,0,0.2)',
              borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center',
            }}>
              <AnimatedCounter
                value={totalPoints}
                style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFDF00', fontFamily: 'var(--font-outfit)', lineHeight: 1.1, display: 'block' }}
              />
              <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>pontos ⚽</p>
            </div>
            <div style={{
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
                {myPosition ? `#${myPosition}` : '—'}
              </div>
              <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>ranking 🏆</p>
            </div>
            <div style={{
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.75rem 0.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f97316', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
                {myStreak}
              </div>
              <p style={{ fontSize: '0.62rem', color: muted, marginTop: '0.2rem' }}>sequência 🔥</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      {todayGoals.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--p-sub-border, rgba(0,0,0,0.07))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Minhas metas</p>
            <a href="/participant/metas" style={{ fontSize: '0.72rem', color: '#8DB23C', textDecoration: 'none' }}>Ver tudo →</a>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todayGoals.map(g => (
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

      {/* Recent points + bonuses */}
      <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--p-sub-border, rgba(0,0,0,0.07))' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Últimos pontos</p>
          </div>
          <PointsHistory points={myPoints.slice(0, 8).map(pt => ({
            id: pt.id,
            points: pt.points,
            event_date: pt.event_date,
            description: pt.description ?? null,
            scoring_rules: pt.scoring_rules,
          }))} />
        </div>

        {earnedBonuses.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--p-sub-border, rgba(0,0,0,0.07))' }}>
              <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Conquistas</p>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {earnedBonuses.map(ub => (
                <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'var(--p-tag-bg)', border: `1px solid ${cardBorder}` }}>
                  <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                  <div style={{ fontSize: '0.65rem', color: muted, marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
