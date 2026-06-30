import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { RankingTable } from '@/components/game/RankingTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ParticipantRankingPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]
  if (!campaign) return <div className="p-6 text-gray-400">Nenhuma campanha ativa.</div>

  const [overall, teamRanking] = await Promise.all([
    getRanking(supabase, { campaign_id: campaign.id }),
    user?.team_id ? getRanking(supabase, { campaign_id: campaign.id, team_id: user.team_id }) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏆 {campaign.name} — Classificação</h1>
      <Tabs defaultValue="overall">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="overall">Geral</TabsTrigger>
          <TabsTrigger value="team">Meu Time</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="mt-4">
          <RankingTable rows={overall} highlightUserId={user?.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <RankingTable rows={teamRanking} highlightUserId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
