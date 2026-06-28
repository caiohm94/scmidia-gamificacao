import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { RankingTable } from '@/components/game/RankingTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Download } from 'lucide-react'

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
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Rankings</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Campaign selector */}
          {(campaigns ?? []).length > 1 && (
            <form method="GET">
              <select name="campaign_id" defaultValue={activeCampaignId ?? ''} onChange={e => (e.target.form as HTMLFormElement).submit()}
                style={{ border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#3F3E3E' }}>
                {(campaigns ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </form>
          )}
          <a href={`/api/rankings/export?campaign_id=${activeCampaignId}`}>
            <button className="sc-btn-outline text-sm cursor-pointer flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Download size={14} />
              Exportar CSV
            </button>
          </a>
        </div>
      </div>

      <div className="p-6">
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
    </div>
  )
}
