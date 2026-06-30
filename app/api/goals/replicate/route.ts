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

  const { scoring_rule_id, campaign_id, user_id, month } = await req.json()
  if (!scoring_rule_id || !campaign_id || !user_id || !month) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('participant_goals')
    .select('period_date, target_value')
    .eq('scoring_rule_id', scoring_rule_id)
    .eq('user_id', user_id)
    .gte('period_date', periodDateForDay(year, m, 1))
    .lte('period_date', periodDateForDay(year, m, days[days.length - 1]))
    .order('period_date')

  const existingMap = new Map((existing ?? []).map(r => [r.period_date, r.target_value]))

  const firstWithValue = [...existingMap.entries()].find(([, v]) => v != null)
  if (!firstWithValue) {
    return NextResponse.json({ error: 'No meta defined for day 1' }, { status: 400 })
  }
  const templateValue = firstWithValue[1]

  const toInsert = days
    .map(d => periodDateForDay(year, m, d))
    .filter(date => {
      const dow = new Date(date + 'T12:00:00').getDay()
      return dow !== 0 && dow !== 6 // somente seg-sex
    })
    .filter(date => !existingMap.has(date))
    .map(date => ({
      scoring_rule_id,
      campaign_id,
      user_id,
      period_date: date,
      target_value: templateValue,
      updated_at: new Date().toISOString(),
    }))

  if (toInsert.length === 0) return NextResponse.json({ created: 0 })

  const { error } = await admin.from('participant_goals').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: toInsert.length })
}
