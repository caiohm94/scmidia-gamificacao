# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-level theme system where managers create/activate visual themes, the login page dynamically renders the active theme (with a proper World Cup-style trophy for Hexa), and the TV panel shows square avatars.

**Architecture:** A `platform_themes` table stores one active theme at a time; a public `GET /api/themes/active` route feeds the login server component; manager CRUD lives at `/manager/themes`; TV panel's `TVAvatar` changes from circular to SCMídia-brand-square shape.

**Tech Stack:** Next.js 16 App Router, Supabase (admin client for writes, server client for reads), TypeScript, Zod v4, inline styles (no Tailwind in new components), `@base-ui/react` Select for form dropdowns.

## Global Constraints

- All UI text in Portuguese (Brazil).
- Next.js 16: `params` is `Promise<{...}>`, always `await params` in route handlers.
- Supabase: use `createAdminClient()` for all DB writes; `createClient()` (server) for auth checks.
- Zod v4: `.superRefine()` produces `ZodEffects`, not `ZodObject` — never chain `.partial()` or `.extend()` on a schema that has `.superRefine()`. Keep base `ZodObject` separate.
- `@base-ui/react` Select: `onValueChange` returns `string | null`; always use `v ?? ''`.
- Brand shape: `border-radius: 0 <r> <r> <r>` (top-left corner is always square).
- Brand colors: Onyx `#3F3E3E`, Apple Green `#8DB23C`, Gold `#FFDF00`, dark bg `#0a1a0e`.
- No new npm packages. Use only what's already installed.
- Commit after every task with `git add <files> && git commit -m "..."`.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `app/display/[slug]/page.tsx:80` | Change TVAvatar borderRadius from 50% to brand shape |
| Create | `supabase/migrations/008_platform_themes.sql` | Table + seed active Hexa theme |
| Modify | `types/database.ts` | Add PlatformThemeRow + Database entry |
| Create | `app/api/themes/active/route.ts` | Public GET for active theme |
| Create | `app/api/themes/route.ts` | Manager POST (create theme) |
| Create | `app/api/themes/[id]/route.ts` | Manager PATCH / DELETE |
| Create | `app/api/themes/[id]/activate/route.ts` | Manager POST to set active |
| Create | `components/auth/GoogleLoginButton.tsx` | Client component — OAuth click handler |
| Modify | `app/(auth)/login/page.tsx` | Convert to server component, read active theme |
| Create | `app/(manager)/manager/themes/page.tsx` | Theme list page |
| Create | `app/(manager)/manager/themes/[id]/page.tsx` | Edit theme page |
| Modify | `components/shared/ManagerNav.tsx` | Add "Temas" nav item |

---

## Task 1: Square avatars on TV panel

**Files:**
- Modify: `app/display/[slug]/page.tsx:80`

**Interfaces:**
- Consumes: nothing
- Produces: `TVAvatar` renders with `borderRadius: '0 0.75rem 0.75rem 0.75rem'` instead of `'50%'`

- [ ] **Step 1: Open the file and find TVAvatar**

Open `app/display/[slug]/page.tsx`, locate line 80:
```typescript
const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0, border, boxShadow: shadow, objectFit: 'cover' as const, transition: 'box-shadow 0.4s' }
```

- [ ] **Step 2: Change borderRadius**

Replace that line with:
```typescript
const style = { width: size, height: size, borderRadius: '0 0.75rem 0.75rem 0.75rem', flexShrink: 0, border, boxShadow: shadow, objectFit: 'cover' as const, transition: 'box-shadow 0.4s' }
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial"
npx tsc --noEmit
```
Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add app/display/[slug]/page.tsx
git commit -m "fix: avatar quadrado na TV (padrão SCMídia)"
```

---

## Task 2: DB migration + types

**Files:**
- Create: `supabase/migrations/008_platform_themes.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Consumes: nothing (first task in theme chain)
- Produces:
  - Table `platform_themes(id, name, subtitle, bg_gradient, primary_color, accent_color, is_active, created_at)`
  - TypeScript type `PlatformThemeRow` exported from `types/database.ts`
  - `Database['public']['Tables']['platform_themes']` entry in the interface

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/008_platform_themes.sql`:

```sql
create table if not exists platform_themes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  subtitle     text not null default 'Plataforma de Gamificação Comercial',
  bg_gradient  text not null default 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  primary_color  text not null default '#8DB23C',
  accent_color   text not null default '#FFDF00',
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Only one active at a time
create unique index if not exists idx_platform_themes_active
  on platform_themes (is_active) where is_active = true;

