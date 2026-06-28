import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  points: z.number().int().optional(),
  description: z.string().optional(),
  applies_to: z.enum(['all', 'internal_seller', 'external_seller', 'hunter']).optional(),
  category: z.enum(['goal', 'activity', 'behavior', 'bonus', 'penalty']).optional(),
  target_value: z.number().int().optional(),
  target_period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { id: campaignId, ruleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = updateRuleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scoring_rules')
    .update(parsed.data)
    .eq('id', ruleId)
    .eq('campaign_id', campaignId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { id: campaignId, ruleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('scoring_rules')
    .delete()
    .eq('id', ruleId)
    .eq('campaign_id', campaignId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
