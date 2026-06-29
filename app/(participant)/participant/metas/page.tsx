import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { MetasCalendar } from '@/components/participant/MetasCalendar'
import { getDaysInMonth } from '@/lib/goals/helpers'

type GoalWithRule = {
  id: string
  scoring_rule_id: string
  actual_value: number | null
  target_value: number
  period_date: string
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean } | null
}

export default async function MetasPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const [y, m] = today.slice(0, 7).split('-').map(Number)
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const { data } = await supabase
    .from('participant_goals')
    .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period, is_cumulative)')
    .eq('user_id', user.id)
    .gte('period_date', monthStart)
    .lte('period_date', monthEnd)
    .order('period_date')
  const goals = (data ?? []) as GoalWithRule[]

  const byRule = new Map<string, GoalWithRule[]>()
  for (const g of goals) {
    const arr = byRule.get(g.scoring_rule_id) ?? []
    arr.push(g)
    byRule.set(g.scoring_rule_id, arr)
  }

  const cardBg = 'var(--p-card-bg, rgba(0,0,0,0.035))'
  const cardBorder = 'var(--p-card-border, rgba(0,0,0,0.1))'
  const muted = 'var(--p-muted, #6b7d6c)'
  const days = getDaysInMonth(y, m)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>
          🎯 Minhas Metas
        </h1>
        <span style={{ fontSize: '0.82rem', color: muted, textTransform: 'capitalize' }}>{monthLabel}</span>
      </div>

      {byRule.size === 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: muted, fontSize: '0.85rem' }}>Nenhuma meta definida para este mês.</p>
        </div>
      )}

      {[...byRule.entries()].map(([ruleId, ruleGoals]) => {
        const rule = ruleGoals[0].scoring_rules
        const isMonthly = rule?.target_period === 'monthly'
        const monthlyGoal = isMonthly ? ruleGoals[0] : null
        const totalActual = ruleGoals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
        const totalTarget = ruleGoals.reduce((s, g) => s + g.target_value, 0)

        return (
          <div key={ruleId} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--p-sub-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>
                {rule?.name ?? 'Meta'}
              </p>
              <span style={{ fontSize: '0.65rem', color: muted, background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>
                {isMonthly ? 'Mensal' : 'Diário'}
              </span>
            </div>

            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <GoalProgressBar
                label={isMonthly ? 'Meta do mês' : 'Progresso do mês'}
                actual={isMonthly ? (monthlyGoal?.actual_value ?? null) : totalActual}
                target={isMonthly ? (monthlyGoal?.target_value ?? 0) : totalTarget}
                valueType={rule?.value_type ?? 'number'}
                decimalPlaces={rule?.decimal_places ?? 0}
              />

              {!isMonthly && rule && (
                <MetasCalendar
                  days={days}
                  goals={ruleGoals.map(g => ({
                    id: g.id,
                    actual_value: g.actual_value,
                    target_value: g.target_value,
                    period_date: g.period_date,
                  }))}
                  year={y}
                  month={m}
                  today={today}
                  rule={{
                    name: rule.name,
                    value_type: rule.value_type,
                    decimal_places: rule.decimal_places,
                  }}
                  is_cumulative={rule.is_cumulative ?? false}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
