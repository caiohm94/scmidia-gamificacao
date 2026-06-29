import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

async function getManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await getManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const ruleId = searchParams.get('rule_id')
  const month = searchParams.get('month') // '2026-06'

  if (!ruleId || !month) {
    return NextResponse.json({ error: 'rule_id and month required' }, { status: 400 })
  }

  const [year, m] = month.split('-').map(Number)
  const from = `${year}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('participant_goals')
    .select('*')
    .eq('scoring_rule_id', ruleId)
    .gte('period_date', from)
    .lte('period_date', to)
    .order('period_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest) {
  const user = await getManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const goals: Array<{
    scoring_rule_id: string
    campaign_id: string
    user_id: string
    period_date: string
    target_value?: number
    actual_value?: number
  }> = body.goals ?? []

  if (!Array.isArray(goals) || goals.length === 0) {
    return NextResponse.json({ error: 'goals array required' }, { status: 400 })
  }

  const admin = createAdminClient()
  let awarded = 0

  for (const g of goals) {
    const { data: existing } = await admin
      .from('participant_goals')
      .select('id, target_value, actual_value, points_awarded, scoring_rule_id')
      .eq('scoring_rule_id', g.scoring_rule_id)
      .eq('user_id', g.user_id)
      .eq('period_date', g.period_date)
      .single()

    const targetValue = g.target_value ?? existing?.target_value
    if (targetValue === undefined || targetValue === null) continue

    const actualValue = g.actual_value !== undefined ? g.actual_value : existing?.actual_value

    const updatePayload: Record<string, unknown> = {
      scoring_rule_id: g.scoring_rule_id,
      campaign_id: g.campaign_id,
      user_id: g.user_id,
      period_date: g.period_date,
      target_value: targetValue,
      actual_value: actualValue ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data: upserted, error: upsertErr } = await admin
      .from('participant_goals')
      .upsert(updatePayload, { onConflict: 'scoring_rule_id,user_id,period_date' })
      .select()
      .single()

    if (upsertErr || !upserted) continue

    const alreadyAwarded = existing?.points_awarded ?? false
    const shouldAward =
      !alreadyAwarded &&
      actualValue !== null &&
      actualValue !== undefined &&
      targetValue !== null &&
      actualValue >= targetValue

    if (!shouldAward) continue

    const { data: rule } = await admin
      .from('scoring_rules')
      .select('points')
      .eq('id', g.scoring_rule_id)
      .single()

    if (!rule) continue

    const { data: tx } = await admin
      .from('point_transactions')
      .insert({
        campaign_id: g.campaign_id,
        user_id: g.user_id,
        scoring_rule_id: g.scoring_rule_id,
        points: rule.points,
        event_date: g.period_date,
        origin: 'meta',
        status: 'active',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (!tx) continue

    await admin
      .from('participant_goals')
      .update({ points_awarded: true, awarded_tx_id: tx.id })
      .eq('id', upserted.id)

    awarded++
  }

  return NextResponse.json({ ok: true, awarded })
}
