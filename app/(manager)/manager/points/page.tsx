import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { PointForm } from '@/components/points/PointForm'
import { BulkInitialBalanceForm } from '@/components/points/BulkInitialBalanceForm'
import { Target } from 'lucide-react'

export default async function PointsPage() {
  await requireRole('manager')
  const supabase = await createClient()

  const [{ data: campaigns }, { data: users }, { data: rules }, { data: participants }] = await Promise.all([
    supabase.from('campaigns').select('id, name').eq('status', 'active'),
    supabase.from('users').select('id, name').eq('status', 'active').order('name'),
    supabase.from('scoring_rules').select('id, name, points, campaign_id').eq('is_active', true),
    supabase.from('campaign_participants').select('campaign_id'),
  ])

  // Count participants per campaign
  const participantCounts: Record<string, number> = {}
  for (const p of participants ?? []) {
    participantCounts[p.campaign_id] = (participantCounts[p.campaign_id] ?? 0) + 1
  }

  const campaignsWithCount = (campaigns ?? []).map(c => ({
    ...c,
    participant_count: participantCounts[c.id] ?? 0,
  }))

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Lançar Pontos</h1>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-2xl">
        {/* Bulk initial balance */}
        <BulkInitialBalanceForm campaigns={campaignsWithCount} />

        {/* Individual point launch */}
        <div className="sc-card">
          <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.95rem', color: '#3F3E3E', marginBottom: '1rem' }}>
            Lançamento Individual
          </p>
          <PointForm
            campaigns={campaigns ?? []}
            participants={users ?? []}
            rules={rules ?? []}
          />
        </div>
      </div>
    </div>
  )
}
