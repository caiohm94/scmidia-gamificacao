# Metas vs Realizado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a goals management page where managers set per-participant daily/weekly/monthly targets, record actuals, and points are auto-generated when actuals meet targets.

**Architecture:** New `participant_goals` table stores one row per (rule, participant, period_date). A server page at `/manager/metas` renders two tabs: a matrix view for setting targets and a daily list view for recording actuals. API routes handle upserts and trigger point generation when actual ≥ target.

**Tech Stack:** Next.js 16 App Router, Supabase (postgres + admin client), TypeScript, Vitest, Lucide React, Sonner (toasts)

## Global Constraints

- Next.js 16: `params` and `searchParams` are Promises — always `await` them
- Supabase writes use `createAdminClient()` from `@/lib/supabase/admin`; reads use `createClient()` from `@/lib/supabase/server`
- Auth: all API routes check `role = 'manager'` before proceeding
- Visual style: `borderRadius: '0 <r> <r> <r>'`, primary color `#8DB23C`, text `#3F3E3E`
- No inline comments explaining what code does — only use comments for non-obvious WHY
- Values are `numeric` in DB; formatting (R$, k) only in UI
- Category for "Meta" rules in DB: `category = 'goal'`
- `transaction_origin` enum will have 'meta' added by Task 1 migration

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/010_participant_goals.sql` | Create | DB table + enum change |
| `types/database.ts` | Modify | Add ParticipantGoalRow + update enum |
| `lib/goals/helpers.ts` | Create | Pure logic: getDaysInMonth, periodDate, shouldAward |
| `__tests__/goals/helpers.test.ts` | Create | Unit tests for helpers |
| `app/api/goals/route.ts` | Create | GET (list) + PUT (upsert + award points) |
| `app/api/goals/replicate/route.ts` | Create | POST: copy day-1 meta to rest of month |
| `app/api/goals/copy-to-all/route.ts` | Create | POST: copy one participant's metas to all |
| `app/(manager)/manager/metas/page.tsx` | Create | Server page: fetch data, render shell |
| `components/metas/MetasPage.tsx` | Create | Client: tabs, selectors, month navigation |
| `components/metas/MetasMatrixTab.tsx` | Create | Client: participant × days matrix |
| `components/metas/RealizadoTab.tsx` | Create | Client: daily actual entry list |
| `components/shared/ManagerNav.tsx` | Modify | Add Metas menu item |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/010_participant_goals.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Produces: `ParticipantGoalRow` type, `participant_goals` table, `'meta'` in transaction_origin enum

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/010_participant_goals.sql
alter type transaction_origin add value if not exists 'meta';

create table if not exists participant_goals (
  id               uuid        primary key default gen_random_uuid(),
  scoring_rule_id  uuid        not null references scoring_rules(id) on delete cascade,
  campaign_id      uuid        not null references campaigns(id) on delete cascade,
  user_id          uuid        not null references users(id) on delete cascade,
  period_date      date        not null,
  target_value     numeric     not null,
  actual_value     numeric,
  points_awarded   boolean     not null default false,
  awarded_tx_id    uuid        references point_transactions(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(scoring_rule_id, user_id, period_date)
);

create index if not exists idx_goals_rule_period
  on participant_goals(scoring_rule_id, period_date);

create index if not exists idx_goals_user
  on participant_goals(user_id, period_date);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy the SQL above and run it in the Supabase dashboard → SQL Editor.
Expected: "Success. No rows returned."

- [ ] **Step 3: Add ParticipantGoalRow type to `types/database.ts`**

Add after the `SalesforceRecordRow` export (around line 129):

```typescript
export type ParticipantGoalRow = {
  id: string
  scoring_rule_id: string
  campaign_id: string
  user_id: string
  period_date: string
  target_value: number
  actual_value: number | null
  points_awarded: boolean
  awarded_tx_id: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: Add `participant_goals` to the Database interface**

In the `Tables` block (around line 9), add after `salesforce_records`:

```typescript
participant_goals: { Row: ParticipantGoalRow; Insert: Partial<ParticipantGoalRow>; Update: Partial<ParticipantGoalRow>; Relationships: [] }
```

- [ ] **Step 5: Update `transaction_origin` enum in `types/database.ts`**

Find line ~39:
```typescript
transaction_origin: 'manual' | 'salesforce' | 'sap'
```
Replace with:
```typescript
transaction_origin: 'manual' | 'salesforce' | 'sap' | 'meta'
```

And in `PointTransactionRow` (around line 88):
```typescript
origin: 'manual' | 'salesforce' | 'sap'
```
Replace with:
```typescript
origin: 'manual' | 'salesforce' | 'sap' | 'meta'
```

- [ ] **Step 6: Commit**

```bash
git add "supabase/migrations/010_participant_goals.sql" types/database.ts
git commit -m "feat: add participant_goals table and meta transaction origin"
```

---

### Task 2: Goals Helpers (Pure Logic)

**Files:**
- Create: `lib/goals/helpers.ts`
- Create: `__tests__/goals/helpers.test.ts`

**Interfaces:**
- Produces:
  - `getDaysInMonth(year: number, month: number): number[]` — returns array of day numbers [1..N]
  - `periodDateForDay(year: number, month: number, day: number): string` — returns 'YYYY-MM-DD'
  - `parseMonthParam(month: string): { year: number; month: number }` — parses '2026-06'
  - `formatGoalValue(value: number): string` — formats 100000 → '100k', 1500000 → '1,5M'

- [ ] **Step 1: Write failing tests**

Create `__tests__/goals/helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  periodDateForDay,
  parseMonthParam,
  formatGoalValue,
} from '@/lib/goals/helpers'

describe('getDaysInMonth', () => {
  it('returns 30 days for June', () => {
    expect(getDaysInMonth(2026, 6)).toHaveLength(30)
    expect(getDaysInMonth(2026, 6)[0]).toBe(1)
    expect(getDaysInMonth(2026, 6)[29]).toBe(30)
  })

  it('returns 28 days for Feb non-leap', () => {
    expect(getDaysInMonth(2025, 2)).toHaveLength(28)
  })

  it('returns 29 days for Feb leap', () => {
    expect(getDaysInMonth(2024, 2)).toHaveLength(29)
  })

  it('returns 31 days for January', () => {
    expect(getDaysInMonth(2026, 1)).toHaveLength(31)
  })
})

describe('periodDateForDay', () => {
  it('pads single-digit day and month', () => {
    expect(periodDateForDay(2026, 6, 5)).toBe('2026-06-05')
  })

  it('formats last day of month', () => {
    expect(periodDateForDay(2026, 6, 30)).toBe('2026-06-30')
  })
})

describe('parseMonthParam', () => {
  it('parses YYYY-MM string', () => {
    expect(parseMonthParam('2026-06')).toEqual({ year: 2026, month: 6 })
  })

  it('returns current month for invalid input', () => {
    const now = new Date()
    const result = parseMonthParam('invalid')
    expect(result.year).toBe(now.getFullYear())
    expect(result.month).toBe(now.getMonth() + 1)
  })
})

describe('formatGoalValue', () => {
  it('formats thousands as k', () => {
    expect(formatGoalValue(100000)).toBe('100k')
    expect(formatGoalValue(80000)).toBe('80k')
  })

  it('formats millions as M', () => {
    expect(formatGoalValue(1500000)).toBe('1,5M')
    expect(formatGoalValue(2000000)).toBe('2M')
  })

  it('formats values under 1000 as-is', () => {
    expect(formatGoalValue(500)).toBe('500')
  })

  it('formats decimal thousands', () => {
    expect(formatGoalValue(1500)).toBe('1,5k')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial"
npx vitest run __tests__/goals/helpers.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/goals/helpers'"

- [ ] **Step 3: Implement helpers**

Create `lib/goals/helpers.ts`:

```typescript
export function getDaysInMonth(year: number, month: number): number[] {
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, i) => i + 1)
}

