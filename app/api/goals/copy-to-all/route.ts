import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getDaysInMonth, periodDateForDay, parseMonthParam } from '@/lib/goals/helpers'

async function getManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await getManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { scoring_rule_id, campaign_id, from_user_id, month } = await req.json()
  if (!scoring_rule_id || !campaign_id || !from_user_id || !month) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)
  const from = periodDateForDay(year, m, 1)
  const to = periodDateForDay(year, m, days[days.length - 1])
  const admin = createAdminClient()

  const { data: sourceGoals } = await admin
    .from('participant_goals')
    .select('period_date, target_value')
    .eq('scoring_rule_id', scoring_rule_id)
    .eq('user_id', from_user_id)
    .gte('period_date', from)
    .lte('period_date', to)

  if (!sourceGoals || sourceGoals.length === 0) {
    return NextResponse.json({ error: 'Source participant has no goals' }, { status: 400 })
  }

  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', campaign_id)

  const otherUserIds = (participants ?? [])
    .map(p => p.user_id)
    .filter(id => id !== from_user_id)

  let created = 0
  for (const uid of otherUserIds) {
    const toInsert = sourceGoals.map(sg => ({
      scoring_rule_id,
      campaign_id,
      user_id: uid,
      period_date: sg.period_date,
      target_value: sg.target_value,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await admin
      .from('participant_goals')
      .upsert(toInsert, { onConflict: 'scoring_rule_id,user_id,period_date' })

    if (!error) created += toInsert.length
  }

  return NextResponse.json({ created })
}
