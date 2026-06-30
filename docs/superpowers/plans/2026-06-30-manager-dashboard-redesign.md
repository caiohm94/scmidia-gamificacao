# Manager Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o dashboard do gestor com lista de participantes, KPIs de campanha e um drawer lateral de detalhes ao clicar em cada participante.

**Architecture:** O server component do dashboard busca dados em paralelo (ranking, KPIs, mini-goals, fotos) e passa tudo pré-computado para um client component de lista. Ao clicar em um participante, o drawer faz uma chamada à API route `/api/manager/participant-details/[userId]` e exibe detalhes completos com os mesmos componentes do dashboard do participante (`GoalProgressBar`, `PointsHistory`, `LevelBadge`, `StreakBadge`).

**Tech Stack:** Next.js App Router (server + client components), Supabase (server client para auth, admin client para dados), React hooks (useState, useEffect, useCallback), Lucide React icons, componentes existentes em `components/participant/` e `components/game/`.

## Global Constraints

- Next.js App Router — server components não podem usar hooks ou event handlers; client components marcados com `'use client'`
- Supabase: usar `createClient()` (de `@/lib/supabase/server`) para auth; `createAdminClient()` (de `@/lib/supabase/admin`) para queries de dados em server components e API routes
- Reutilizar sem modificar: `GoalProgressBar`, `PointsHistory`, `LevelBadge`, `StreakBadge`, `AnimatedCounter` de `components/participant/` e `components/game/`
- Visual SC Mídia: border-radius sempre `0 X X X` (top-left reto), cor primária Apple Green `#8DB23C`, Onyx `#3F3E3E`
- `CampaignRanking` type (de `@/types/database`): `{ campaign_id, user_id, name, avatar_url, function, team_name, team_color, team_id, total_points, current_streak, longest_streak, position }`
- Verificação: `npx tsc --noEmit` deve passar sem erros antes de cada commit
- Sem dependências novas

---

### Task 1: API Route — participant details

**Files:**
- Create: `app/api/manager/participant-details/[userId]/route.ts`

**Interfaces:**
- Consumes: `createClient` (auth), `createAdminClient` (queries), `todayBrazil` de `@/lib/goals/helpers`
- Produces: `GET /api/manager/participant-details/[userId]?campaign_id=xxx` → JSON:
  ```typescript
  {
    name: string
    avatar_url: string | null
    total_points: number
    position: number | null
    current_streak: number
    level: { name: string; badge_icon: string; color: string } | null
    goals: Array<{
      id: string; rule_name: string; actual_value: number; target_value: number
      value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean
    }>
    recentPoints: Array<{
      id: string; points: number; event_date: string; description: string | null; rule_name: string | null
    }>
  }
  ```

- [ ] **Step 1: Criar o arquivo da API route**

```typescript
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
  id: string; points: number; event_date: string; description: string | null; rule_name: string | null
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
      return [{ id: entries[0].id, rule_name: rule.name, actual_value: totalActual, target_value: totalTarget, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: rule.target_period, is_cumulative: true }]
    }
    if (rule.target_period === 'monthly') {
      const entry = entries.find(g => g.period_date === monthStart) ?? entries[0]
      return [{ id: entry.id, rule_name: rule.name, actual_value: entry.actual_value ?? 0, target_value: entry.target_value, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: 'monthly', is_cumulative: false }]
    }
    const entry = entries.find(g => g.period_date === today) ?? entries[0]
    return [{ id: entry.id, rule_name: rule.name, actual_value: entry.actual_value ?? 0, target_value: entry.target_value, value_type: rule.value_type, decimal_places: rule.decimal_places, target_period: rule.target_period, is_cumulative: false }]
  })

  type TxRow = { id: string; points: number; event_date: string; description: string | null; scoring_rules: { name: string } | null }
  const recentPoints: PointItem[] = ((txRow.data ?? []) as TxRow[]).map(tx => ({
    id: tx.id, points: tx.points, event_date: tx.event_date, description: tx.description, rule_name: tx.scoring_rules?.name ?? null,
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/manager/participant-details/
git commit -m "feat(manager): api route participant-details com goals e pontos"
```

---

### Task 2: ParticipantDrawer — componente de drawer lateral

