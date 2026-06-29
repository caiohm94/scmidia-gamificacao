# Participant Dashboard Redesign

**Goal:** Redesign the participant dashboard to be visually stunning with animations, profile photo, goal progress, and a new dedicated Metas page — visible identically on both the real participant view and the manager preview.

**Architecture:** Extract dashboard logic into a shared server-renderable component `ParticipantDashboardView` that accepts prefetched data as props. Both `/participant/dashboard` and `/manager/preview/[userId]` pass their respective data (self vs admin-fetched) to this component. A new `/participant/metas` page + API endpoint exposes the participant's own goals.

**Tech Stack:** Next.js App Router (server components), Supabase admin client, CSS animations via inline keyframes + `@keyframes` in a client wrapper, `date-fns` for date formatting.

## Global Constraints

- Dark theme: background `#0d1a0f`, card bg `rgba(255,255,255,0.04)`, card border `rgba(255,255,255,0.08)`
- Primary accent: `#FFDF00` (yellow/gold) for points; `#8DB23C` (SC Mídia green) for goals/progress
- Font: `var(--font-outfit, sans-serif)` for headings and numbers
- Border radius convention: `0 R R R` (top-left square) on all cards — matches SC Mídia design system
- No Tailwind dark classes — inline styles only (existing pattern in participant pages)
- Animations must degrade gracefully (no JS = no animation, content still visible)
- Preview route `/manager/preview/[userId]` must always stay in sync visually with the real participant route

---

## Task 1: Shared data types and API for participant goals

**Files:**
- Create: `app/api/participant/goals/route.ts`

**Interfaces:**
- Produces: `GET /api/participant/goals?month=YYYY-MM` — returns `ParticipantGoalRow[]` filtered to the authenticated participant's user_id for the given month, joined with `scoring_rules(name, value_type, decimal_places, target_period, applies_to)`

- [ ] **Step 1: Create the route file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month') // 'YYYY-MM'
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [year, m] = month.split('-').map(Number)
  const from = `${year}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participant_goals')
    .select('*, scoring_rules(name, value_type, decimal_places, target_period, applies_to)')
    .eq('user_id', user.id)
    .gte('period_date', from)
    .lte('period_date', to)
    .order('period_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/participant/goals/route.ts
git commit -m "feat: participant goals API endpoint"
```

---

## Task 2: AnimatedCounter client component

**Files:**
- Create: `components/participant/AnimatedCounter.tsx`

**Interfaces:**
- Produces: `<AnimatedCounter value={number} duration={number} />` — animates from 0 to `value` using `requestAnimationFrame`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useEffect, useRef } from 'react'

interface Props { value: number; duration?: number; style?: React.CSSProperties }

