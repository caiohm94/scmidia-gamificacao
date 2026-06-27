import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { Tables } from '@/types/database'

type PointWithRule = Tables<'point_transactions'> & {
  scoring_rules: { name: string } | null
}

type LevelEntry = {
  id: string
  name: string
  badge_icon: string
  color: string
  min_points: number
}

type BonusEntry = {
  id: string
  bonuses: { name: string; badge_icon: string } | null
}

export default async function ParticipantDashboard() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  // Active campaign
  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  // My points
  const rawPoints = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const myPoints = (rawPoints.data ?? []) as PointWithRule[]

  const totalPoints = myPoints.reduce((sum, p) => sum + p.points, 0)

  // My position, streak, level, bonuses
  let myPosition: number | null = null
  let myStreak = 0
  let currentLevel: LevelEntry | undefined
  let earnedBonuses: BonusEntry[] | undefined

  if (campaign) {
    const ranking = await getRanking(supabase, { campaign_id: campaign.id })
    const me = ranking.find(r => r.user_id === user.id)
    myPosition = me?.position ?? null
    myStreak = me?.current_streak ?? 0

    const rawLevels = await supabase
      .from('levels')
      .select('id, name, badge_icon, color, min_points')
      .eq('campaign_id', campaign.id)
      .lte('min_points', totalPoints)
      .order('min_points', { ascending: false })
      .limit(1)
    currentLevel = (rawLevels.data?.[0] as LevelEntry | undefined)

    const rawBonuses = await supabase
      .from('user_bonuses')
      .select('id, bonuses(name, badge_icon)')
      .eq('user_id', user.id)
      .eq('campaign_id', campaign.id)
    earnedBonuses = (rawBonuses.data ?? []) as BonusEntry[]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Olá, {user.name.split(' ')[0]}! 👋</h1>
          {campaign && <p className="text-gray-400">{campaign.name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {currentLevel && (
            <LevelBadge
              name={currentLevel.name}
              icon={currentLevel.badge_icon}
              color={currentLevel.color}
            />
          )}
          <StreakBadge streak={myStreak} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-yellow-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-yellow-400">{totalPoints}</div>
            <p className="text-sm text-gray-400 mt-1">pontos totais ⚽</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{myPosition ? `#${myPosition}` : '—'}</div>
            <p className="text-sm text-gray-400 mt-1">posição no ranking 🏆</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-orange-400">{myStreak}</div>
            <p className="text-sm text-gray-400 mt-1">dias seguidos 🔥</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-sm">Últimos pontos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myPoints.slice(0, 8).map(pt => (
              <div key={pt.id} className="flex justify-between text-sm">
                <span className="text-gray-300">{pt.scoring_rules?.name ?? 'Bônus'}</span>
                <span className="text-xs text-gray-500">{format(new Date(pt.event_date), 'dd/MM')}</span>
                <Badge variant={pt.points > 0 ? 'default' : 'destructive'} className="text-xs">
                  {pt.points > 0 ? '+' : ''}{pt.points}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {earnedBonuses && earnedBonuses.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-sm">Conquistas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {earnedBonuses.map(ub => (
                  <div
                    key={ub.id}
                    className="text-center p-2 rounded-lg bg-gray-800 border border-gray-700 text-xs"
                  >
                    <div className="text-2xl">{ub.bonuses?.badge_icon}</div>
                    <div className="mt-1 text-gray-300">{ub.bonuses?.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
