import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { subDays, format } from 'date-fns'
import { Users, Trophy, Zap, AlertTriangle, LayoutDashboard } from 'lucide-react'

type RecentPoint = {
  id: string
  points: number
  created_at: string
  users: { name: string } | null
  scoring_rules: { name: string } | null
  campaigns: { name: string } | null
}

type InactiveParticipant = {
  id: string
  last_activity_date: string | null
  users: { name: string } | null
  campaigns: { name: string } | null
}

export default async function ManagerDashboard() {
  await requireRole('manager')
  const supabase = await createClient()
  const threeDaysAgo = subDays(new Date(), 3).toISOString().slice(0, 10)

  const [
    { count: totalUsers },
    { count: activeCampaigns },
    rawPoints,
    rawInactive,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('point_transactions')
      .select('id, points, created_at, users(name), scoring_rules(name), campaigns(name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('campaign_participants')
      .select('id, last_activity_date, users(name), campaigns(name)')
      .lt('last_activity_date', threeDaysAgo)
      .not('last_activity_date', 'is', null),
  ])

  const recentPoints = (rawPoints.data ?? []) as RecentPoint[]
  const inactiveParticipants = (rawInactive.data ?? []) as InactiveParticipant[]

  const todayStr = new Date().toISOString().slice(0, 10)
  const pointsToday = recentPoints.filter(p => p.created_at.slice(0, 10) === todayStr).length

  const statCards = [
    { label: 'Usuários Ativos', value: totalUsers ?? 0, icon: Users, color: '#8DB23C', bg: 'rgba(141,178,60,0.1)' },
    { label: 'Campanhas Ativas', value: activeCampaigns ?? 0, icon: Trophy, color: '#229877', bg: 'rgba(34,152,119,0.1)' },
    { label: 'Pontos Hoje', value: pointsToday, icon: Zap, color: '#BACB3A', bg: 'rgba(186,203,58,0.1)' },
    { label: 'Alertas', value: inactiveParticipants.length, icon: AlertTriangle, color: '#e07b39', bg: 'rgba(224,123,57,0.1)' },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Dashboard</h1>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)' }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: (await import('date-fns/locale/pt-BR')).ptBR })}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="sc-card">
              <div className="flex items-start justify-between">
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)', marginBottom: '0.25rem' }}>{card.label}</p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', lineHeight: 1 }}>{card.value}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <card.icon size={18} color={card.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inactive alert */}
        {inactiveParticipants.length > 0 && (
          <div style={{ background: 'rgba(224,123,57,0.07)', border: '1px solid rgba(224,123,57,0.25)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c0622a', fontFamily: 'var(--font-outfit, sans-serif)', marginBottom: '0.75rem' }}>
              Participantes sem pontuação há +3 dias
            </p>
            <div className="space-y-1.5">
              {inactiveParticipants.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between text-sm" style={{ color: 'rgba(63,62,62,0.7)' }}>
                  <span style={{ fontWeight: 500 }}>{p.users?.name}</span>
                  <span style={{ color: 'rgba(63,62,62,0.45)' }}>{p.campaigns?.name}</span>
                  <span style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.75rem' }}>Último: {p.last_activity_date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent points */}
        <div className="sc-card">
          <h2 className="sc-heading text-sm mb-4" style={{ fontSize: '0.875rem' }}>Lançamentos Recentes</h2>
          {recentPoints.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)', textAlign: 'center', padding: '2rem 0' }}>Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-0">
              {recentPoints.map((pt, i) => (
                <div
                  key={pt.id}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < recentPoints.length - 1 ? '1px solid rgba(63,62,62,0.07)' : 'none' }}
                >
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#3F3E3E', minWidth: 120 }}>{pt.users?.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.55)', flex: 1, marginLeft: '1rem' }}>{pt.scoring_rules?.name ?? 'Bônus'}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.8rem',
                      color: pt.points > 0 ? '#5C7435' : '#c0622a',
                      background: pt.points > 0 ? 'rgba(92,116,53,0.1)' : 'rgba(192,98,42,0.1)',
                      padding: '0.15rem 0.55rem', borderRadius: '0 0.3rem 0.3rem 0.3rem',
                      marginRight: '1rem',
                    }}
                  >
                    {pt.points > 0 ? '+' : ''}{pt.points} pts
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.35)', whiteSpace: 'nowrap' }}>{format(new Date(pt.created_at), 'dd/MM HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