-- Seed the Hexa theme as active
insert into platform_themes (name, subtitle, bg_gradient, primary_color, accent_color, is_active)
values (
  'Missão Hexa',
  'Plataforma de Gamificação Comercial',
  'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  '#8DB23C',
  '#FFDF00',
  true
)
on conflict do nothing;
```

- [ ] **Step 2: Run migration in Supabase Dashboard**

Go to Supabase Dashboard → SQL Editor → paste and run the SQL above. Confirm no errors.

- [ ] **Step 3: Add PlatformThemeRow type to types/database.ts**

At the top of `types/database.ts`, after the existing row type exports, add:

```typescript
export type PlatformThemeRow = {
  id: string
  name: string
  subtitle: string
  bg_gradient: string
  primary_color: string
  accent_color: string
  is_active: boolean
  created_at: string
}
```

Then inside the `Database` interface, add `platform_themes` to the `Tables` object:

```typescript
platform_themes: { Row: PlatformThemeRow; Insert: Partial<PlatformThemeRow>; Update: Partial<PlatformThemeRow>; Relationships: [] }
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/008_platform_themes.sql types/database.ts
git commit -m "feat: tabela platform_themes e seed Missão Hexa"
```

---

## Task 3: Theme API routes

**Files:**
- Create: `app/api/themes/active/route.ts`
- Create: `app/api/themes/route.ts`
- Create: `app/api/themes/[id]/route.ts`
- Create: `app/api/themes/[id]/activate/route.ts`

**Interfaces:**
- Consumes: `PlatformThemeRow` from `types/database.ts`; `createAdminClient` from `@/lib/supabase/admin`; `createClient` from `@/lib/supabase/server`
- Produces:
  - `GET /api/themes/active` → `PlatformThemeRow | null` (public, no auth)
  - `GET /api/themes` → `PlatformThemeRow[]` (manager only)
  - `POST /api/themes` body `{ name, subtitle, bg_gradient, primary_color, accent_color }` → `PlatformThemeRow` (manager only)
  - `PATCH /api/themes/[id]` body partial fields → `PlatformThemeRow` (manager only)
  - `DELETE /api/themes/[id]` → `{ ok: true }` (manager only, cannot delete active theme)
  - `POST /api/themes/[id]/activate` → `{ ok: true }` (manager only)

- [ ] **Step 1: Create `app/api/themes/active/route.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_themes')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create `app/api/themes/route.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const themeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  subtitle: z.string().default('Plataforma de Gamificação Comercial'),
  bg_gradient: z.string().min(1),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
})

async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'manager' ? user : null
}

export async function GET() {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_themes')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = themeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_themes')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Create `app/api/themes/[id]/route.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  bg_gradient: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'manager' ? user : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_themes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireManager()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: theme } = await admin
    .from('platform_themes')
    .select('is_active')
    .eq('id', id)
    .single()

  if (theme?.is_active) {
    return NextResponse.json({ error: 'Não é possível excluir o tema ativo' }, { status: 400 })
  }

  const { error } = await admin.from('platform_themes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `app/api/themes/[id]/activate/route.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  // Deactivate all themes then activate the target (unique index prevents two active)
  await admin.from('platform_themes').update({ is_active: false }).eq('is_active', true)
  const { error } = await admin
    .from('platform_themes')
    .update({ is_active: true })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 6: Verify active route works (run dev if not already running)**

```bash
# In a browser or curl:
curl http://localhost:3000/api/themes/active
```
Expected: JSON with the Hexa theme (`name: "Missão Hexa"`, `is_active: true`).

- [ ] **Step 7: Commit**

```bash
git add app/api/themes/
git commit -m "feat: API routes para gerenciamento de temas"
```

---

## Task 4: Theme management pages in manager