**Files:**
- Create: `components/manager/ParticipantDrawer.tsx`

**Interfaces:**
- Consumes: `GoalProgressBar` de `@/components/participant/GoalProgressBar`; `PointsHistory` + `PointEntry` de `@/components/participant/PointsHistory`; `LevelBadge` de `@/components/game/LevelBadge`; `StreakBadge` de `@/components/game/StreakBadge`; `X` de `lucide-react`
- Produces: `export function ParticipantDrawer({ userId, campaignId, onClose }: { userId: string | null; campaignId: string; onClose: () => void }): JSX.Element`

- [ ] **Step 1: Criar o componente**

```typescript
// components/manager/ParticipantDrawer.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { GoalProgressBar } from '@/components/participant/GoalProgressBar'
import { PointsHistory, type PointEntry } from '@/components/participant/PointsHistory'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { X } from 'lucide-react'

type GoalItem = {
  id: string; rule_name: string; actual_value: number; target_value: number
  value_type: string; decimal_places: number; target_period: string | null; is_cumulative: boolean
}

type DrawerData = {
  name: string; avatar_url: string | null; total_points: number
  position: number | null; current_streak: number
  level: { name: string; badge_icon: string; color: string } | null
  goals: GoalItem[]
  recentPoints: PointEntry[]
}

interface Props {
  userId: string | null
  campaignId: string
  onClose: () => void
}

export function ParticipantDrawer({ userId, campaignId, onClose }: Props) {
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetails = useCallback(async (uid: string) => {
    setLoading(true)
    setData(null)
    try {
      const res = await fetch(`/api/manager/participant-details/${uid}?campaign_id=${campaignId}`)
      if (res.ok) setData(await res.json() as DrawerData)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (userId) fetchDetails(userId)
    else setData(null)
  }, [userId, fetchDetails])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const open = !!userId

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 250ms ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(420px, 100vw)',
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.14)',
        zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms ease', display: 'flex', flexDirection: 'column',
        borderRadius: '0.75rem 0 0 0.75rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(63,62,62,0.08)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(63,62,62,0.45)', padding: '0.25rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {loading && <DrawerSkeleton />}

          {!loading && data && (
            <>
              {/* Hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <DrawerAvatar src={data.avatar_url} name={data.name} size={80} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 800, fontSize: '1.15rem', color: '#3F3E3E', margin: 0, lineHeight: 1.2 }}>
                    {data.name}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {data.level && <LevelBadge name={data.level.name} icon={data.level.badge_icon} color={data.level.color} />}
                    <StreakBadge streak={data.current_streak} />
                  </div>
                </div>
              </div>

              {/* 3 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <DrawerStat label="pontos ⚽" value={data.total_points.toLocaleString('pt-BR')} highlight="#8DB23C" />
                <DrawerStat label="ranking 🏆" value={data.position != null ? `#${data.position}` : '—'} />
                <DrawerStat label="sequência 🔥" value={String(data.current_streak)} highlight={data.current_streak > 0 ? '#f97316' : undefined} />
              </div>

              {/* Goals */}
              {data.goals.length > 0 && (
                <section style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Metas</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.goals.map(g => (
                      <GoalProgressBar
                        key={g.id}
                        label={g.rule_name}
                        actual={g.actual_value}
                        target={g.target_value}
                        valueType={g.value_type}
                        decimalPlaces={g.decimal_places}
                        periodLabel={g.is_cumulative ? 'Acumulado' : g.target_period === 'monthly' ? 'Mensal' : 'Hoje'}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Recent points */}
              <section style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(63,62,62,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Últimos pontos</p>
                <div style={{ borderRadius: '0 0.5rem 0.5rem 0.5rem', border: '1px solid rgba(63,62,62,0.08)', overflow: 'hidden' }}>
                  <PointsHistory points={data.recentPoints} />
                </div>
              </section>

              {/* Link to full preview */}
              <a
                href={`/manager/preview/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', border: '1px solid rgba(141,178,60,0.4)', color: '#8DB23C', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}
              >
                Ver painel completo ↗
              </a>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function DrawerAvatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  const [err, setErr] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '0 0.75rem 0.75rem 0.75rem', flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(141,178,60,0.3)' }
  if (src && !err) return (
    <div style={base}>
      <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {initial}
    </div>
  )
}

function DrawerStat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.65rem 0.4rem', borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(63,62,62,0.04)', border: '1px solid rgba(63,62,62,0.08)' }}>
      <p style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-outfit, sans-serif)', color: highlight ?? '#3F3E3E', lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: '0.6rem', color: 'rgba(63,62,62,0.45)', marginTop: '0.2rem', margin: '0.2rem 0 0' }}>{label}</p>
    </div>
  )
}

function DrawerSkeleton() {
  const pulse: React.CSSProperties = { background: 'rgba(63,62,62,0.08)', borderRadius: 6, animation: 'skpulse 1.5s ease-in-out infinite' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`@keyframes skpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ ...pulse, width: 80, height: 80, borderRadius: '0 0.75rem 0.75rem 0.75rem' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...pulse, height: 20, width: '60%' }} />
          <div style={{ ...pulse, height: 14, width: '40%' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
        {[1, 2, 3].map(i => <div key={i} style={{ ...pulse, height: 60 }} />)}
      </div>
      {[80, 65, 75, 55].map((w, i) => <div key={i} style={{ ...pulse, height: 12, width: `${w}%` }} />)}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/manager/ParticipantDrawer.tsx
git commit -m "feat(manager): ParticipantDrawer com skeleton, metas e histórico de pontos"
```

---

### Task 3: DashboardParticipantList — lista de participantes com drawer

**Files:**
- Create: `components/manager/DashboardParticipantList.tsx`

**Interfaces:**
- Consumes: `ParticipantDrawer` de `./ParticipantDrawer`
- Produces:
  ```typescript
  export type ParticipantRow = {
    user_id: string; name: string; avatar_url: string | null
    position: number; total_points: number; current_streak: number
    team_name: string | null; team_color: string | null; function: string | null
    goals: { rule_name: string; actual: number; target: number }[]
  }
  export function DashboardParticipantList({ participants, campaignId }: { participants: ParticipantRow[]; campaignId: string }): JSX.Element
  ```

- [ ] **Step 1: Criar o componente**

```typescript
// components/manager/DashboardParticipantList.tsx
'use client'
import { useState, useCallback } from 'react'
import { ParticipantDrawer } from './ParticipantDrawer'

export type ParticipantRow = {
  user_id: string; name: string; avatar_url: string | null
  position: number; total_points: number; current_streak: number
  team_name: string | null; team_color: string | null; function: string | null
  goals: { rule_name: string; actual: number; target: number }[]
}

interface Props {
  participants: ParticipantRow[]
  campaignId: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const FUNCTION_LABEL: Record<string, string> = {
  internal_seller: 'Vendedor Interno',
  external_seller: 'Vendedor Externo',
  hunter: 'Hunter',
  manager: 'Gestor',
  auditor: 'Auditor',
}

export function DashboardParticipantList({ participants, campaignId }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const handleClose = useCallback(() => setSelectedUserId(null), [])

  if (participants.length === 0) {
    return (
      <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum participante nesta campanha.</p>
      </div>
    )
  }

  return (
    <>
      <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
        {participants.map((p, i) => (
          <ParticipantListRow
            key={p.user_id}
            row={p}
            isLast={i === participants.length - 1}
            isSelected={selectedUserId === p.user_id}
            onClick={() => setSelectedUserId(prev => prev === p.user_id ? null : p.user_id)}
          />
        ))}
      </div>
      <ParticipantDrawer userId={selectedUserId} campaignId={campaignId} onClose={handleClose} />
    </>
  )
}

function ListAvatar({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false)
  const size = 44
  const base: React.CSSProperties = { width: size, height: size, borderRadius: '0 0.55rem 0.55rem 0.55rem', flexShrink: 0, overflow: 'hidden', border: '1.5px solid rgba(141,178,60,0.22)' }
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  if (src && !err) return (
    <div style={base}>
      <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg,#8DB23C,#5C7435)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {initial}
    </div>
  )
}

function MiniGoalBar({ actual, target }: { actual: number; target: number }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const color = pct >= 100 ? '#8DB23C' : pct >= 75 ? '#FFDF00' : pct > 0 ? '#ef4444' : 'rgba(63,62,62,0.12)'
  return (
    <div style={{ width: 56, height: 5, background: 'rgba(63,62,62,0.1)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

function ParticipantListRow({ row, isLast, isSelected, onClick }: { row: ParticipantRow; isLast: boolean; isSelected: boolean; onClick: () => void }) {
  const isFirst = row.position === 1
  const isTop3 = row.position <= 3

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 1rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(63,62,62,0.06)',
        borderLeft: isSelected ? '3px solid #8DB23C' : isFirst ? '3px solid rgba(255,223,0,0.45)' : '3px solid transparent',
        background: isSelected ? 'rgba(141,178,60,0.07)' : isFirst ? 'rgba(255,223,0,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {/* Position */}
      <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
        {isTop3
          ? <span style={{ fontSize: '1.05rem' }}>{MEDALS[row.position - 1]}</span>
          : <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(63,62,62,0.32)' }}>{row.position}</span>}
      </div>

      {/* Avatar */}
      <ListAvatar src={row.avatar_url} name={row.name} />

      {/* Name + team/function */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#3F3E3E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</p>
        <div style={{ marginTop: '0.2rem' }}>
          {row.team_name ? (
            <span style={{ fontSize: '0.63rem', padding: '0.05rem 0.4rem', borderRadius: '0 0.2rem 0.2rem 0.2rem', background: (row.team_color ?? '#8DB23C') + '20', color: row.team_color ?? '#8DB23C', fontWeight: 600 }}>
              {row.team_name}
            </span>
          ) : row.function ? (
            <span style={{ fontSize: '0.63rem', color: 'rgba(63,62,62,0.38)' }}>{FUNCTION_LABEL[row.function] ?? row.function}</span>
          ) : null}
        </div>
      </div>

      {/* Points */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <p style={{ fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 700, fontSize: isFirst ? '1.05rem' : '0.9rem', color: '#8DB23C', margin: 0 }}>
          {row.total_points.toLocaleString('pt-BR')}
        </p>
        <p style={{ fontSize: '0.58rem', color: 'rgba(63,62,62,0.32)', margin: 0 }}>pts</p>
      </div>

      {/* Streak */}
      {row.current_streak > 0 && (
        <div style={{ flexShrink: 0, fontSize: '0.73rem', color: '#f97316', fontWeight: 600 }}>🔥{row.current_streak}</div>
      )}

      {/* Mini goal bars */}
      {row.goals.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {row.goals.slice(0, 2).map((g, i) => <MiniGoalBar key={i} actual={g.actual} target={g.target} />)}
        </div>
      )}

      {/* Chevron */}
      <div style={{ flexShrink: 0, color: isSelected ? '#8DB23C' : 'rgba(63,62,62,0.2)', fontSize: '1rem', transition: 'color 0.15s' }}>›</div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/manager/DashboardParticipantList.tsx
git commit -m "feat(manager): DashboardParticipantList com mini-goals e seleção de drawer"
```

---

### Task 4: Dashboard page — rewrite com seletor de campanha e KPIs

**Files:**
- Create: `components/manager/CampaignSelector.tsx`
- Modify: `app/(manager)/manager/dashboard/page.tsx`

**Interfaces:**
- Consumes: `DashboardParticipantList` + `ParticipantRow` de `@/components/manager/DashboardParticipantList`; `CampaignSelector` de `@/components/manager/CampaignSelector`; `getRanking` de `@/lib/rankings/queries`; `todayBrazil` de `@/lib/goals/helpers`; `createAdminClient` de `@/lib/supabase/admin`
- Produces: página `/manager/dashboard?campaign_id=xxx`

- [ ] **Step 1: Criar CampaignSelector**

```typescript
// components/manager/CampaignSelector.tsx
'use client'
import { useRouter } from 'next/navigation'

interface Props {
  campaigns: { id: string; name: string }[]
  selected: string
}

export function CampaignSelector({ campaigns, selected }: Props) {
  const router = useRouter()
  if (campaigns.length <= 1) return null
  return (
    <select
      value={selected}
      onChange={e => router.push(`/manager/dashboard?campaign_id=${e.target.value}`)}
      style={{
        border: '1px solid rgba(63,62,62,0.2)', borderRadius: '0 0.4rem 0.4rem 0.4rem',
        padding: '0.45rem 0.75rem', fontSize: '0.82rem', color: '#3F3E3E',
        fontFamily: 'var(--font-outfit, sans-serif)', background: '#fff',
        cursor: 'pointer', fontWeight: 600,
      }}
    >
      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
}
```

- [ ] **Step 2: Reescrever dashboard page**

```typescript
// app/(manager)/manager/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { LayoutDashboard, Users, Zap, AlertTriangle } from 'lucide-react'
import { DashboardParticipantList, type ParticipantRow } from '@/components/manager/DashboardParticipantList'
import { CampaignSelector } from '@/components/manager/CampaignSelector'
import { todayBrazil } from '@/lib/goals/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Props = { searchParams: Promise<{ campaign_id?: string }> }

export default async function ManagerDashboard({ searchParams }: Props) {
  await requireRole('manager')
  const params = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').eq('status', 'active').order('name')
  const campaignList = campaigns ?? []
  const selectedCampaignId = params.campaign_id ?? campaignList[0]?.id ?? null
  const selectedCampaign = campaignList.find(c => c.id === selectedCampaignId) ?? null

  if (!selectedCampaignId) {
    return (
      <div>
        <div className="sc-page-header">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={18} color="#8DB23C" />
            </div>
            <h1 className="sc-page-title">Dashboard</h1>
          </div>
        </div>
        <div className="p-6">
          <p style={{ color: 'rgba(63,62,62,0.45)', fontSize: '0.85rem' }}>Nenhuma campanha ativa.</p>
        </div>
      </div>
    )
  }

  const today = todayBrazil()
  const [y, mo] = today.slice(0, 7).split('-').map(Number)
  const monthStart = `${y}-${String(mo).padStart(2, '0')}-01`
  const lastDay = new Date(y, mo, 0).getDate()
  const monthEnd = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [ranking, kpiCount, kpiPts, kpiInactive, goalsRaw, photosRaw] = await Promise.all([
    getRanking(supabase, { campaign_id: selectedCampaignId }),
    admin.from('campaign_participants').select('*', { count: 'exact', head: true }).eq('campaign_id', selectedCampaignId),
    admin.from('point_transactions').select('points').eq('campaign_id', selectedCampaignId).eq('event_date', today).eq('status', 'active'),
    admin.from('campaign_participants').select('*', { count: 'exact', head: true }).eq('campaign_id', selectedCampaignId).lt('last_activity_date', threeDaysAgo).not('last_activity_date', 'is', null),
    admin.from('participant_goals')
      .select('user_id, actual_value, target_value, period_date, scoring_rules(name, target_period, is_cumulative)')
      .eq('campaign_id', selectedCampaignId)
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd),
    admin.from('campaign_participants').select('user_id, photo_url').eq('campaign_id', selectedCampaignId),
  ])

  const pointsToday = (kpiPts.data ?? []).reduce((s: number, p: { points: number }) => s + p.points, 0)

  // Build photo map: campaign photo overrides avatar
  const photoMap = new Map<string, string | null>()
  for (const cp of (photosRaw.data ?? [])) photoMap.set(cp.user_id, cp.photo_url)

  // Build mini-goals map: up to 2 per user (daily first, then monthly)
  type GoalRaw = {
    user_id: string; actual_value: number | null; target_value: number; period_date: string
    scoring_rules: { name: string; target_period: string | null; is_cumulative: boolean } | null
  }
  const goalsByUser = new Map<string, { rule_name: string; actual: number; target: number }[]>()
  for (const g of (goalsRaw.data ?? []) as GoalRaw[]) {
    if (!g.scoring_rules) continue
    const r = g.scoring_rules
    const isDaily = r.target_period !== 'monthly' && !r.is_cumulative && g.period_date === today
    const isMonthly = (r.target_period === 'monthly' || r.is_cumulative) && g.period_date === monthStart
    if (!isDaily && !isMonthly) continue
    const arr = goalsByUser.get(g.user_id) ?? []
    if (!arr.some(x => x.rule_name === r.name)) {
      arr.push({ rule_name: r.name, actual: g.actual_value ?? 0, target: g.target_value })
    }
    goalsByUser.set(g.user_id, arr)
  }

  const participants: ParticipantRow[] = ranking.map(r => ({
    user_id: r.user_id,
    name: r.name,
    avatar_url: photoMap.get(r.user_id) ?? r.avatar_url,
    position: r.position,
    total_points: r.total_points,
    current_streak: r.current_streak,
    team_name: r.team_name,
    team_color: r.team_color,
    function: r.function,
    goals: (goalsByUser.get(r.user_id) ?? []).slice(0, 2),
  }))

  const statCards = [
    { label: 'Participantes', value: String(kpiCount.count ?? 0), icon: Users, color: '#8DB23C', bg: 'rgba(141,178,60,0.1)' },
    { label: 'Pontos hoje', value: pointsToday.toLocaleString('pt-BR'), icon: Zap, color: '#BACB3A', bg: 'rgba(186,203,58,0.1)' },
    { label: 'Inativos (+3d)', value: String(kpiInactive.count ?? 0), icon: AlertTriangle, color: '#e07b39', bg: 'rgba(224,123,57,0.1)' },
  ]

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} color="#8DB23C" />
          </div>
          <h1 className="sc-page-title">Dashboard</h1>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)' }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Campaign selector + KPI cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <CampaignSelector campaigns={campaignList} selected={selectedCampaignId} />
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
            {statCards.map(card => (
              <div key={card.label} className="sc-card" style={{ flex: 1, minWidth: 110 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.5)', fontFamily: 'var(--font-outfit, sans-serif)', marginBottom: '0.2rem' }}>{card.label}</p>
                    <p style={{ fontSize: '1.55rem', fontWeight: 700, color: '#3F3E3E', fontFamily: 'var(--font-outfit, sans-serif)', lineHeight: 1, margin: 0 }}>{card.value}</p>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '0 0.4rem 0.4rem 0.4rem', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <card.icon size={16} color={card.color} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subheading */}
        {selectedCampaign && (
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(63,62,62,0.4)', fontFamily: 'var(--font-outfit, sans-serif)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            {selectedCampaign.name} — {participants.length} participante{participants.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Participant list */}
        <DashboardParticipantList participants={participants} campaignId={selectedCampaignId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial" && npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 4: Commit e push**

```bash
git add components/manager/CampaignSelector.tsx "app/(manager)/manager/dashboard/page.tsx"
git commit -m "feat(manager): dashboard redesign — seletor campanha, KPIs, lista de participantes com drawer"
git push
```

---

## Self-Review

### Spec coverage
- ✅ Seletor de campanha via `searchParams.campaign_id` (Task 4)
- ✅ 3 KPI cards: participantes, pontos hoje, inativos (Task 4)
- ✅ Lista com posição, avatar, nome, equipe/função, pontos, streak, mini-goals (Task 3)
- ✅ 1º lugar com destaque dourado (Task 3)
- ✅ Drawer lateral 420px com animação slide (Task 2)
- ✅ Overlay com clique para fechar + Escape (Task 2)
- ✅ Drawer mostra hero (foto 80px + nome + nível + streak) (Task 2)
- ✅ 3 stats no drawer: pontos, posição, sequência (Task 2)
- ✅ `GoalProgressBar` lista no drawer (Task 2)
- ✅ `PointsHistory` no drawer (Task 2)
- ✅ Link "Ver painel completo" no drawer (Task 2)
- ✅ API route com auth manager, parallel queries, dedup de goals (Task 1)
- ✅ Foto prioriza `campaign_participants.photo_url` (Tasks 1 e 4)
- ✅ Responsivo: drawer 100% width < 640px via `min(420px, 100vw)` (Task 2)

### Type consistency
- `ParticipantRow` exportado em Task 3, importado em Task 4 ✅
- `DrawerData.recentPoints` é `PointEntry[]` (mesmo tipo de `PointsHistory`) ✅
- `GoalItem` definido em Task 1 (API response) e Task 2 (DrawerData) com campos idênticos ✅
- `CampaignSelector` props: `campaigns: { id, name }[]`, `selected: string` — Task 4 passa ambos ✅
