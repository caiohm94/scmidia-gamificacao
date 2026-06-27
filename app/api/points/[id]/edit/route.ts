import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const editSchema = z.object({ points: z.number().int(), description: z.string().optional(), reason: z.string().min(1) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('point_transactions').select('points').eq('id', id).single()
  await admin.from('point_audit_logs').insert({
    transaction_id: id, action: 'edited', changed_by: user.id,
    previous_points: existing?.points, new_points: parsed.data.points, reason: parsed.data.reason,
  })

  const { data, error } = await admin.from('point_transactions')
    .update({ points: parsed.data.points, description: parsed.data.description }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
