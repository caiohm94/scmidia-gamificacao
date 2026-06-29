import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bulkSchema = z.object({
  campaign_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  // per-participant: array of { user_id, points }
  participants: z.array(z.object({
    user_id: z.string().uuid(),
    points: z.number().int().refine(v => v !== 0, 'Pontos não podem ser zero'),
  })).optional(),
  // legacy: single value for all
  points: z.number().int().optional(),
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

  // Build per-participant points map
  const pointsMap = new Map<string, number>()
  if (parsed.data.participants && parsed.data.participants.length > 0) {
    for (const p of parsed.data.participants) pointsMap.set(p.user_id, p.points)
  } else if (parsed.data.points) {
    for (const p of participants) pointsMap.set(p.user_id, parsed.data.points)
  } else {
    return NextResponse.json({ error: 'Informe pontos ou participantes' }, { status: 400 })
  }

  const rows = participants
    .filter(p => pointsMap.has(p.user_id))
    .map(p => ({
      campaign_id: parsed.data.campaign_id,
      user_id: p.user_id,
      points: pointsMap.get(p.user_id)!,
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