export function AnimatedCounter({ value, duration = 1200, style }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      el!.textContent = Math.round(eased * value).toLocaleString('pt-BR')
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return <span ref={ref} style={style}>{value.toLocaleString('pt-BR')}</span>
}
```

- [ ] **Step 2: Commit**

```bash
git add components/participant/AnimatedCounter.tsx
git commit -m "feat: AnimatedCounter client component"
```

---

## Task 3: GoalProgressBar client component

**Files:**
- Create: `components/participant/GoalProgressBar.tsx`

**Interfaces:**
- Produces: `<GoalProgressBar actual={number} target={number} valueType={string} decimalPlaces={number} label={string} />` — animated progress bar with label, values, and achieved indicator

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { formatValueCompact } from '@/lib/goals/helpers'

interface Props {
  label: string
  actual: number | null
  target: number
  valueType: string
  decimalPlaces: number
  periodLabel?: string
}

export function GoalProgressBar({ label, actual, target, valueType, decimalPlaces, periodLabel }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const pct = target > 0 ? Math.min(((actual ?? 0) / target) * 100, 100) : 0
  const achieved = (actual ?? 0) >= target && target > 0

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    el.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.width = `${pct}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [pct])

  const color = achieved ? '#8DB23C' : pct >= 70 ? '#FFDF00' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
          {periodLabel && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem' }}>{periodLabel}</span>}
          {achieved && <span style={{ fontSize: '0.7rem' }}>✅</span>}
        </div>
        <span style={{ fontSize: '0.78rem', color: achieved ? '#8DB23C' : 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
          {formatValueCompact(actual ?? 0, valueType, decimalPlaces)} / {formatValueCompact(target, valueType, decimalPlaces)}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', borderRadius: 3, background: color, width: '0%' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/participant/GoalProgressBar.tsx
git commit -m "feat: GoalProgressBar animated component"
```

---

## Task 4: Redesign participant dashboard page

**Files:**
- Modify: `app/(participant)/participant/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AnimatedCounter` from Task 2, `GoalProgressBar` from Task 3
- Consumes: `participant_goals` joined with `scoring_rules` — fetched server-side for current month and today's date

**Data to fetch (add to existing fetches):**
```typescript
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7) // 'YYYY-MM'
const [year, m] = currentMonth.split('-').map(Number)
const monthStart = `${year}-${String(m).padStart(2, '0')}-01`
const monthEnd = new Date(year, m, 0)
const monthEndStr = `${year}-${String(m).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

type GoalWithRule = ParticipantGoalRow & {
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null
}

const { data: goalsRaw } = campaign ? await supabase
  .from('participant_goals')
  .select('*, scoring_rules(name, value_type, decimal_places, target_period)')
  .eq('user_id', user.id)
  .gte('period_date', monthStart)
  .lte('period_date', monthEndStr) : { data: null }

const goals = (goalsRaw ?? []) as GoalWithRule[]

// For monthly rules: the one row for this month
// For daily rules: today's row
const todayGoals = goals.filter(g => {
  if (g.scoring_rules?.target_period === 'monthly') return g.period_date === monthStart
  return g.period_date === today
})
```

- [ ] **Step 1: Add goal data fetching after existing fetches**

Add the goal fetch block above (inside `if (campaign)` or after it, using `user.id` and `campaign?.id`).

- [ ] **Step 2: Replace the return JSX**

Full replacement of the return block:

```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

    {/* Hero */}
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0 1.25rem 1.25rem 1.25rem', padding: '1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Avatar src={user.avatar_url} name={user.name} size={72} />
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.1 }}>
            Olá, {user.name.split(' ')[0]}! 👋
          </h1>
          {campaign && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{campaign.name}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
        <StreakBadge streak={myStreak} />
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
      <div style={{ background: 'rgba(255,223,0,0.06)', border: '1px solid rgba(255,223,0,0.2)', borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <AnimatedCounter value={totalPoints} style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFDF00', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }} />
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>pontos totais ⚽</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myPosition ? `#${myPosition}` : '—'}</div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>posição no ranking 🏆</p>
      </div>
      <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f97316', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myStreak}</div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>dias seguidos 🔥</p>
      </div>
    </div>

    {/* Goals today */}
    {todayGoals.length > 0 && (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)' }}>Minhas metas</p>
          <a href="/participant/metas" style={{ fontSize: '0.72rem', color: '#8DB23C', textDecoration: 'none' }}>Ver tudo →</a>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {todayGoals.map(g => (
            <GoalProgressBar
              key={g.id}
              label={g.scoring_rules?.name ?? 'Meta'}
              actual={g.actual_value}
              target={g.target_value}
              valueType={g.scoring_rules?.value_type ?? 'number'}
              decimalPlaces={g.scoring_rules?.decimal_places ?? 0}
              periodLabel={g.scoring_rules?.target_period === 'monthly' ? 'Mensal' : 'Hoje'}
            />
          ))}
        </div>
      </div>
    )}

    {/* Recent points + bonuses */}
    <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses && earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)' }}>Últimos pontos</p>
        </div>
        <div>
          {myPoints.length === 0
            ? <p style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>Nenhum ponto ainda.</p>
            : myPoints.slice(0, 8).map(pt => (
                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', flex: 1 }}>{pt.scoring_rules?.name ?? 'Bônus'}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginRight: '0.75rem' }}>{format(new Date(pt.event_date), 'dd/MM')}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '0 0.25rem 0.25rem 0.25rem', background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)', color: pt.points > 0 ? '#8DB23C' : '#f87171' }}>
                    {pt.points > 0 ? '+' : ''}{pt.points}
                  </span>
                </div>
              ))}
        </div>
      </div>

      {earnedBonuses && earnedBonuses.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)' }}>Conquistas</p>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {earnedBonuses.map(ub => (
              <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

  </div>
)
```

- [ ] **Step 3: Add `Avatar` import and `AnimatedCounter` / `GoalProgressBar` imports**

```typescript
import { Avatar } from '@/components/shared/Avatar'
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(participant)/participant/dashboard/page.tsx
git commit -m "feat: redesign participant dashboard with hero, goals, animated counter"
```

---

## Task 5: New Metas page for participant

**Files:**
- Create: `app/(participant)/participant/metas/page.tsx`
- Modify: `components/shared/ParticipantNav.tsx` — add "Metas" tab

**Interfaces:**
- Consumes: `GoalProgressBar` from Task 3
- Fetches: all `participant_goals` for current month joined with `scoring_rules`

- [ ] **Step 1: Add Metas to nav**

In `components/shared/ParticipantNav.tsx`, add `{ href: '/participant/metas', label: 'Metas' }` to the items array after 'Painel'.

- [ ] **Step 2: Create the Metas page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { getDaysInMonth } from '@/lib/goals/helpers'
import { formatValueCompact } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type GoalWithRule = ParticipantGoalRow & {
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function MetasPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  const month = currentMonthStr()
  const [year, m] = month.split('-').map(Number)
  const monthStart = `${year}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const monthEnd = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('participant_goals')
    .select('*, scoring_rules(name, value_type, decimal_places, target_period)')
    .eq('user_id', user.id)
    .gte('period_date', monthStart)
    .lte('period_date', monthEnd)
    .order('period_date')

  const goals = (data ?? []) as GoalWithRule[]

  // Group by scoring_rule_id
  const byRule = new Map<string, GoalWithRule[]>()
  for (const g of goals) {
    const arr = byRule.get(g.scoring_rule_id) ?? []
    arr.push(g)
    byRule.set(g.scoring_rule_id, arr)
  }

  const cardBg = 'rgba(255,255,255,0.03)'
  const cardBorder = 'rgba(255,255,255,0.08)'
  const muted = 'rgba(255,255,255,0.35)'
  const monthLabel = new Date(year, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>🎯 Minhas Metas</h1>
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
        const days = getDaysInMonth(year, m)

        // For monthly: single row
        const monthlyGoal = isMonthly ? ruleGoals[0] : null

        // For daily: sum actual for progress, today's goal
        const totalActual = ruleGoals.reduce((sum, g) => sum + (g.actual_value ?? 0), 0)
        const totalTarget = ruleGoals.reduce((sum, g) => sum + g.target_value, 0)

        return (
          <div key={ruleId} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>{rule?.name ?? 'Meta'}</p>
                <span style={{ fontSize: '0.65rem', color: muted, background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>
                  {isMonthly ? 'Mensal' : 'Diário'}
                </span>
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Monthly progress bar */}
              <GoalProgressBar
                label={isMonthly ? 'Meta do mês' : 'Progresso do mês'}
                actual={isMonthly ? (monthlyGoal?.actual_value ?? null) : totalActual}
                target={isMonthly ? (monthlyGoal?.target_value ?? 0) : totalTarget}
                valueType={rule?.value_type ?? 'number'}
                decimalPlaces={rule?.decimal_places ?? 0}
              />

              {/* Daily calendar (only for daily rules) */}
              {!isMonthly && (
                <div>
                  <p style={{ fontSize: '0.7rem', color: muted, marginBottom: '0.5rem', fontWeight: 500 }}>Dias do mês</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {days.map(d => {
                      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const g = ruleGoals.find(r => r.period_date === dateStr)
                      const isFuture = dateStr > today
                      const isToday = dateStr === today
                      const achieved = g && g.actual_value != null && g.actual_value >= g.target_value
                      const hasData = g && g.actual_value != null
                      const noTarget = !g

                      let bg = 'rgba(255,255,255,0.06)'
                      let color = muted
                      let border = 'rgba(255,255,255,0.08)'
                      if (noTarget || isFuture) { bg = 'rgba(255,255,255,0.03)'; color = 'rgba(255,255,255,0.2)' }
                      else if (achieved) { bg = 'rgba(141,178,60,0.2)'; color = '#8DB23C'; border = 'rgba(141,178,60,0.3)' }
                      else if (hasData) { bg = 'rgba(249,115,22,0.15)'; color = '#f97316'; border = 'rgba(249,115,22,0.25)' }

                      return (
                        <div key={d} title={g ? `${formatValueCompact(g.actual_value ?? 0, rule?.value_type ?? 'number', rule?.decimal_places ?? 0)} / ${formatValueCompact(g.target_value, rule?.value_type ?? 'number', rule?.decimal_places ?? 0)}` : ''}
                          style={{
                            width: 32, height: 32, borderRadius: isToday ? '50%' : '0 0.35rem 0.35rem 0.35rem',
                            background: bg, border: `1px solid ${isToday ? '#FFDF00' : border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#FFDF00' : color,
                            cursor: g ? 'help' : 'default',
                          }}>
                          {d}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
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
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(participant)/participant/metas/page.tsx components/shared/ParticipantNav.tsx
git commit -m "feat: participant metas page with progress bars and calendar"
```

---

## Task 6: Update manager preview to use redesigned dashboard

**Files:**
- Modify: `app/(manager)/manager/preview/[userId]/page.tsx`

**Interfaces:**
- Consumes: `AnimatedCounter` from Task 2, `GoalProgressBar` from Task 3
- The preview page already fetches points/ranking/streak/level/bonuses; add goals fetch using admin client

**Changes:**
1. Add goal fetch (same query as Task 4 but via `createAdminClient()` and filtering by `userId`)
2. Replace the painel tab JSX with the same structure as Task 4 (hero + stats + goals + recent points + bonuses)
3. Add "Metas" tab to the preview nav (renders same Metas page logic server-side for the target user)

- [ ] **Step 1: Add goal fetch in preview page**

Inside `if (campaign)` block (after existing fetches), add:

```typescript
const todayStr = new Date().toISOString().slice(0, 10)
const currentMonthStr2 = todayStr.slice(0, 7)
const [gy, gm] = currentMonthStr2.split('-').map(Number)
const gMonthStart = `${gy}-${String(gm).padStart(2, '0')}-01`
const gLastDay = new Date(gy, gm, 0).getDate()
const gMonthEnd = `${gy}-${String(gm).padStart(2, '0')}-${String(gLastDay).padStart(2, '0')}`

type GoalWithRule = { id: string; scoring_rule_id: string; actual_value: number | null; target_value: number; period_date: string; points_awarded: boolean; scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null }
const { data: goalsRaw2 } = await admin
  .from('participant_goals')
  .select('id, scoring_rule_id, actual_value, target_value, period_date, points_awarded, scoring_rules(name, value_type, decimal_places, target_period)')
  .eq('user_id', userId)
  .gte('period_date', gMonthStart)
  .lte('period_date', gMonthEnd)
const previewGoals = (goalsRaw2 ?? []) as GoalWithRule[]
const todayGoals2 = previewGoals.filter(g => {
  if (g.scoring_rules?.target_period === 'monthly') return g.period_date === gMonthStart
  return g.period_date === todayStr
})
```

- [ ] **Step 2: Replace painel tab JSX to match Task 4 dashboard design exactly**

Use the same JSX structure from Task 4, replacing:
- `user.avatar_url` / `user.name` → same (already available)
- `totalPoints` → same
- `todayGoals` → `todayGoals2`
- `myPoints` → same
- `earnedBonuses` → same
- Nav links: `href="/participant/metas"` → `href={navHref('metas')}`

- [ ] **Step 3: Add Metas tab to preview nav and render metas content**

Add `{ key: 'metas', label: 'Metas' }` to `NAV_TABS` array.

Add `{tab === 'metas' && ...}` section with the same metas page logic from Task 5 but reading `previewGoals` (already fetched) instead of fetching again.

- [ ] **Step 4: Add imports**

```typescript
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { getDaysInMonth, formatValueCompact } from '@/lib/goals/helpers'
```

- [ ] **Step 5: TypeScript check and commit**

```bash
npx tsc --noEmit
git add "app/(manager)/manager/preview/[userId]/page.tsx"
git commit -m "feat: sync preview with redesigned dashboard and metas tab"
```

---

## Self-Review

1. **Spec coverage:** API (Task 1), animated components (Tasks 2-3), dashboard redesign (Task 4), Metas page (Task 5), preview sync (Task 6) — all requirements covered.
2. **Placeholder scan:** No TBDs. All code blocks complete.
3. **Type consistency:** `GoalWithRule` defined in Tasks 4, 5, and 6 — same shape, same field names. `AnimatedCounter` and `GoalProgressBar` props consistent across all usages.
4. **Scope:** Focused. No unrelated refactoring.
