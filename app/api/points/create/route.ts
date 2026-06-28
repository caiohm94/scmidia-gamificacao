import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { pointSchema } from '@/schemas/point'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = pointSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Apply exception override if exists
  let points = parsed.data.points
  if (parsed.data.scoring_rule_id) {
    const admin = createAdminClient()
    const { data: exception } = await admin
      .from('scoring_rule_exceptions')
      .select('points_override')
      .eq('scoring_rule_id', parsed.data.scoring_rule_id)
      .eq('user_id', parsed.data.user_id)
      .single()
    if (exception) points = exception.points_override
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('point_transactions')
    .insert({ ...parsed.data, points, created_by: user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
