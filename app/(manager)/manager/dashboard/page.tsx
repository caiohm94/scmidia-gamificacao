import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { LayoutDashboard, Users, Zap, AlertTriangle } from 'lucide-react'
import { DashboardParticipantList, type ParticipantRow } from '@/components/manager/DashboardParticipantList'
import { CampaignSelector } from '@/components/manager/CampaignSelector'
import { todayBrazil } from '@/lib/goals/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Props = { searchParams: Promise<{ campaign_id?: string }> }

export default async function ManagerDashboard({ searchParams }: Props) {
  await requireRole('manager')
  const params = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').eq('status', 'active').order('name')
  const campaignList = campaigns ?? []
  const selectedCampaignId = params.campaign_id ?? campaignList[0]?.id ?? null
  const selectedCampaign = campaignList.find(c => c.id === selectedCampaignId) ?? null

  if (!selectedCampaignId) {
    return (
      <div>
        <div className="sc-page-header">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={18} color="#8DB23C" />
            </div>
            <h1 className="sc-page-title">Dashboard</h1>
          </div>
        </div>
        <div className="p-6">
          <p style={{ color: 'rgba(63,62,62,0.45)', fontSize: '0.85rem' }}>Nenhuma campanha ativa.</p>
        </div>
      </div>
    )
  }

  const today = todayBrazil()
  const [y, mo] = today.slice(0, 7).split('-').map(Number)
  const monthStart = `${y}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(y, mo, 0).getDate()
  const monthEnd = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [ranking, kpiCount, kpiPts, kpiInactive, goalsRaw, photosRaw] = await Promise.all([
    getRanking(admin, { campaign_id: selectedCampaignId }),
    admin.from('campaign_participants').select('*', { count: 'exact', head: true }).eq('campaign_id', selectedCampaignId),
    admin.from('point_transactions').select('points').eq('campaign_id', selectedCampaignId).eq('event_date', today).eq('status', 'active'),
    admin.from('campaign_participants').select('*', { count: 'exact', head: true }).eq('campaign_id', selectedCampaignId).lt('last_activity_date', threeDaysAgo).not('last_activity_date', 'is', null),
    admin.from('participant_goals')
      .select('user_id, actual_value, target_value, period_date, scoring_rules(name, target_period, is_cumulative)')
      .eq('campaign_id', selectedCampaignId)
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd),
    admin.from('campaign_participants').select('user_id, photo_url').eq('campaign_id', selectedCampaignId),
  ])

  const pointsToday = (kpiPts.data ?? []).reduce((s: number, p: { points: number }) => s + p.points, 0)

  // Build photo map: campaign photo overrides avatar
  const photoMap = new Map<string, string | null>()
  for (const cp of (photosRaw.data ?? [])) photoMap.set(cp.user_id, cp.photo_url)

  // Build mini-goals map: up to 2 per user (daily first, then monthly)
  type GoalRaw = {
    user_id: string; actual_value: number | null; target_value: number; period_date: string
    scoring_rules: { name: string; target_period: string | null; is_cumulative: boolean } | null
  }
  const goalsByUser = new Map<string, { rule_name: string; actual: number; target: number }[]>()
  for (const g of (goalsRaw.data ?? []) as GoalRaw[]) {
    if (!g.scoring_rules) continue
    const r = g.scoring_rules
    const isDaily = r.target_period !== 'monthly' && !r.is_cumulative && g.period_date === today
    const isMonthly = (r.target_period === 'monthly' || r.is_cumulative) && g.period_date === monthStart
    if (!isDaily && !isMonthly) continue
    const arr = goalsByUser.get(g.user_id) ?? []
    if (!arr.some(x => x.rule_name === r.name)) {
      arr.push({ rule_name: r.name, actual: g.actual_value ?? 0, target: g.target_value })
    }
    goalsByUser.set(g.user_id, arr)
  }

  const participants: ParticipantRow[] = ranking.map(r => ({
    user_id: r.user_id,
    name: r.name,
    avatar_url: photoMap.get(r.user_id) ?? r.avatar_url,
    position: r.position,
    total_points: r.total_points,
    current_streak: r.current_streak,
    team_name: r.team_name,
    team_color: r.team_color,
    function: r.function,
    goals: (goalsByUser.get(r.user_id) ?? []).slice(0, 2),
  }))

  const statCards = [
    { label: 'Participantes', value: String(kpiCount.count ?? 0), icon: Users, color: '#8DB23C', bg: 'rgba(141,178,60,0.1)' },
    { label: 'Pontos hoje', value: pointsToday.toLocaleString('pt-BR'), icon: Zap, color: '#BACB3A', bg: 'rgba(186,203,58,0.1)' },
    { label: 'Inativos (+3d)', value: String(kpiInactive.count ?? 0), icon: AlertTriangle, color: '#e07b39', bg: 'rgba(224,123,57,0.1)' },
  ]

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Dashboard</h1>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)' }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Campaign selector + KPI cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <CampaignSelector campaigns={campaignList} selected={selectedCampaignId} />
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
            {statCards.map(card => (
              <div key={card.label} className="sc-card" style={{ flex: 1, minWidth: 110 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)', marginBottom: '0.2rem' }}>{card.label}</p>
                    <p style={{ fontSize: '1.55rem', fontWeight: 700, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', lineHeight: 1, margin: 0 }}>{card.value}</p>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '0 0.4rem 0.4rem 0.4rem', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <card.icon size={16} color={card.color} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subheading */}
        {selectedCampaign && (
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(63,62,62,0.4)', fontFamily: 'var(--font-outfit, sans-serif)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            {selectedCampaign.name} — {participants.length} participante{participants.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Participant list */}
        <DashboardParticipantList participants={participants} campaignId={selectedCampaignId} />
      </div>
    </div>
  )
}