export function periodDateForDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseMonthParam(month: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) }
}

export function formatGoalValue(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return (m % 1 === 0 ? String(m) : m.toFixed(1).replace('.', ',')) + 'M'
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return (k % 1 === 0 ? String(k) : k.toFixed(1).replace('.', ',')) + 'k'
  }
  return String(value)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/goals/helpers.test.ts
```

Expected: PASS — all 11 tests green

- [ ] **Step 5: Commit**

```bash
git add lib/goals/helpers.ts __tests__/goals/helpers.test.ts
git commit -m "feat: add goals helper functions with tests"
```

---

### Task 3: Goals API — GET + PUT

**Files:**
- Create: `app/api/goals/route.ts`

**Interfaces:**
- Consumes: `ParticipantGoalRow` (Task 1), `createAdminClient`, `createClient`
- Produces:
  - `GET /api/goals?rule_id=<uuid>&month=2026-06` → `ParticipantGoalRow[]`
  - `PUT /api/goals` body: `{ goals: Array<{ scoring_rule_id, campaign_id, user_id, period_date, target_value?, actual_value? }> }` → `{ awarded: number }`

- [ ] **Step 1: Create the route file**

Create `app/api/goals/route.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Step 3: Commit**

```bash
git add "app/api/goals/route.ts"
git commit -m "feat: goals API GET and PUT with auto point award"
```

