import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bulkSchema = z.object({
  campaign_id: z.string().uuid(),
  points: z.number().int().refine(v => v !== 0, 'Pontos não podem ser zero'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()

  // Fetch all participants in the campaign
  const { data: participants, error: pErr } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', parsed.data.campaign_id)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante na campanha' }, { status: 400 })
  }

  const rows = participants.map(p => ({
    campaign_id: parsed.data.campaign_id,
    user_id: p.user_id,
    points: parsed.data.points,
    event_date: parsed.data.event_date,
    description: parsed.data.description ?? 'Saldo inicial',
    origin: 'manual' as const,
    scoring_rule_id: null,
    created_by: user.id,
  }))

  const { data, error } = await admin.from('point_transactions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 })
}
