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

  const body = await request.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const batch_id = crypto.randomUUID()
  const rows = parsed.data.rows.map(r => ({
    ...r, campaign_id: parsed.data.campaign_id,
    origin: 'manual' as const, created_by: user.id, import_batch_id: batch_id,
  }))

  const admin = createAdminClient()
  const { data, error } = await admin.from('point_transactions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length, batch_id }, { status: 201 })
}