---

### Task 4: Goals API — Replicate + Copy-to-All

**Files:**
- Create: `app/api/goals/replicate/route.ts`
- Create: `app/api/goals/copy-to-all/route.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `createClient`, `getDaysInMonth`, `periodDateForDay` (Task 2)
- Produces:
  - `POST /api/goals/replicate` body: `{ scoring_rule_id, campaign_id, user_id, month }` → `{ created: number }`
  - `POST /api/goals/copy-to-all` body: `{ scoring_rule_id, campaign_id, from_user_id, month }` → `{ created: number }`

- [ ] **Step 1: Create replicate route**

Create `app/api/goals/replicate/route.ts`:

```typescript
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
```

- [ ] **Step 2: Create copy-to-all route**

Create `app/api/goals/copy-to-all/route.ts`:

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add "app/api/goals/replicate/route.ts" "app/api/goals/copy-to-all/route.ts"
git commit -m "feat: goals replicate and copy-to-all API routes"
```

---

### Task 5: Metas Server Page + Menu

**Files:**
- Create: `app/(manager)/manager/metas/page.tsx`
- Modify: `components/shared/ManagerNav.tsx`

**Interfaces:**
- Consumes: `createClient`, `requireRole` from `@/lib/auth/helpers`
- Produces: server page that fetches campaigns + rules(category=goal), renders `<MetasPage />`

- [ ] **Step 1: Create server page**

Create `app/(manager)/manager/metas/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { TrendingUp } from 'lucide-react'
import { MetasPage } from '@/components/metas/MetasPage'

export default async function MetasServerPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string; rule_id?: string; month?: string; tab?: string }>
}) {
  await requireRole('manager')
  const params = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .order('name')

  const { data: rules } = params.campaign_id
    ? await supabase
        .from('scoring_rules')
        .select('id, name, points, target_period, campaign_id')
        .eq('campaign_id', params.campaign_id)
        .eq('category', 'goal')
        .eq('is_active', true)
        .order('name')
    : { data: [] }

  const { data: participants } = params.campaign_id
    ? await supabase
        .from('campaign_participants')
        .select('user_id, users!user_id(id, name)')
        .eq('campaign_id', params.campaign_id)
    : { data: [] }

  const participantUsers = (participants ?? []).flatMap(p =>
    p.users ? [p.users as { id: string; name: string }] : []
  )

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Metas</h1>
        </div>
      </div>

      <div className="p-6">
        <MetasPage
          campaigns={campaigns ?? []}
          rules={rules ?? []}
          participants={participantUsers}
          initialCampaignId={params.campaign_id ?? ''}
          initialRuleId={params.rule_id ?? ''}
          initialMonth={params.month ?? ''}
          initialTab={params.tab ?? 'metas'}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Metas to ManagerNav**

In `components/shared/ManagerNav.tsx`, add `TrendingUp` to the import and insert the Metas item:

```typescript
import { LayoutDashboard, Trophy, Users, Target, History, Upload, BarChart3, Palette, CloudDownload, TrendingUp } from 'lucide-react'

