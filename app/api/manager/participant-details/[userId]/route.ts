// app/api/manager/participant-details/[userId]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { todayBrazil } from '@/lib/goals/helpers'

type GoalItem = {
  id: string; rule_name: string; actual_value: number; target_value: number
  value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean
}
type PointItem = {
  id: string; points: number; event_date: string; description: string | null; scoring_rules: { name: string } | null
}
type GoalWithRule = {
  id: string; scoring_rule_id: string; actual_value: number | null; target_value: number; period_date: string
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean } | null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const campaignId = request.nextUrl.searchParams.get('campaign_id')
  if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const admin = createAdminClient()
  const today = todayBrazil()
  const [y, mo] = today.slice(0, 7).split('-').map(Number)
  const monthStart = `${y}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(y, mo, 0).getDate()
  const monthEnd = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [rankRow, levelsRow, goalsRow, txRow, cpRow] = await Promise.all([
    admin.from('campaign_rankings').select('total_points, position, current_streak, avatar_url, name').eq('campaign_id', campaignId).eq('user_id', userId).single(),
    admin.from('levels').select('name, badge_icon, color, min_points').eq('campaign_id', campaignId).order('min_points', { ascending: false }).limit(10),
    admin.from('participant_goals').select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period, is_cumulative)').eq('user_id', userId).eq('campaign_id', campaignId).gte('period_date', monthStart).lte('period_date', monthEnd),
    admin.from('point_transactions').select('id, points, event_date, description, scoring_rules(name)').eq('user_id', userId).eq('campaign_id', campaignId).eq('status', 'active').order('created_at', { ascending: false }).limit(8),
    admin.from('campaign_participants').select('photo_url').eq('campaign_id', campaignId).eq('user_id', userId).single(),
  ])

  const rank = rankRow.data
  const totalPoints = rank?.total_points ?? 0
  const level = (levelsRow.data ?? []).find(l => l.min_points <= totalPoints) ?? null

  // Deduplicate goals by rule — same logic as participant dashboard
  const allGoals = (goalsRow.data ?? []) as GoalWithRule[]
  const byRule = new Map<string, GoalWithRule[]>()
  for (const g of allGoals) {
    const arr = byRule.get(g.scoring_rule_id) ?? []
    arr.push(g)
    byRule.set(g.scoring_rule_id, arr)
  }

  const goals: GoalItem[] = [...byRule.entries()].flatMap(([, entries]) => {
    const rule = entries[0].scoring_rules
    if (!rule) return []
    if (rule.is_cumulative) {
      const totalActual = entries.reduce((s, g) => s + (g.actual_value ?? 0), 0)
      const totalTarget = entries.filter(g => g.period_date <= today).reduce((s, g) => s + g.target_value, 0)
      return [{ id: entries[0].id, rule_name: rule.name, actual_value: totalActual, target_value: totalTarget, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: rule.target_period, is_cumulative: true } as GoalItem]
    }
    if (rule.target_period === 'monthly') {
      const entry = entries.find(g => g.period_date === monthStart) ?? entries[0]
      return [{ id: entry.id, rule_name: rule.name, actual_value: entry.actual_value ?? 0, target_value: entry.target_value, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: 'monthly', is_cumulative: false } as GoalItem]
    }
    const entry = entries.find(g => g.period_date === today) ?? entries[0]
    return [{ id: entry.id, rule_name: rule.name, actual_value: entry.actual_value ?? 0, target_value: entry.target_value, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: rule.target_period, is_cumulative: false } as GoalItem]
  })

  type TxRow = { id: string; points: number; event_date: string; description: string | null; scoring_rules: { name: string } | null }
  const recentPoints: PointItem[] = ((txRow.data ?? []) as TxRow[]).map(tx => ({
    id: tx.id, points: tx.points, event_date: tx.event_date, description: tx.description, scoring_rules: tx.scoring_rules ? { name: tx.scoring_rules.name } : null,
  }))

  return NextResponse.json({
    name: rank?.name ?? '',
    avatar_url: cpRow.data?.photo_url ?? rank?.avatar_url ?? null,
    total_points: totalPoints,
    position: rank?.position ?? null,
    current_streak: rank?.current_streak ?? 0,
    level: level ? { name: level.name, badge_icon: level.badge_icon, color: level.color } : null,
    goals,
    recentPoints,
  })
}
