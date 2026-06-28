import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { salesforceRuleFieldsSchema } from '@/schemas/salesforce'

const ruleSchema = z.object({
  name: z.string().min(1),
  points: z.number().int(),
  applies_to: z.enum(['all', 'internal_seller', 'external_seller', 'hunter']),
  category: z.enum(['goal', 'activity', 'behavior', 'bonus', 'penalty']),
  description: z.string().optional(),
  target_value: z.number().int().optional(),
  target_period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  is_active: z.boolean().default(true),
}).extend(salesforceRuleFieldsSchema.shape)

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('scoring_rules')
    .select('*, scoring_rule_exceptions(*, users(name))')
    .eq('campaign_id', id).order('category')
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('scoring_rules')
    .insert({ ...parsed.data, campaign_id: id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { rule_id, is_active } = await request.json() as { rule_id: string; is_active: boolean }
  const admin = createAdminClient()
  const { data, error } = await admin.from('scoring_rules')
    .update({ is_active }).eq('id', rule_id).eq('campaign_id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
