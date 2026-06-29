# Participant Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the participant dashboard with hero card, animated counters, goal progress bars, a new Metas page with monthly progress + day calendar, and sync the manager preview to show the identical experience.

**Architecture:** Two new shared client components (`AnimatedCounter`, `GoalProgressBar`) are created first. The participant dashboard page is then rewritten to use them, fetching goals server-side. A new `/participant/metas` page is added. Finally the manager preview is updated to match. Both the real participant route and the preview share the same visual code — the only difference is whether data comes from the session user or from the admin client by userId.

**Tech Stack:** Next.js 16 App Router (server components), Supabase, `date-fns`, inline styles (no Tailwind dark classes), `requestAnimationFrame` for animations.

## Global Constraints

- Dark theme only: background `#0d1a0f`, card bg `rgba(255,255,255,0.04)`, card border `rgba(255,255,255,0.08)`
- Primary accent: `#FFDF00` (points/gold), `#8DB23C` (goals/green), `#f97316` (streak/orange)
- Font: `var(--font-outfit, sans-serif)` for headings and large numbers
- Border radius: `0 R R R` (top-left square) on all cards — matches SC Mídia design system
- No Tailwind dark-mode classes — inline styles only
- `params` and `searchParams` are `Promise<...>` in Next.js 16 — always `await` them
- Animations degrade gracefully: content visible without JS, animation is enhancement only
- Manager preview at `/manager/preview/[userId]` must always match the real participant view visually

---

## File Structure

```
components/participant/
  AnimatedCounter.tsx      ← new: client, animates number from 0 to value
  GoalProgressBar.tsx      ← new: client, animated progress bar with label + values

app/(participant)/participant/
  dashboard/page.tsx       ← modify: add hero, goals section, use new components
  metas/page.tsx           ← new: monthly progress + day calendar per rule

app/api/participant/
  goals/route.ts           ← new: GET participant's own goals (auth as participant)

components/shared/
  ParticipantNav.tsx       ← modify: add "Metas" tab

app/(manager)/manager/preview/[userId]/
  page.tsx                 ← modify: add goals data + Metas tab, match dashboard redesign
```

---

## Task 1: AnimatedCounter component

**Files:**
- Create: `components/participant/AnimatedCounter.tsx`

**Interfaces:**
- Produces: `<AnimatedCounter value={number} duration={number} style={React.CSSProperties} />` — client component, animates from 0 to `value` on mount using `requestAnimationFrame` with ease-out cubic

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useEffect, useRef } from 'react'

interface Props {
  value: number
  duration?: number
  style?: React.CSSProperties
}

