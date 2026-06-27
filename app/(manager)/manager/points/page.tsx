import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { PointForm } from '@/components/points/PointForm'

export default async function PointsPage() {
  await requireRole('manager')
  const supabase = await createClient()

  const [{ data: campaigns }, { data: users }, { data: rules }] = await Promise.all([
    supabase.from('campaigns').select('id, name').eq('status', 'active'),
    supabase.from('users').select('id, name').eq('status', 'active').order('name'),
    supabase.from('scoring_rules').select('id, name, points, campaign_id').eq('is_active', true),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Lançar Pontos</h1>
      <PointForm
        campaigns={campaigns ?? []}
        participants={users ?? []}
        rules={rules ?? []}
      />
    </div>
  )
}
