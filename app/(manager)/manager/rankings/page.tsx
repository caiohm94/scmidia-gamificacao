import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { RankingTable } from '@/components/game/RankingTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

export default async function ManagerRankingsPage({ searchParams }: { searchParams: Promise<{ campaign_id?: string }> }) {
  await requireRole('manager')
  const { campaign_id } = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').neq('status', 'draft')
  const activeCampaignId = campaign_id ?? campaigns?.[0]?.id

  const ranking = activeCampaignId
    ? await getRanking(supabase, { campaign_id: activeCampaignId })
    : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rankings</h1>
        <div className="flex gap-2">
          <a href={`/api/rankings/export?campaign_id=${activeCampaignId}`}>
            <Button variant="outline" size="sm">Exportar CSV</Button>
          </a>
        </div>
      </div>
      <Tabs defaultValue="overall">
        <TabsList>
          <TabsTrigger value="overall">Geral</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores Int.</TabsTrigger>
          <TabsTrigger value="external">Vendedores Ext.</TabsTrigger>
          <TabsTrigger value="hunters">Hunters</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="mt-4">
          <RankingTable rows={ranking} />
        </TabsContent>
        <TabsContent value="sellers" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'internal_seller')} />
        </TabsContent>
        <TabsContent value="external" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'external_seller')} />
        </TabsContent>
        <TabsContent value="hunters" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'hunter')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
