import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await request.json() as { reason: string }
  const admin = createAdminClient()

  const { data: existing } = await admin.from('point_transactions').select('points').eq('id', id).single()
  await admin.from('point_audit_logs').insert({
    transaction_id: id, action: 'reversed', changed_by: user.id,
    previous_points: existing?.points, new_points: 0, reason,
  })

  const { data, error } = await admin.from('point_transactions')
    .update({ status: 'reversed' }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
