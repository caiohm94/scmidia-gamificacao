import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const importSchema = z.object({
  campaign_id: z.string().uuid(),
  rows: z.array(z.object({
    user_id: z.string().uuid(),
    scoring_rule_id: z.string().uuid().nullable(),
    points: z.number().int(),
    event_date: z.string(),
    description: z.string().optional(),
  })),
})

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
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const batch_id = crypto.randomUUID()
  const rows = await Promise.all(parsed.data.rows.map(async (r) => {
    let finalPoints = r.points
    if (r.scoring_rule_id) {
      const { data: exception } = await admin
        .from('scoring_rule_exceptions')
        .select('points_override')
        .eq('scoring_rule_id', r.scoring_rule_id)
        .eq('user_id', r.user_id)
        .maybeSingle()

      if (exception?.points_override != null) {
        finalPoints = exception.points_override
      }
    }
    return {
      ...r, points: finalPoints, campaign_id: parsed.data.campaign_id,
      origin: 'manual' as const, created_by: user.id, import_batch_id: batch_id,
    }
  }))

  const { data, error } = await admin.from('point_transactions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length, batch_id }, { status: 201 })
}
