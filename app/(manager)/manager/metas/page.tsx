import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { TrendingUp } from 'lucide-react'
import { MetasPage } from '@/components/metas/MetasPage'

export default async function MetasServerPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string; rule_id?: string; month?: string; tab?: string }>
}) {
  await requireRole('manager')
  const params = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .order('name')

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Metas</h1>
        </div>
      </div>

      <div className="p-6">
        <MetasPage
          campaigns={campaigns ?? []}
          initialCampaignId={params.campaign_id ?? ''}
          initialRuleId={params.rule_id ?? ''}
          initialMonth={params.month ?? ''}
          initialTab={params.tab ?? 'metas'}
        />
      </div>
    </div>
  )
}