const navItems = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/campaigns', label: 'Campanhas', icon: Trophy },
  { href: '/manager/points', label: 'Lançar Pontos', icon: Target },
  { href: '/manager/metas', label: 'Metas', icon: TrendingUp },
  { href: '/manager/salesforce', label: 'Salesforce', icon: CloudDownload },
  { href: '/manager/points/import', label: 'Importar CSV', icon: Upload },
  { href: '/manager/rankings', label: 'Rankings', icon: BarChart3 },
  { href: '/manager/points/history', label: 'Auditoria', icon: History },
  { href: '/manager/users', label: 'Usuários', icon: Users },
  { href: '/manager/themes', label: 'Temas', icon: Palette },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add "app/(manager)/manager/metas/page.tsx" components/shared/ManagerNav.tsx
git commit -m "feat: metas server page and nav menu item"
```

---

### Task 6: MetasPage Shell + MetasMatrixTab

**Files:**
- Create: `components/metas/MetasPage.tsx`
- Create: `components/metas/MetasMatrixTab.tsx`

**Interfaces:**
- Consumes: `formatGoalValue` from `@/lib/goals/helpers`, API routes from Tasks 3+4
- Produces: `<MetasPage>` client component with tabs and filters, `<MetasMatrixTab>` with inline-editable matrix

- [ ] **Step 1: Create MetasPage shell**

Create `components/metas/MetasPage.tsx`:

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MetasMatrixTab } from './MetasMatrixTab'
import { RealizadoTab } from './RealizadoTab'

type Campaign = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null; campaign_id: string }
type Participant = { id: string; name: string }

interface Props {
  campaigns: Campaign[]
  rules: Rule[]
  participants: Participant[]
  initialCampaignId: string
  initialRuleId: string
  initialMonth: string
  initialTab: string
}

const selectStyle = {
  border: '1px solid rgba(63,62,62,0.2)',
  borderRadius: '0 0.4rem 0.4rem 0.4rem',
  padding: '0.35rem 0.75rem',
  fontSize: '0.82rem',
  color: '#3F3E3E',
  background: '#fff',
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function MetasPage({ campaigns, rules, participants, initialCampaignId, initialRuleId, initialMonth, initialTab }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [ruleId, setRuleId] = useState(initialRuleId)
  const [month, setMonth] = useState(initialMonth || currentMonth())
  const [tab, setTab] = useState(initialTab || 'metas')

  const selectedRule = rules.find(r => r.id === ruleId)

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams({ campaign_id: campaignId, rule_id: ruleId, month, tab, ...params })
    startTransition(() => router.replace(`/manager/metas?${sp.toString()}`))
  }

  function handleCampaignChange(id: string) {
    setCampaignId(id)
    setRuleId('')
    navigate({ campaign_id: id, rule_id: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Selectors + Month nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <select value={campaignId} onChange={e => handleCampaignChange(e.target.value)} style={selectStyle}>
          <option value="">Selecione a campanha</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={ruleId} onChange={e => { setRuleId(e.target.value); navigate({ rule_id: e.target.value }) }} style={selectStyle} disabled={!campaignId}>
          <option value="">Selecione o indicador</option>
          {rules.filter(r => r.campaign_id === campaignId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {ruleId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button onClick={() => { const m = prevMonth(month); setMonth(m); navigate({ month: m }) }}
              style={{ background: 'none', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#3F3E3E' }}>
              ←
            </button>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-outfit, sans-serif)', color: '#3F3E3E', minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
              {monthLabel(month)}
            </span>
            <button onClick={() => { const m = nextMonth(month); setMonth(m); navigate({ month: m }) }}
              style={{ background: 'none', border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#3F3E3E' }}>
              →
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {ruleId && (
        <>
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid rgba(63,62,62,0.08)' }}>
            {(['metas', 'realizado'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); navigate({ tab: t }) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.5rem 1rem', fontSize: '0.82rem',
                  fontFamily: 'var(--font-outfit, sans-serif)',
                  color: tab === t ? '#8DB23C' : 'rgba(63,62,62,0.5)',
                  borderBottom: tab === t ? '2px solid #8DB23C' : '2px solid transparent',
                  marginBottom: -2,
                  fontWeight: tab === t ? 600 : 400,
                  textTransform: 'capitalize',
                }}>
                {t === 'metas' ? 'Metas' : 'Realizado'}
              </button>
            ))}
          </div>

          {tab === 'metas' && (
            <MetasMatrixTab
              ruleId={ruleId}
              campaignId={campaignId}
              month={month}
              participants={participants}
              rule={selectedRule!}
            />
          )}
          {tab === 'realizado' && (
            <RealizadoTab
              ruleId={ruleId}
              campaignId={campaignId}
              month={month}
              participants={participants}
              rule={selectedRule!}
            />
          )}
        </>
      )}

      {!ruleId && campaignId && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione um indicador para ver as metas.</p>
      )}
      {!campaignId && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Selecione uma campanha para começar.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create MetasMatrixTab**

Create `components/metas/MetasMatrixTab.tsx`:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getDaysInMonth, periodDateForDay, parseMonthParam, formatGoalValue } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type Participant = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null }

interface Props {
  ruleId: string
  campaignId: string
  month: string
  participants: Participant[]
  rule: Rule
}

interface CellEditState {
  userId: string
  day: number
  value: string
}

export function MetasMatrixTab({ ruleId, campaignId, month, participants, rule }: Props) {
  const { year, month: m } = parseMonthParam(month)
  const days = getDaysInMonth(year, m)
  const [goals, setGoals] = useState<ParticipantGoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CellEditState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${month}`)
    if (res.ok) setGoals(await res.json())
    setLoading(false)
  }, [ruleId, month])

  useEffect(() => { load() }, [load])

  function getGoal(userId: string, day: number): ParticipantGoalRow | undefined {
    const date = periodDateForDay(year, m, day)
    return goals.find(g => g.user_id === userId && g.period_date === date)
  }

  async function saveCell(userId: string, day: number, value: string) {
    const numVal = parseFloat(value.replace(',', '.'))
    if (isNaN(numVal) || numVal < 0) { setEditing(null); return }
    const date = periodDateForDay(year, m, day)
    setSaving(true)
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: [{ scoring_rule_id: ruleId, campaign_id: campaignId, user_id: userId, period_date: date, target_value: numVal }],
      }),
    })
    setSaving(false)
    setEditing(null)
    if (res.ok) { await load() } else { toast.error('Erro ao salvar meta') }
  }

  async function handleReplicate(userId: string) {
    const res = await fetch('/api/goals/replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, user_id: userId, month }),
    })
    if (res.ok) {
      const { created } = await res.json()
      toast.success(`Meta replicada para ${created} dias`)
      await load()
    } else {
      const { error } = await res.json()
      toast.error(error ?? 'Erro ao replicar')
    }
  }

  async function handleCopyToAll(userId: string, userName: string) {
    if (!confirm(`Copiar todas as metas de ${userName} para os outros participantes?`)) return
    const res = await fetch('/api/goals/copy-to-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoring_rule_id: ruleId, campaign_id: campaignId, from_user_id: userId, month }),
    })
    if (res.ok) {
      toast.success('Metas copiadas para todos')
      await load()
    } else {
      toast.error('Erro ao copiar metas')
    }
  }

  function countDaysWithMeta(userId: string) {
    return days.filter(d => {
      const g = getGoal(userId, d)
      return g && g.target_value != null
    }).length
  }

  const cellStyle = {
    padding: '0.3rem 0.4rem',
    fontSize: '0.72rem',
    textAlign: 'center' as const,
    borderRight: '1px solid rgba(63,62,62,0.06)',
    minWidth: 46,
    cursor: 'pointer',
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.1)' }}>
            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', whiteSpace: 'nowrap', minWidth: 160 }}>
              Participante
            </th>
            {days.map(d => (
              <th key={d} style={{ ...cellStyle, color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit)', fontWeight: 500 }}>
                {String(d).padStart(2, '0')}
              </th>
            ))}
            <th style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Resumo
            </th>
            <th style={{ padding: '0.3rem 0.4rem', minWidth: 120 }} />
          </tr>
        </thead>
        <tbody>
          {participants.map((p, pi) => (
            <tr key={p.id} style={{ borderTop: pi === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: '#3F3E3E', whiteSpace: 'nowrap' }}>
                {p.name}
              </td>
              {days.map(d => {
                const goal = getGoal(p.id, d)
                const isEditing = editing?.userId === p.id && editing.day === d
                return (
                  <td key={d} style={{ ...cellStyle, background: goal?.target_value ? 'rgba(141,178,60,0.04)' : 'transparent' }}
                    onClick={() => !isEditing && setEditing({ userId: p.id, day: d, value: goal?.target_value != null ? String(goal.target_value) : '' })}>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        value={editing.value}
                        onChange={e => setEditing({ ...editing, value: e.target.value })}
                        onBlur={() => saveCell(p.id, d, editing.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCell(p.id, d, editing.value); if (e.key === 'Escape') setEditing(null) }}
                        style={{ width: 52, border: '1px solid #8DB23C', borderRadius: '0 0.25rem 0.25rem 0.25rem', padding: '0.1rem 0.25rem', fontSize: '0.7rem', textAlign: 'center' }}
                        disabled={saving}
                      />
                    ) : (
                      <span style={{ color: goal?.target_value ? '#3F3E3E' : 'rgba(63,62,62,0.2)' }}>
                        {goal?.target_value != null ? formatGoalValue(goal.target_value) : '—'}
                      </span>
                    )}
                  </td>
                )
              })}
              <td style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', whiteSpace: 'nowrap' }}>
                {countDaysWithMeta(p.id)}/{days.length} dias
              </td>
              <td style={{ padding: '0.3rem 0.5rem', whiteSpace: 'nowrap' }}>
                <button onClick={() => handleReplicate(p.id)}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'rgba(141,178,60,0.1)', color: '#5C7435', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer', marginRight: '0.25rem' }}>
                  Replicar
                </button>
                <button onClick={() => handleCopyToAll(p.id, p.name)}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'rgba(63,62,62,0.06)', color: 'rgba(63,62,62,0.6)', border: 'none', borderRadius: '0 0.25rem 0.25rem 0.25rem', cursor: 'pointer' }}>
                  ↕ Todos
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {participants.length === 0 && (
        <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem', padding: '2rem', textAlign: 'center' }}>
          Nenhum participante nesta campanha.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add components/metas/MetasPage.tsx components/metas/MetasMatrixTab.tsx
git commit -m "feat: metas page shell and matrix tab component"
```

---

### Task 7: RealizadoTab Component

**Files:**
- Create: `components/metas/RealizadoTab.tsx`

**Interfaces:**
- Consumes: `formatGoalValue` (Task 2), PUT `/api/goals` (Task 3), GET `/api/goals` (Task 3)
- Produces: `<RealizadoTab>` client component for daily actual entry

- [ ] **Step 1: Create RealizadoTab**

Create `components/metas/RealizadoTab.tsx`:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatGoalValue, periodDateForDay } from '@/lib/goals/helpers'
import type { ParticipantGoalRow } from '@/types/database'

type Participant = { id: string; name: string }
type Rule = { id: string; name: string; points: number; target_period: string | null }

interface Props {
  ruleId: string
  campaignId: string
  month: string
  participants: Participant[]
  rule: Rule
}

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function RealizadoTab({ ruleId, campaignId, participants, rule }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [goals, setGoals] = useState<ParticipantGoalRow[]>([])
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [year, m] = selectedDate.split('-').map(Number)

  const load = useCallback(async () => {
    setLoading(true)
    const monthStr = `${year}-${String(m).padStart(2, '0')}`
    const res = await fetch(`/api/goals?rule_id=${ruleId}&month=${monthStr}`)
    if (res.ok) {
      const data: ParticipantGoalRow[] = await res.json()
      setGoals(data)
      const inputs: Record<string, string> = {}
      for (const g of data) {
        if (g.period_date === selectedDate && g.actual_value != null) {
          inputs[g.user_id] = String(g.actual_value)
        }
      }
      setActualInputs(inputs)
    }
    setLoading(false)
  }, [ruleId, year, m, selectedDate])

  useEffect(() => { load() }, [load])

  function getGoalForDate(userId: string) {
    return goals.find(g => g.user_id === userId && g.period_date === selectedDate)
  }

  function getStatus(goal: ParticipantGoalRow | undefined, inputValue: string) {
    if (!goal?.target_value) return null
    const actual = parseFloat(inputValue)
    if (isNaN(actual)) return null
    const pct = Math.round((actual / goal.target_value) * 100)
    if (actual >= goal.target_value) return { label: '✅ Bateu', color: '#5C7435', bg: 'rgba(92,116,53,0.1)' }
    return { label: `${pct}%`, color: '#8B6914', bg: 'rgba(255,193,7,0.15)' }
  }

  async function handleSaveAll() {
    const goalsToSave = participants
      .map(p => {
        const val = actualInputs[p.id]
        const goal = getGoalForDate(p.id)
        if (!goal?.target_value || val === undefined || val === '') return null
        const num = parseFloat(val.replace(',', '.'))
        if (isNaN(num)) return null
        return {
          scoring_rule_id: ruleId,
          campaign_id: campaignId,
          user_id: p.id,
          period_date: selectedDate,
          target_value: goal.target_value,
          actual_value: num,
        }
      })
      .filter(Boolean)

    if (goalsToSave.length === 0) { toast.error('Nenhum realizado para salvar'); return }

    setSaving(true)
    const res = await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals: goalsToSave }),
    })
    setSaving(false)

    if (res.ok) {
      const { awarded } = await res.json()
      if (awarded > 0) toast.success(`${awarded} participante(s) atingiram a meta — pontos gerados!`)
      else toast.success('Realizado salvo')
      await load()
    } else {
      toast.error('Erro ao salvar')
    }
  }

  const inputStyle = {
    border: '1px solid rgba(63,62,62,0.2)',
    borderRadius: '0 0.35rem 0.35rem 0.35rem',
    padding: '0.3rem 0.5rem',
    fontSize: '0.82rem',
    color: '#3F3E3E',
    width: 120,
  }

  if (loading) return <p style={{ color: 'rgba(63,62,62,0.4)', fontSize: '0.85rem' }}>Carregando...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'rgba(63,62,62,0.6)', fontFamily: 'var(--font-outfit)' }}>Data:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'rgba(63,62,62,0.04)', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
              {['Participante', 'Meta', 'Realizado', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-outfit)', fontWeight: 500, fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const goal = getGoalForDate(p.id)
              const inputVal = actualInputs[p.id] ?? (goal?.actual_value != null ? String(goal.actual_value) : '')
              const status = getStatus(goal, inputVal)
              return (
                <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(63,62,62,0.06)' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500, color: '#3F3E3E' }}>{p.name}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'rgba(63,62,62,0.6)', fontSize: '0.82rem' }}>
                    {goal?.target_value != null ? `R$${goal.target_value.toLocaleString('pt-BR')}` : <span style={{ color: 'rgba(63,62,62,0.3)' }}>Sem meta</span>}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <input
                      type="number"
                      value={inputVal}
                      onChange={e => setActualInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      disabled={!goal?.target_value || goal.points_awarded}
                      placeholder={goal?.target_value ? '0' : '—'}
                      title={goal?.points_awarded ? 'Pontos já gerados' : (!goal?.target_value ? 'Defina a meta primeiro' : '')}
                      style={{ ...inputStyle, opacity: (!goal?.target_value || goal.points_awarded) ? 0.45 : 1 }}
                    />
                    {goal?.points_awarded && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#5C7435' }}>✓ pontuado</span>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    {status ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.3)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="sc-btn-primary"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Salvando...' : 'Salvar tudo'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (helpers tests + existing tests)

- [ ] **Step 4: Commit**

```bash
git add components/metas/RealizadoTab.tsx
git commit -m "feat: realizado tab with daily actual entry and auto point award"
```

---

### Task 8: Deploy + Smoke Test

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Vercel deploy**

Watch Vercel dashboard until deploy is complete (typically 1-2 min).

- [ ] **Step 3: Smoke test checklist**

1. Navigate to `/manager/metas` — page loads, shows "Selecione uma campanha"
2. Select a campaign with `category = 'goal'` rules — Indicador dropdown populates
3. Select an indicador — tabs appear, month navigation works
4. **Aba Metas**: cells show `—`, click a cell → input appears, type a value, press Enter → cell updates with formatted value
5. Click "Replicar" on a row that has day 1 filled → other empty days fill in
6. Click "↕ Todos" → confirm dialog → other participants get same metas
7. **Aba Realizado**: change date to today → participants listed with their meta
8. Enter a value ≥ meta for one participant → status shows ✅ Bateu
9. Click "Salvar tudo" → toast "X participante(s) atingiram a meta — pontos gerados!"
10. Check `/manager/points/history` → new transaction with origin `meta` appears
11. Go back to Realizado → field shows "✓ pontuado", input is disabled (no double-award)
12. "Metas" menu item in nav is highlighted when on `/manager/metas`
