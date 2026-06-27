import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { subDays, format } from 'date-fns'

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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Usuários Ativos', value: totalUsers ?? 0, icon: '👥' },
          { label: 'Campanhas Ativas', value: activeCampaigns ?? 0, icon: '🏆' },
          { label: 'Pontos Hoje', value: pointsToday, icon: '⚽' },
          { label: 'Alertas', value: inactiveParticipants.length, icon: '⚠️' },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="text-3xl mb-1">{card.icon}</div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {inactiveParticipants.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-700">
              ⚠️ Participantes sem pontuação há +3 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {inactiveParticipants.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.users?.name}</span>
                  <span className="text-muted-foreground">{p.campaigns?.name}</span>
                  <span className="text-muted-foreground">Último: {p.last_activity_date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Lançamentos Recentes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentPoints.map(pt => (
              <div key={pt.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <span className="font-medium">{pt.users?.name}</span>
                <span className="text-muted-foreground">{pt.scoring_rules?.name ?? 'Bônus'}</span>
                <Badge variant={pt.points > 0 ? 'default' : 'destructive'}>
                  {pt.points > 0 ? '+' : ''}{pt.points} pts
                </Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(pt.created_at), 'dd/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
