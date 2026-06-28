import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { PointForm } from '@/components/points/PointForm'
import { Target } from 'lucide-react'

export default async function PointsPage() {
  await requireRole('manager')
  const supabase = await createClient()

  const [{ data: campaigns }, { data: users }, { data: rules }] = await Promise.all([
    supabase.from('campaigns').select('id, name').eq('status', 'active'),
    supabase.from('users').select('id, name').eq('status', 'active').order('name'),
    supabase.from('scoring_rules').select('id, name, points, campaign_id').eq('is_active', true),
  ])

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
      <div className="p-6">
        <div className="sc-card max-w-xl">
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