export function AnimatedCounter({ value, duration = 1200, style }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el!.textContent = Math.round(eased * value).toLocaleString('pt-BR')
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return (
    <span ref={ref} style={style}>
      {value.toLocaleString('pt-BR')}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/participant/AnimatedCounter.tsx
git commit -m "feat: AnimatedCounter client component with ease-out animation"
```

---

## Task 2: GoalProgressBar component

**Files:**
- Create: `components/participant/GoalProgressBar.tsx`

**Interfaces:**
- Consumes: `formatValueCompact(value, valueType, decimalPlaces)` from `@/lib/goals/helpers`
- Produces: `<GoalProgressBar label actual target valueType decimalPlaces periodLabel? />` — animated bar, green when achieved, yellow when ≥70%, grey otherwise

- [ ] **Step 1: Create the file**

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

  const barColor = achieved
    ? '#8DB23C'
    : pct >= 70
    ? '#FFDF00'
    : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {label}
          </span>
          {periodLabel && (
            <span style={{
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem',
            }}>
              {periodLabel}
            </span>
          )}
          {achieved && <span style={{ fontSize: '0.7rem' }}>✅</span>}
        </div>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-outfit)',
          color: achieved ? '#8DB23C' : 'rgba(255,255,255,0.6)',
        }}>
          {formatValueCompact(actual ?? 0, valueType, decimalPlaces)}
          {' / '}
          {formatValueCompact(target, valueType, decimalPlaces)}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', borderRadius: 3, background: barColor, width: '0%' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/participant/GoalProgressBar.tsx
git commit -m "feat: GoalProgressBar animated component"
```

---

## Task 3: Redesign participant dashboard page

**Files:**
- Modify: `app/(participant)/participant/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AnimatedCounter` (Task 1), `GoalProgressBar` (Task 2)
- Consumes: `Avatar` from `@/components/shared/Avatar`
- New fetch: `participant_goals` joined with `scoring_rules(name, value_type, decimal_places, target_period)` for current month, filtered to today's date (or month start for monthly rules)

- [ ] **Step 1: Replace the entire file with this content**

```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Avatar } from '@/components/shared/Avatar'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { format } from 'date-fns'
import type { Tables, ParticipantGoalRow } from '@/types/database'

type PointWithRule = Tables<'point_transactions'> & {
  scoring_rules: { name: string } | null
}
type LevelEntry = {
  id: string; name: string; badge_icon: string; color: string; min_points: number
}
type BonusEntry = {
  id: string; bonuses: { name: string; badge_icon: string } | null
}
type GoalWithRule = ParticipantGoalRow & {
  scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null
}

export default async function ParticipantDashboard() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  const { data: rawPoints } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  const myPoints = (rawPoints ?? []) as PointWithRule[]
  const totalPoints = myPoints.reduce((sum, p) => sum + p.points, 0)

  let myPosition: number | null = null
  let myStreak = 0
  let currentLevel: LevelEntry | undefined
  let earnedBonuses: BonusEntry[] = []
  let todayGoals: GoalWithRule[] = []

  if (campaign) {
    const ranking = await getRanking(supabase, { campaign_id: campaign.id })
    const me = ranking.find(r => r.user_id === user.id)
    myPosition = me?.position ?? null
    myStreak = me?.current_streak ?? 0

    const { data: levels } = await supabase
      .from('levels').select('id, name, badge_icon, color, min_points')
      .eq('campaign_id', campaign.id)
      .lte('min_points', totalPoints)
      .order('min_points', { ascending: false }).limit(1)
    currentLevel = levels?.[0] as LevelEntry | undefined

    const { data: bonuses } = await supabase
      .from('user_bonuses').select('id, bonuses(name, badge_icon)')
      .eq('user_id', user.id).eq('campaign_id', campaign.id)
    earnedBonuses = (bonuses ?? []) as BonusEntry[]

    const today = new Date().toISOString().slice(0, 10)
    const [y, m] = today.slice(0, 7).split('-').map(Number)
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: goalsRaw } = await supabase
      .from('participant_goals')
      .select('*, scoring_rules(name, value_type, decimal_places, target_period)')
      .eq('user_id', user.id)
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd)
    const allGoals = (goalsRaw ?? []) as GoalWithRule[]
    todayGoals = allGoals.filter(g =>
      g.scoring_rules?.target_period === 'monthly'
        ? g.period_date === monthStart
        : g.period_date === today
    )
  }

  const cardBg = 'rgba(255,255,255,0.03)'
  const cardBorder = 'rgba(255,255,255,0.08)'
  const muted = 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Hero */}
      <div style={{
        background: cardBg, border: `1px solid ${cardBorder}`,
        borderRadius: '0 1.25rem 1.25rem 1.25rem', padding: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Avatar src={user.avatar_url} name={user.name} size={72} />
          <div>
            <h1 style={{
              fontSize: '1.7rem', fontWeight: 800,
              fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.1,
            }}>
              Olá, {user.name.split(' ')[0]}! 👋
            </h1>
            {campaign && (
              <p style={{ fontSize: '0.8rem', color: muted, marginTop: '0.25rem' }}>
                {campaign.name}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {currentLevel && (
            <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />
          )}
          <StreakBadge streak={myStreak} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
        <div style={{
          background: 'rgba(255,223,0,0.06)', border: '1px solid rgba(255,223,0,0.2)',
          borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center',
        }}>
          <AnimatedCounter
            value={totalPoints}
            style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFDF00', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}
          />
          <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>pontos totais ⚽</p>
        </div>
        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
            {myPosition ? `#${myPosition}` : '—'}
          </div>
          <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>posição no ranking 🏆</p>
        </div>
        <div style={{
          background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
          borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f97316', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
            {myStreak}
          </div>
          <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>dias seguidos 🔥</p>
        </div>
      </div>

      {/* Goals */}
      {todayGoals.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Minhas metas</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Últimos pontos</p>
          </div>
          <div>
            {myPoints.length === 0
              ? <p style={{ padding: '1.5rem', textAlign: 'center', color: muted, fontSize: '0.82rem' }}>Nenhum ponto ainda.</p>
              : myPoints.slice(0, 8).map(pt => (
                  <div key={pt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', flex: 1 }}>
                      {pt.scoring_rules?.name ?? 'Bônus'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: muted, marginRight: '0.75rem' }}>
                      {format(new Date(pt.event_date), 'dd/MM')}
                    </span>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                      borderRadius: '0 0.25rem 0.25rem 0.25rem',
                      background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)',
                      color: pt.points > 0 ? '#8DB23C' : '#f87171',
                    }}>
                      {pt.points > 0 ? '+' : ''}{pt.points}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {earnedBonuses.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Conquistas</p>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {earnedBonuses.map(ub => (
                <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${cardBorder}` }}>
                  <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                  <div style={{ fontSize: '0.65rem', color: muted, marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(participant)/participant/dashboard/page.tsx"
git commit -m "feat: redesign participant dashboard — hero, animated counter, goals section"
```

---

## Task 4: Participant Metas page + nav update

**Files:**
- Create: `app/(participant)/participant/metas/page.tsx`
- Modify: `components/shared/ParticipantNav.tsx`

**Interfaces:**
- Consumes: `GoalProgressBar` (Task 2), `getDaysInMonth` + `formatValueCompact` from `@/lib/goals/helpers`

- [ ] **Step 1: Add Metas to ParticipantNav**

Open `components/shared/ParticipantNav.tsx`. The current `items` array is:

```typescript
const items = [
  { href: '/participant/dashboard', label: 'Painel' },
  { href: '/participant/ranking', label: 'Ranking' },
  { href: '/participant/history', label: 'Histórico' },
  { href: '/participant/feed', label: 'Feed' },
]
```

Replace with:

```typescript
const items = [
  { href: '/participant/dashboard', label: 'Painel' },
  { href: '/participant/metas', label: 'Metas' },
  { href: '/participant/ranking', label: 'Ranking' },
  { href: '/participant/history', label: 'Histórico' },
  { href: '/participant/feed', label: 'Feed' },
]
```

- [ ] **Step 2: Create the Metas page**

Create `app/(participant)/participant/metas/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { getDaysInMonth, formatValueCompact } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type GoalWithRule = ParticipantGoalRow & {
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
                      const noTarget = g == null

                      let bg = 'rgba(255,255,255,0.06)'
                      let color = muted
                      let border = cardBorder
                      if (noTarget || isFuture) {
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(participant)/participant/metas/page.tsx" components/shared/ParticipantNav.tsx
git commit -m "feat: participant Metas page with progress bars and day calendar"
```

---

## Task 5: Sync manager preview with redesigned dashboard

**Files:**
- Modify: `app/(manager)/manager/preview/[userId]/page.tsx`

**Interfaces:**
- Consumes: `AnimatedCounter` (Task 1), `GoalProgressBar` (Task 2)
- Consumes: `getDaysInMonth`, `formatValueCompact` from `@/lib/goals/helpers`
- The file already imports and uses `createAdminClient`, `getRanking`, `Avatar`, `LevelBadge`, `StreakBadge`, `RankingTable`, `FeedItem`

- [ ] **Step 1: Add new imports at the top of the file**

After the existing imports, add:

```typescript
import { AnimatedCounter } from '@/components/participant/AnimatedCounter'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { getDaysInMonth, formatValueCompact } from '@/lib/goals/helpers'
```

- [ ] **Step 2: Add `GoalWithRule` type and goals fetch**

Add the type after existing type declarations at the top:

```typescript
type GoalWithRule = { id: string; scoring_rule_id: string; actual_value: number | null; target_value: number; period_date: string; scoring_rules: { name: string; value_type: string; decimal_places: number; target_period: string | null } | null }
```

Inside the `if (campaign)` block, after the existing fetches, add:

```typescript
const todayStr = new Date().toISOString().slice(0, 10)
const [gy, gm] = todayStr.slice(0, 7).split('-').map(Number)
const gMonthStart = `${gy}-${String(gm).padStart(2, '0')}-01`
const gLastDay = new Date(gy, gm, 0).getDate()
const gMonthEnd = `${gy}-${String(gm).padStart(2, '0')}-${String(gLastDay).padStart(2, '0')}`
const { data: goalsRaw } = await admin
  .from('participant_goals')
  .select('id, scoring_rule_id, actual_value, target_value, period_date, scoring_rules(name, value_type, decimal_places, target_period)')
  .eq('user_id', userId)
  .gte('period_date', gMonthStart)
  .lte('period_date', gMonthEnd)
const allPreviewGoals = (goalsRaw ?? []) as GoalWithRule[]
const todayPreviewGoals = allPreviewGoals.filter(g =>
  g.scoring_rules?.target_period === 'monthly'
    ? g.period_date === gMonthStart
    : g.period_date === todayStr
)
```

Also declare variables that are used in the metas tab but may not exist outside the `if (campaign)` block — add before the `if (campaign)` block:

```typescript
let todayPreviewGoals: GoalWithRule[] = []
let allPreviewGoals: GoalWithRule[] = []
let gMonthStart = ''
let gy = 0
let gm = 0
```

- [ ] **Step 3: Add "Metas" to preview NAV_TABS**

Find the `NAV_TABS` constant and add the Metas entry:

```typescript
const NAV_TABS = [
  { key: 'painel', label: 'Painel' },
  { key: 'metas', label: 'Metas' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'historico', label: 'Histórico' },
  { key: 'feed', label: 'Feed' },
]
```

- [ ] **Step 4: Replace the painel tab JSX**

Find the block `{tab === 'painel' && (` and replace its entire content with the redesigned dashboard from Task 3. Key substitutions from the real dashboard:
- `user.avatar_url`, `user.name` → same (already available in preview)
- `totalPoints` → same
- `myPosition`, `myStreak`, `currentLevel`, `earnedBonuses` → same
- `todayGoals` → `todayPreviewGoals`
- `myPoints` → same
- The "Ver tudo →" link: change `href="/participant/metas"` → `href={navHref('metas')}`

Full replacement for the painel tab:

```tsx
{tab === 'painel' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1.25rem 1.25rem 1.25rem', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Avatar src={user.avatar_url} name={user.name} size={72} />
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0, lineHeight: 1.1 }}>
            Olá, {user.name.split(' ')[0]}! 👋
          </h1>
          {campaign && <p style={{ fontSize: '0.8rem', color: muted, marginTop: '0.25rem' }}>{campaign.name}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
        {myStreak > 0 && <StreakBadge streak={myStreak} />}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
      <div style={{ background: 'rgba(255,223,0,0.06)', border: '1px solid rgba(255,223,0,0.2)', borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <AnimatedCounter value={totalPoints} style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFDF00', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }} />
        <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>pontos totais ⚽</p>
      </div>
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myPosition ? `#${myPosition}` : '—'}</div>
        <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>posição no ranking 🏆</p>
      </div>
      <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '0 1rem 1rem 1rem', padding: '1.25rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f97316', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>{myStreak}</div>
        <p style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>dias seguidos 🔥</p>
      </div>
    </div>

    {todayPreviewGoals.length > 0 && (
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Minhas metas</p>
          <a href={navHref('metas')} style={{ fontSize: '0.72rem', color: '#8DB23C', textDecoration: 'none' }}>Ver tudo →</a>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {todayPreviewGoals.map(g => (
            <GoalProgressBar key={g.id} label={g.scoring_rules?.name ?? 'Meta'} actual={g.actual_value} target={g.target_value} valueType={g.scoring_rules?.value_type ?? 'number'} decimalPlaces={g.scoring_rules?.decimal_places ?? 0} periodLabel={g.scoring_rules?.target_period === 'monthly' ? 'Mensal' : 'Hoje'} />
          ))}
        </div>
      </div>
    )}

    <div style={{ display: 'grid', gridTemplateColumns: earnedBonuses.length > 0 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Últimos pontos</p>
        </div>
        <div>
          {myPoints.length === 0
            ? <p style={{ padding: '1.5rem', textAlign: 'center', color: muted, fontSize: '0.82rem' }}>Nenhum ponto ainda.</p>
            : myPoints.slice(0, 8).map(pt => (
                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', flex: 1 }}>{pt.scoring_rules?.name ?? 'Bônus'}</span>
                  <span style={{ fontSize: '0.7rem', color: muted, marginRight: '0.75rem' }}>{format(new Date(pt.event_date), 'dd/MM', { locale: ptBR })}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '0 0.25rem 0.25rem 0.25rem', background: pt.points > 0 ? 'rgba(141,178,60,0.18)' : 'rgba(220,53,69,0.15)', color: pt.points > 0 ? '#8DB23C' : '#f87171' }}>
                    {pt.points > 0 ? '+' : ''}{pt.points}
                  </span>
                </div>
              ))}
        </div>
      </div>
      {earnedBonuses.length > 0 && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>Conquistas</p>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {earnedBonuses.map(ub => (
              <div key={ub.id} style={{ textAlign: 'center', padding: '0.6rem 0.75rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${cardBorder}` }}>
                <div style={{ fontSize: '1.5rem' }}>{ub.bonuses?.badge_icon}</div>
                <div style={{ fontSize: '0.65rem', color: muted, marginTop: '0.2rem' }}>{ub.bonuses?.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Add Metas tab content to preview**

Add this block after the `{tab === 'painel' && ...}` block and before `{tab === 'ranking' && ...}`:

```tsx
{tab === 'metas' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', margin: 0 }}>🎯 Minhas Metas</h1>
      <span style={{ fontSize: '0.82rem', color: muted, textTransform: 'capitalize' }}>
        {new Date(gy, gm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </span>
    </div>
    {allPreviewGoals.length === 0 && (
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: muted, fontSize: '0.85rem' }}>Nenhuma meta definida para este mês.</p>
      </div>
    )}
    {(() => {
      const byRule = new Map<string, typeof allPreviewGoals>()
      for (const g of allPreviewGoals) {
        const arr = byRule.get(g.scoring_rule_id) ?? []
        arr.push(g)
        byRule.set(g.scoring_rule_id, arr)
      }
      const todayStr2 = new Date().toISOString().slice(0, 10)
      const days2 = getDaysInMonth(gy, gm)
      return [...byRule.entries()].map(([ruleId, ruleGoals]) => {
        const rule = ruleGoals[0].scoring_rules
        const isMonthly = rule?.target_period === 'monthly'
        const monthlyGoal = isMonthly ? ruleGoals[0] : null
        const totalActual = ruleGoals.reduce((s, g) => s + (g.actual_value ?? 0), 0)
        const totalTarget = ruleGoals.reduce((s, g) => s + g.target_value, 0)
        return (
          <div key={ruleId} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '0 1rem 1rem 1rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>{rule?.name ?? 'Meta'}</p>
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
                  <p style={{ fontSize: '0.7rem', color: muted, marginBottom: '0.5rem', fontWeight: 500 }}>Dias do mês</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {days2.map(d => {
                      const dateStr = `${gy}-${String(gm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const g = ruleGoals.find(r => r.period_date === dateStr)
                      const isFuture = dateStr > todayStr2
                      const isToday = dateStr === todayStr2
                      const achieved = g != null && g.actual_value != null && g.actual_value >= g.target_value
                      const hasData = g != null && g.actual_value != null
                      let bg2 = 'rgba(255,255,255,0.06)', color2 = muted, border2 = cardBorder
                      if (!g || isFuture) { bg2 = 'rgba(255,255,255,0.03)'; color2 = 'rgba(255,255,255,0.2)' }
                      else if (achieved) { bg2 = 'rgba(141,178,60,0.2)'; color2 = '#8DB23C'; border2 = 'rgba(141,178,60,0.3)' }
                      else if (hasData) { bg2 = 'rgba(249,115,22,0.15)'; color2 = '#f97316'; border2 = 'rgba(249,115,22,0.25)' }
                      const vt = rule?.value_type ?? 'number'; const dp = rule?.decimal_places ?? 0
                      return (
                        <div key={d} title={g ? `${formatValueCompact(g.actual_value ?? 0, vt, dp)} / ${formatValueCompact(g.target_value, vt, dp)}` : undefined}
                          style={{ width: 32, height: 32, borderRadius: isToday ? '50%' : '0 0.35rem 0.35rem 0.35rem', background: bg2, border: `1px solid ${isToday ? '#FFDF00' : border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#FFDF00' : color2 }}>
                          {d}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[{ color: '#8DB23C', label: 'Bateu a meta' }, { color: '#f97316', label: 'Abaixo da meta' }, { color: 'rgba(255,255,255,0.2)', label: 'Sem meta / futuro' }].map(l => (
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
      })
    })()}
  </div>
)}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(manager)/manager/preview/[userId]/page.tsx"
git commit -m "feat: sync preview with redesigned dashboard and Metas tab"
```

---

## Self-Review

1. **Spec coverage:** ✅ AnimatedCounter (Task 1), GoalProgressBar (Task 2), Dashboard redesign with hero + goals (Task 3), Metas page + nav (Task 4), Preview sync (Task 5). All 6 spec tasks covered (spec Task 1 for API route was folded into Task 3's server-side fetch — the participant API is not needed since pages fetch server-side directly).
2. **Placeholder scan:** Clean — all steps have complete code blocks.
3. **Type consistency:** `GoalWithRule` used in Tasks 3, 4, and 5 with identical shape. `AnimatedCounter` and `GoalProgressBar` props identical across all usages.
4. **Scope:** Focused on dashboard + metas. No unrelated changes.
