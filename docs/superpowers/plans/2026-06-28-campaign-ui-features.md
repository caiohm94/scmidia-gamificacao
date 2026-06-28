# Campaign UI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add participants UI, fix TV panel URL, create edit campaign page, and add rule toggle to the campaign detail page.

**Architecture:** Four additive changes to `app/(manager)/manager/campaigns/[id]/page.tsx` plus three new component files and one new page. All interactions use existing API routes (adding PATCH to rules route). No DB schema changes.

**Tech Stack:** Next.js 16, Tailwind v4, shadcn v4 (@base-ui/react), TypeScript strict, Supabase, sonner toasts.

## Global Constraints

- TypeScript strict — no implicit `any`, no unused variables
- `Select onValueChange` types value as `unknown` — always cast: `v as string`
- `await params` in all dynamic routes
- `createClient()` is async — always `await createClient()`
- Pages at `app/(manager)/manager/...` → URL `/manager/...`
- POST /api/campaigns/[id]/participants expects `{ user_ids: string[] }` (array) — not `{ user_id }`
- DELETE /api/campaigns/[id]/participants expects `{ user_id: string }` in body
- `router.refresh()` after successful mutations to revalidate server data

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/campaign/ParticipantForm.tsx` | Create | "+ Adicionar participante" button + user select form |
| `components/campaign/RemoveParticipantButton.tsx` | Create | Client Component "Remover" button per participant |
| `components/campaign/ToggleRuleButton.tsx` | Create | Client Component "Ativar/Desativar" per rule |
| `app/(manager)/manager/campaigns/[id]/edit/page.tsx` | Create | Edit campaign page wrapping CampaignForm |
| `app/api/campaigns/[id]/rules/route.ts` | Modify | Add PATCH handler for toggling is_active |
| `app/(manager)/manager/campaigns/[id]/page.tsx` | Modify | Integrate all 4 features |

---

### Task 1: ParticipantForm component

**Files:**
- Create: `components/campaign/ParticipantForm.tsx`

**Interfaces:**
- Produces: `export function ParticipantForm({ campaignId }: { campaignId: string })`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface User { id: string; name: string; email: string }
interface Props { campaignId: string }

export function ParticipantForm({ campaignId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setOpen(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [userId] }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao adicionar participante'); return }
    toast.success('Participante adicionado!')
    setOpen(false)
    setUserId('')
    router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="outline" onClick={handleOpen}>+ Adicionar participante</Button>
  )

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="space-y-1">
        <Label>Usuário</Label>
        <Select value={userId} onValueChange={v => setUserId(v as string)}>
          <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !userId}>
          {loading ? 'Adicionando...' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles** — `npx tsc --noEmit` (expect no new errors)

---

### Task 2: RemoveParticipantButton component

**Files:**
- Create: `components/campaign/RemoveParticipantButton.tsx`

**Interfaces:**
- Produces: `export function RemoveParticipantButton({ campaignId, userId }: { campaignId: string; userId: string })`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props { campaignId: string; userId: string }

export function RemoveParticipantButton({ campaignId, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao remover participante'); return }
    router.refresh()
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive" disabled={loading} onClick={handleRemove}>
      {loading ? '...' : 'Remover'}
    </Button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles** — `npx tsc --noEmit`

---

### Task 3: ToggleRuleButton component + PATCH route

**Files:**
- Create: `components/campaign/ToggleRuleButton.tsx`
- Modify: `app/api/campaigns/[id]/rules/route.ts` — append PATCH handler

**Interfaces:**
- Produces: `export function ToggleRuleButton({ campaignId, ruleId, isActive }: { campaignId: string; ruleId: string; isActive: boolean })`

- [ ] **Step 1: Add PATCH handler to rules route**

Append to `app/api/campaigns/[id]/rules/route.ts`:

```ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rule_id, is_active } = await request.json() as { rule_id: string; is_active: boolean }
  const admin = createAdminClient()
  const { data, error } = await admin.from('scoring_rules')
    .update({ is_active }).eq('id', rule_id).eq('campaign_id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create ToggleRuleButton component**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props { campaignId: string; ruleId: string; isActive: boolean }

export function ToggleRuleButton({ campaignId, ruleId, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/rules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId, is_active: !isActive }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erro ao atualizar regra'); return }
    router.refresh()
  }

  return (
    <Button size="sm" variant="ghost" disabled={loading} onClick={handleToggle}>
      {loading ? '...' : isActive ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles** — `npx tsc --noEmit`

---

### Task 4: Edit campaign page

**Files:**
- Create: `app/(manager)/manager/campaigns/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { CampaignInput } from '@/schemas/campaign'

type Props = { params: Promise<{ id: string }> }

export default async function EditCampaignPage({ params }: Props) {
  await requireRole('manager')
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('id', id).single()

  if (!campaign) notFound()

  const defaultValues: Partial<CampaignInput> = {
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description ?? undefined,
    rules: campaign.rules ?? undefined,
    prizes: campaign.prizes ?? undefined,
    status: campaign.status,
    starts_at: campaign.starts_at ? campaign.starts_at.slice(0, 16) : undefined,
    ends_at: campaign.ends_at ? campaign.ends_at.slice(0, 16) : undefined,
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/manager/campaigns/${id}`}>
          <Button variant="outline" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">Editar campanha</h1>
      </div>
      <CampaignForm defaultValues={defaultValues} campaignId={id} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles** — `npx tsc --noEmit`

---

### Task 5: Update campaign detail page

**Files:**
- Modify: `app/(manager)/manager/campaigns/[id]/page.tsx`

Changes:
1. Import `headers` from `next/headers`, derive `baseUrl` from host header
2. Add `is_active` to the rules query
3. Import and render `ParticipantForm`, `RemoveParticipantButton`, `ToggleRuleButton`
4. Add "Editar campanha" button in header
5. Replace `process.env.NEXT_PUBLIC_APP_URL` with `baseUrl`

- [ ] **Step 1: Rewrite campaign detail page**

Replace entire file with updated version integrating all components.

- [ ] **Step 2: Run TypeScript check** — `npx tsc --noEmit` — must pass with 0 errors

- [ ] **Step 3: Run tests** — `npm run test:run` — must still pass

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: participants UI, edit campaign, TV URL fix, rule toggle"
git push origin main
```