**Files:**
- Create: `app/(manager)/manager/themes/page.tsx`
- Create: `app/(manager)/manager/themes/[id]/page.tsx`
- Modify: `components/shared/ManagerNav.tsx`

**Interfaces:**
- Consumes: `GET /api/themes`, `PATCH /api/themes/[id]`, `DELETE /api/themes/[id]`, `POST /api/themes/[id]/activate`, `POST /api/themes`
- Produces: Manager UI at `/manager/themes` (list) and `/manager/themes/[id]` (edit form)

- [ ] **Step 1: Add "Temas" to ManagerNav**

In `components/shared/ManagerNav.tsx`, add `Palette` to imports:
```typescript
import { LayoutDashboard, Trophy, Users, Target, History, Upload, BarChart3, Palette } from 'lucide-react'
```

Add to `navItems` array (after Rankings):
```typescript
{ href: '/manager/themes', label: 'Temas', icon: Palette },
```

- [ ] **Step 2: Create `app/(manager)/manager/themes/page.tsx`**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { PlatformThemeRow } from '@/types/database'

async function getThemes(): Promise<PlatformThemeRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('platform_themes')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as PlatformThemeRow[]
}

export default async function ThemesPage() {
  const themes = await getThemes()

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1a1a', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Temas
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.25rem' }}>
            O tema ativo define a aparência da tela de login.
          </p>
        </div>
        <Link
          href="/manager/themes/new"
          style={{
            background: '#8DB23C', color: '#fff', padding: '0.6rem 1.25rem',
            borderRadius: '0 0.6rem 0.6rem 0.6rem', textDecoration: 'none',
            fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          + Novo tema
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {themes.map(theme => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
        {themes.length === 0 && (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Nenhum tema cadastrado.</p>
        )}
      </div>
    </div>
  )
}

function ThemeCard({ theme }: { theme: PlatformThemeRow }) {
  return (
    <div style={{
      background: '#fff', border: theme.is_active ? '2px solid #8DB23C' : '1px solid #e5e5e5',
      borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      {/* Color swatch */}
      <div style={{
        width: 48, height: 48, borderRadius: '0 0.5rem 0.5rem 0.5rem', flexShrink: 0,
        background: theme.bg_gradient, border: '1px solid rgba(0,0,0,0.08)',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-outfit, sans-serif)', color: '#1a1a1a' }}>
            {theme.name}
          </span>
          {theme.is_active && (
            <span style={{
              background: '#8DB23C', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
              padding: '0.1rem 0.45rem', borderRadius: '0 0.3rem 0.3rem 0.3rem', letterSpacing: '0.03em',
            }}>
              ATIVO
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#777', marginTop: '0.2rem' }}>{theme.subtitle}</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
          <ColorDot color={theme.primary_color} label="Primária" />
          <ColorDot color={theme.accent_color} label="Destaque" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        {!theme.is_active && <ActivateButton id={theme.id} />}
        <Link
          href={`/manager/themes/${theme.id}`}
          style={{
            padding: '0.4rem 0.85rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem',
            fontSize: '0.8rem', color: '#555', textDecoration: 'none', fontFamily: 'var(--font-outfit, sans-serif)',
          }}
        >
          Editar
        </Link>
      </div>
    </div>
  )
}

function ColorDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
      <span style={{ fontSize: '0.72rem', color: '#999' }}>{label}</span>
    </div>
  )
}

function ActivateButton({ id }: { id: string }) {
  async function activate() {
    'use server'
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin.from('platform_themes').update({ is_active: false }).eq('is_active', true)
    await admin.from('platform_themes').update({ is_active: true }).eq('id', id)
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/manager/themes')
  }

  return (
    <form action={activate}>
      <button
        type="submit"
        style={{
          padding: '0.4rem 0.85rem', background: '#f0f7e6', border: '1px solid #8DB23C',
          borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.8rem', color: '#5a7a25',
          cursor: 'pointer', fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600,
        }}
      >
        Ativar
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/(manager)/manager/themes/new/page.tsx`**

Create file `app/(manager)/manager/themes/new/page.tsx`:

```typescript
export { default } from '../[id]/page'
```

Wait — for new theme, we need a blank form. Create a proper new page instead:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewThemePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    subtitle: 'Plataforma de Gamificação Comercial',
    bg_gradient: 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
    primary_color: '#8DB23C',
    accent_color: '#FFDF00',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Erro ao criar tema')
      setSaving(false)
      return
    }
    router.push('/manager/themes')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
        Novo tema
      </h1>
      <ThemeForm form={form} setForm={setForm} onSubmit={handleSubmit} saving={saving} error={error} submitLabel="Criar tema" />
    </div>
  )
}

type FormState = { name: string; subtitle: string; bg_gradient: string; primary_color: string; accent_color: string }

export function ThemeForm({
  form, setForm, onSubmit, saving, error, submitLabel,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  error: string
  submitLabel: string
}) {
  const field = (label: string, key: keyof FormState, placeholder?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
        {label}
      </label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd',
          borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.88rem',
          fontFamily: 'var(--font-outfit, sans-serif)', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  return (
    <form onSubmit={onSubmit}>
      {field('Nome do tema', 'name', 'Ex: Missão Hexa')}
      {field('Subtítulo', 'subtitle', 'Ex: Plataforma de Gamificação Comercial')}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
          Gradiente de fundo (CSS)
        </label>
        <textarea
          value={form.bg_gradient}
          onChange={e => setForm(f => ({ ...f, bg_gradient: e.target.value }))}
          rows={3}
          style={{
            width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd',
            borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.85rem', resize: 'vertical',
            fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: '0.5rem', height: 32, borderRadius: '0 0.3rem 0.3rem 0.3rem', background: form.bg_gradient }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Cor primária
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
            <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#8DB23C" style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Cor de destaque
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
            <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#FFDF00" style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        style={{
          background: saving ? '#aaa' : '#8DB23C', color: '#fff', border: 'none',
          padding: '0.7rem 1.5rem', borderRadius: '0 0.6rem 0.6rem 0.6rem',
          fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-outfit, sans-serif)',
        }}
      >
        {saving ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/(manager)/manager/themes/[id]/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { PlatformThemeRow } from '@/types/database'

export default function EditThemePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [theme, setTheme] = useState<PlatformThemeRow | null>(null)
  const [form, setForm] = useState({
    name: '', subtitle: '', bg_gradient: '', primary_color: '#8DB23C', accent_color: '#FFDF00',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/themes')
      .then(r => r.json())
      .then((themes: PlatformThemeRow[]) => {
        const t = themes.find(x => x.id === params.id)
        if (t) {
          setTheme(t)
          setForm({ name: t.name, subtitle: t.subtitle, bg_gradient: t.bg_gradient, primary_color: t.primary_color, accent_color: t.accent_color })
        }
      })
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/themes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Erro ao salvar')
      setSaving(false)
      return
    }
    router.push('/manager/themes')
  }

  async function handleDelete() {
    if (!confirm('Excluir este tema?')) return
    setDeleting(true)
    const res = await fetch(`/api/themes/${params.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert(j.error ?? 'Erro ao excluir')
      setDeleting(false)
      return
    }
    router.push('/manager/themes')
  }

  if (!theme) return <div style={{ padding: '2rem', color: '#999' }}>Carregando...</div>

  const field = (label: string, key: keyof typeof form, placeholder?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
        {label}
      </label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.88rem', fontFamily: 'var(--font-outfit, sans-serif)', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-outfit, sans-serif)' }}>
          Editar tema
        </h1>
        {!theme.is_active && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', padding: '0.4rem 0.85rem', borderRadius: '0 0.4rem 0.4rem 0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-outfit, sans-serif)' }}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {field('Nome do tema', 'name')}
        {field('Subtítulo', 'subtitle')}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>
            Gradiente de fundo (CSS)
          </label>
          <textarea
            value={form.bg_gradient}
            onChange={e => setForm(f => ({ ...f, bg_gradient: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: '0.5rem', height: 32, borderRadius: '0 0.3rem 0.3rem 0.3rem', background: form.bg_gradient }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>Cor primária</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
              <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.35rem', fontFamily: 'var(--font-outfit, sans-serif)' }}>Cor de destaque</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
              <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '0 0.4rem 0.4rem 0.4rem', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
            </div>
          </div>
        </div>
        {error && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={saving}
          style={{ background: saving ? '#aaa' : '#8DB23C', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '0 0.6rem 0.6rem 0.6rem', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-outfit, sans-serif)' }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/shared/ManagerNav.tsx app/(manager)/manager/themes/
git commit -m "feat: gerenciamento de temas no painel do gestor"
```

---

## Task 5: Login page reads active theme + World Cup trophy

**Files:**
- Create: `components/auth/GoogleLoginButton.tsx`
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `GET /api/themes/active` → `PlatformThemeRow | null`; `createAdminClient` from `@/lib/supabase/admin`
- Produces: Server-rendered login page styled with active theme colors; `GoogleLoginButton` client component handles OAuth; `HexaTrophy` SVG component renders World Cup-style trophy

**Notes:**
- The current login page is `'use client'` — converting it to a server component requires extracting the OAuth button click handler to a separate client component.
- The trophy SVG is hardcoded for the "hexa" theme. Future themes would either map `slug → trophy` in the component, or the page renders a generic emoji fallback.

- [ ] **Step 1: Create `components/auth/GoogleLoginButton.tsx`**

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton({ primaryColor }: { primaryColor: string }) {
  const supabase = createClient()

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'scmidia.com.br' },
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        padding: '0.75rem 1.25rem', cursor: 'pointer',
        background: primaryColor, color: '#ffffff',
        fontFamily: 'var(--font-outfit, sans-serif)', fontWeight: 600, fontSize: '0.9rem',
        border: 'none', borderRadius: '0 0.75rem 0.75rem 0.75rem',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#fff" fillOpacity=".9"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#fff" fillOpacity=".8"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#fff" fillOpacity=".7"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".6"/>
      </svg>
      Entrar com Google @scmidia.com.br
    </button>
  )
}
```

- [ ] **Step 2: Rewrite `app/(auth)/login/page.tsx` as server component**

Replace the entire file content:

```typescript
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import type { PlatformThemeRow } from '@/types/database'

async function getActiveTheme(): Promise<PlatformThemeRow | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_themes')
      .select('*')
      .eq('is_active', true)
      .single()
    return data as PlatformThemeRow | null
  } catch {
    return null
  }
}

// Fallback theme when DB is unavailable
const hexaTheme: PlatformThemeRow = {
  id: '',
  name: 'Missão Hexa',
  subtitle: 'Plataforma de Gamificação Comercial',
  bg_gradient: 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  primary_color: '#8DB23C',
  accent_color: '#FFDF00',
  is_active: true,
  created_at: '',
}

export default async function LoginPage() {
  const theme = (await getActiveTheme()) ?? hexaTheme

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: theme.bg_gradient }}
    >
      {/* Decorative shapes — SCMídia brand element */}
      <div style={{ position: 'absolute', top: 40, right: 80, width: 180, height: 180, background: `${theme.primary_color}12`, borderRadius: '0 3rem 3rem 3rem', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 60, width: 120, height: 120, background: `${theme.primary_color}0d`, borderRadius: '0 2rem 2rem 2rem', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '35%', left: '10%', width: 60, height: 60, background: `${theme.accent_color}0a`, borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', padding: '0 1rem' }}>
        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '0 1.5rem 1.5rem 1.5rem',
          padding: '2.5rem 2.25rem',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}>
          {/* SCMídia logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <Image
              src="/logo-scmidia.png"
              alt="SCMídia"
              width={110}
              height={32}
              className="object-contain"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
            />
          </div>

          {/* Trophy + title */}
          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <HexaTrophy accentColor={theme.accent_color} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-outfit, sans-serif)',
              fontSize: '1.75rem', fontWeight: 800,
              color: theme.accent_color,
              letterSpacing: '-0.02em', marginBottom: '0.4rem',
              textShadow: `0 0 30px ${theme.accent_color}40`,
            }}>
              {theme.name}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.01em' }}>
              {theme.subtitle}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: '1.75rem' }} />

          <GoogleLoginButton primaryColor={theme.primary_color} />

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '1.25rem' }}>
            Acesso restrito a colaboradores SCMídia
          </p>
        </div>

        {/* Stars decoration */}
        <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ color: theme.accent_color, fontSize: '0.75rem', opacity: 0.6 }}>★</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HexaTrophy({ accentColor }: { accentColor: string }) {
  const gold = accentColor
  const dark = '#b8960a'
  const green = '#1a4a20'

  return (
    <svg width="80" height="96" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Two human figures holding globe — stylized */}
      {/* Left figure */}
      <ellipse cx="26" cy="9" rx="4" ry="4" fill={gold} />
      <path d="M22 13 L18 22 L26 20 L26 13" fill={gold} />
      <path d="M26 20 L30 22 L26 13" fill={gold} />
      {/* Right figure */}
      <ellipse cx="54" cy="9" rx="4" ry="4" fill={gold} />
      <path d="M58 13 L62 22 L54 20 L54 13" fill={gold} />
      <path d="M54 20 L50 22 L54 13" fill={gold} />
      {/* Globe on top */}
      <circle cx="40" cy="20" r="10" fill={gold} opacity="0.9" />
      <ellipse cx="40" cy="20" rx="10" ry="4" fill={dark} opacity="0.4" />
      <line x1="30" y1="20" x2="50" y2="20" stroke={dark} strokeWidth="0.8" opacity="0.5" />
      <path d="M34 11 Q40 15 46 11" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M34 29 Q40 25 46 29" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.5" />

      {/* Handles */}
      <path d="M18 38 C6 38 4 52 6 56 C8 62 14 62 18 58" stroke={gold} strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M62 38 C74 38 76 52 74 56 C72 62 66 62 62 58" stroke={gold} strokeWidth="5" strokeLinecap="round" fill="none"/>

      {/* Cup body */}
      <path d="M18 30 L18 58 Q18 70 40 74 Q62 70 62 58 L62 30 Z" fill={gold}/>

      {/* Top rim of cup */}
      <ellipse cx="40" cy="30" rx="22" ry="6" fill={dark} opacity="0.6"/>

      {/* Shine on cup */}
      <path d="M26 38 Q30 54 28 66" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" fill="none"/>

      {/* Stem */}
      <rect x="32" y="74" width="16" height="10" rx="2" fill={gold}/>

      {/* Base — green band (malachite) */}
      <rect x="12" y="84" width="56" height="4" rx="1" fill={green}/>
      {/* Base bottom */}
      <rect x="6" y="88" width="68" height="8" rx="2" fill={dark}/>
      {/* Base shine */}
      <rect x="8" y="89" width="64" height="3" rx="1" fill={gold} opacity="0.4"/>
    </svg>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Build check**

```bash
npm run build
```
Expected: compilation succeeds (✓ Compiled successfully).

- [ ] **Step 5: Visual test**

Open `http://localhost:3000/login` in a browser. Verify:
- Background is the dark green gradient (from active theme)
- SCMídia logo visible at top
- 6 gold stars decoration above card
- World Cup trophy SVG visible (two figures holding globe, handles, base)
- "Missão Hexa" title in gold
- Green "Entrar com Google" button

- [ ] **Step 6: Commit**

```bash
git add components/auth/GoogleLoginButton.tsx app/(auth)/login/page.tsx
git commit -m "feat: tela de login vinculada ao tema ativo com troféu Copa do Mundo"
```

- [ ] **Step 7: Push and deploy**

```bash
git push origin main
```

Wait for Vercel deploy. Then test at the production URL.

---

## Self-Review

### Spec coverage
- ✅ Login screen tied to active theme — Task 5 reads active theme from DB, applies colors
- ✅ World Cup-style trophy — `HexaTrophy` SVG with globe, two figures, handles, malachite base
- ✅ Theme management CRUD in manager — Tasks 3+4: list, create, edit, delete, activate
- ✅ Theme activates "only one at a time" — unique partial index + deactivate-all in activate route
- ✅ Square avatars on TV panel — Task 1
- ✅ Login fallback if DB fails — `hexaTheme` constant in Task 5

### Placeholder scan
None found — all steps include complete code.

### Type consistency
- `PlatformThemeRow` defined in Task 2, consumed in Tasks 3, 4, 5 ✅
- `createAdminClient` used consistently across all API routes ✅
- `params: Promise<{ id: string }>` pattern used in all route handlers ✅
