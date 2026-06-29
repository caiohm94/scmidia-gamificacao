import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { getDaysInMonth, formatValueCompact } from '@/lib/goals/helpers'

type GoalWithRule = {
  id: string
  scoring_rule_id: string
  actual_value: number | null
  target_value: number
  period_date: string
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null
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
    .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period)')
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

  const cardBg = 'rgba(255,255,255,0.03)'
  const cardBorder = 'rgba(255,255,255,0.08)'
  const muted = 'rgba(255,255,255,0.35)'
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
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

              {!isMonthly && (
                <div>
                  <p style={{ fontSize: '0.7rem', color: muted, marginBottom: '0.5rem', fontWeight: 500 }}>
                    Dias do mês
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {days.map(d => {
                      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const g = ruleGoals.find(r => r.period_date === dateStr)
                      const isFuture = dateStr > today
                      const isToday = dateStr === today
                      const achieved = g != null && g.actual_value != null && g.actual_value >= g.target_value
                      const hasData = g != null && g.actual_value != null

                      let bg = 'rgba(255,255,255,0.06)'
                      let color = muted
                      let border = cardBorder
                      if (!g || isFuture) {
                        bg = 'rgba(255,255,255,0.03)'; color = 'rgba(255,255,255,0.2)'
                      } else if (achieved) {
                        bg = 'rgba(141,178,60,0.2)'; color = '#8DB23C'; border = 'rgba(141,178,60,0.3)'
                      } else if (hasData) {
                        bg = 'rgba(249,115,22,0.15)'; color = '#f97316'; border = 'rgba(249,115,22,0.25)'
                      }

                      const vt = rule?.value_type ?? 'number'
                      const dp = rule?.decimal_places ?? 0
                      const tooltip = g
                        ? `${formatValueCompact(g.actual_value ?? 0, vt, dp)} / ${formatValueCompact(g.target_value, vt, dp)}`
                        : undefined

                      return (
                        <div
                          key={d}
                          title={tooltip}
                          style={{
                            width: 32, height: 32,
                            borderRadius: isToday ? '50%' : '0 0.35rem 0.35rem 0.35rem',
                            background: bg,
                            border: `1px solid ${isToday ? '#FFDF00' : border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: isToday ? 700 : 500,
                            color: isToday ? '#FFDF00' : color,
                            cursor: tooltip ? 'help' : 'default',
                          }}
                        >
                          {d}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { color: '#8DB23C', label: 'Bateu a meta' },
                      { color: '#f97316', label: 'Abaixo da meta' },
                      { color: 'rgba(255,255,255,0.2)', label: 'Sem meta / futuro' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: '0.65rem', color: muted }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
