# Salesforce Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar regras de pontuação ao Salesforce via SOQL, sincronizando pontos automaticamente por cron job ou manualmente, mapeando usuários pelo alias do Salesforce.

**Architecture:** Cada regra de pontuação pode ter origem `manual` ou `salesforce`. Quando `salesforce`, o gestor define uma query SOQL que retorna `(alias, valor)` por usuário. Um serviço de sync autentica via OAuth Username-Password flow, executa a SOQL, calcula o delta desde o último sync, e insere `point_transactions`. O Vercel Cron Job dispara o endpoint de sync conforme a frequência configurada em cada regra.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, `jsforce` (Salesforce REST API), Vercel Cron Jobs, TypeScript, Zod.

## Global Constraints

- Next.js 16: params são `Promise<{...}>`, sempre `await params`
- Supabase JS v2: usar `createClient()` (server) e `createAdminClient()` (service role)
- `jsforce` versão `^2.0.0` — API assíncrona com async/await
- Variáveis de ambiente SF prefixadas com `SFDC_`
- `CRON_SECRET` protege o endpoint de sync contra chamadas externas
- Todo insert em `point_transactions` DEVE incluir `created_by` (uuid, NOT NULL)
- Sem try/catch desnecessário — erros propagam como JSON 500 via helper
- Commits em português, mensagens curtas e descritivas

---

## File Structure

```
supabase/migrations/
  007_salesforce_fields.sql        ← colunas SF em scoring_rules + users + tabela sync_state

lib/salesforce/
  client.ts                        ← auth jsforce, executa SOQL, retorna rows tipados
  sync.ts                          ← lógica de sync: calcula delta → insere transactions

app/api/integrations/salesforce/
  sync/route.ts                    ← POST /api/integrations/salesforce/sync (cron + manual)
  test-connection/route.ts         ← POST /api/integrations/salesforce/test-connection

schemas/
  salesforce.ts                    ← Zod schemas para campos SF

types/
  database.ts                      ← atualizar ScoringRuleRow e UserRow

components/campaign/
  RuleForm.tsx                     ← adicionar seção condicional de campos SF

components/users/
  UserForm.tsx                     ← adicionar campo sf_alias
  schemas/user.ts                  ← adicionar sf_alias ao userSchema

app/(manager)/manager/campaigns/[id]/
  page.tsx                         ← botão "Sync agora" por regra SF

vercel.json                        ← configurar cron jobs
```

---

## Task 1: Instalar jsforce e criar variáveis de ambiente

**Files:**
- Run: `npm install jsforce @types/jsforce`
- Create: `.env.local` (local only — nunca commitar)
- Modify: `vercel.json` (criar se não existir)

**Interfaces:**
- Produces: `jsforce` disponível em imports, env vars documentadas

- [ ] **Step 1: Instalar jsforce**

```bash
cd "/Users/caio/Projetos Claude Code/Projeto Campanha Comercial"
npm install jsforce
npm install --save-dev @types/jsforce
```

Expected: `added N packages` sem erros.

- [ ] **Step 2: Adicionar vars ao .env.local**

Abrir `.env.local` e adicionar ao final (valores de exemplo — substituir pelos reais):

```bash
# Salesforce
SFDC_INSTANCE_URL=https://suaorg.my.salesforce.com
SFDC_CLIENT_ID=3MVG9COLHERESEUKEY...
SFDC_CLIENT_SECRET=ABC123SEUSECRET...
SFDC_USERNAME=api@scmidia.com.br
SFDC_PASSWORD=SenhaAqui + TOKEN_SEGURANCA_SEM_ESPACO
CRON_SECRET=gere-um-uuid-aqui-ex-f47ac10b58cc
```

**IMPORTANTE:** `SFDC_PASSWORD` = senha concatenada com o token de segurança do Salesforce SEM espaço. Ex: `Minha$enha123ABCDEFGHIJKLMNOtoken`.

- [ ] **Step 3: Verificar que .env.local está no .gitignore**

```bash
grep ".env.local" .gitignore
```

Expected: linha `.env.local` presente. Se não: `echo ".env.local" >> .gitignore`

- [ ] **Step 4: Commit das dependências**

```bash
git add package.json package-lock.json
git commit -m "feat: adiciona jsforce para integração Salesforce"
```

---

## Task 2: Migration — campos Salesforce no banco

**Files:**
- Create: `supabase/migrations/007_salesforce_fields.sql`
- Modify: `types/database.ts` — atualizar `ScoringRuleRow`, `UserRow`, adicionar `SalesforceSyncStateRow`

**Interfaces:**
- Produces: tabela `salesforce_sync_state`, colunas `sf_*` em `scoring_rules`, coluna `sf_alias` em `users`

- [ ] **Step 1: Criar migration SQL**

Criar `supabase/migrations/007_salesforce_fields.sql` com conteúdo:

```sql
-- Origem dos dados (manual é o padrão existente)
alter table scoring_rules
  add column if not exists data_origin       text    not null default 'manual'
                                             check (data_origin in ('manual','salesforce')),
  add column if not exists sf_soql           text,
  add column if not exists sf_value_field    text,
  add column if not exists sf_alias_field    text    default 'Alias',
  add column if not exists sf_frequency      text
                                             check (sf_frequency in ('5min','daily','weekly')),
  add column if not exists sf_run_time       time,
  add column if not exists sf_run_day        integer check (sf_run_day between 0 and 6);

-- Alias do usuário no Salesforce (para match com resultado da SOQL)
alter table users
  add column if not exists sf_alias text;

-- Estado do último sync por regra x usuário (evita transações duplicadas)
create table if not exists salesforce_sync_state (
  scoring_rule_id uuid   not null references scoring_rules(id) on delete cascade,
  user_id         uuid   not null references users(id) on delete cascade,
  last_value      numeric not null default 0,
  last_synced_at  timestamptz not null default now(),
  primary key (scoring_rule_id, user_id)
);

-- Índice para queries de sync
create index if not exists idx_scoring_rules_sf
  on scoring_rules(data_origin)
  where data_origin = 'salesforce';
```

- [ ] **Step 2: Executar no Supabase Dashboard**

Abrir Supabase Dashboard → SQL Editor → colar o conteúdo acima → Run.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Atualizar tipos TypeScript**

Abrir `types/database.ts`. Localizar `ScoringRuleRow` e substituir por:

```typescript
type ScoringRuleRow = {
  id: string; campaign_id: string; name: string; description: string | null; points: number
  applies_to: 'all' | 'internal_seller' | 'external_seller' | 'hunter'
  category: 'goal' | 'activity' | 'behavior' | 'bonus' | 'penalty'
  target_value: number | null; target_period: 'daily' | 'weekly' | 'monthly' | null
  is_active: boolean; created_at: string
  // Salesforce integration
  data_origin: 'manual' | 'salesforce'
  sf_soql: string | null
  sf_value_field: string | null
  sf_alias_field: string | null
  sf_frequency: '5min' | 'daily' | 'weekly' | null
  sf_run_time: string | null
  sf_run_day: number | null
}
```

Localizar `UserRow` e adicionar `sf_alias`:

```typescript
type UserRow = {
  id: string; name: string; email: string; avatar_url: string | null
  role: 'manager' | 'participant'; team_id: string | null
  function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
  status: 'active' | 'inactive'; created_at: string; updated_at: string
  sf_alias: string | null
}
```

Adicionar após `CampaignRankingRow`:

```typescript
export type SalesforceSyncStateRow = {
  scoring_rule_id: string; user_id: string
  last_value: number; last_synced_at: string
}
```

Adicionar a tabela no `Database` interface:

```typescript
salesforce_sync_state: {
  Row: SalesforceSyncStateRow
  Insert: Partial<SalesforceSyncStateRow>
  Update: Partial<SalesforceSyncStateRow>
  Relationships: []
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_salesforce_fields.sql types/database.ts
git commit -m "feat: migration e tipos para integração Salesforce"
```

---

## Task 3: Schema Zod para campos Salesforce

**Files:**
- Create: `schemas/salesforce.ts`
- Modify: `schemas/user.ts` — adicionar `sf_alias`

**Interfaces:**
- Produces: `salesforceRuleFieldsSchema`, `SalesforceRuleFields`, export de `userSchema` atualizado

- [ ] **Step 1: Criar schemas/salesforce.ts**

```typescript
import { z } from 'zod'

export const salesforceRuleFieldsSchema = z.object({
  data_origin: z.enum(['manual', 'salesforce']).default('manual'),
  sf_soql: z.string().min(10, 'SOQL muito curta').nullable().optional(),
  sf_value_field: z.string().min(1).nullable().optional(),
  sf_alias_field: z.string().default('Alias'),
  sf_frequency: z.enum(['5min', 'daily', 'weekly']).nullable().optional(),
  sf_run_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  sf_run_day: z.number().int().min(0).max(6).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.data_origin === 'salesforce') {
    if (!data.sf_soql) ctx.addIssue({ code: 'custom', path: ['sf_soql'], message: 'SOQL obrigatória quando origem é Salesforce' })
    if (!data.sf_value_field) ctx.addIssue({ code: 'custom', path: ['sf_value_field'], message: 'Campo de valor obrigatório' })
    if (!data.sf_frequency) ctx.addIssue({ code: 'custom', path: ['sf_frequency'], message: 'Frequência obrigatória' })
    if (data.sf_frequency === 'daily' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência diária' })
    if (data.sf_frequency === 'weekly' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência semanal' })
    if (data.sf_frequency === 'weekly' && data.sf_run_day == null) ctx.addIssue({ code: 'custom', path: ['sf_run_day'], message: 'Dia da semana obrigatório para frequência semanal' })
  }
})

export type SalesforceRuleFields = z.infer<typeof salesforceRuleFieldsSchema>
```

- [ ] **Step 2: Atualizar schemas/user.ts**

Abrir `schemas/user.ts` e adicionar `sf_alias`:

```typescript
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['manager', 'participant']),
  team_id: z.string().uuid().nullable(),
  function: z.enum(['internal_seller','external_seller','hunter','manager','auditor']),
  status: z.enum(['active','inactive']),
  sf_alias: z.string().nullable().optional(),
})

export type UserInput = z.infer<typeof userSchema>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add schemas/salesforce.ts schemas/user.ts
git commit -m "feat: schemas Zod para campos Salesforce e sf_alias do usuário"
```

---

## Task 4: Cliente Salesforce (autenticação + SOQL)

**Files:**
- Create: `lib/salesforce/client.ts`

**Interfaces:**
- Produces:
  - `getSalesforceConnection(): Promise<jsforce.Connection>` — conexão autenticada
  - `executeSoql(conn, soql): Promise<Record<string, unknown>[]>` — executa SOQL, retorna rows
  - `testConnection(): Promise<{ ok: boolean; orgName?: string; error?: string }>` — testa credenciais

- [ ] **Step 1: Criar lib/salesforce/client.ts**

```typescript
import jsforce from 'jsforce'

let cachedConn: jsforce.Connection | null = null
let connExpiresAt = 0

export async function getSalesforceConnection(): Promise<jsforce.Connection> {
  if (cachedConn && Date.now() < connExpiresAt) return cachedConn

  const conn = new jsforce.Connection({
    instanceUrl: process.env.SFDC_INSTANCE_URL,
    oauth2: {
      clientId: process.env.SFDC_CLIENT_ID!,
      clientSecret: process.env.SFDC_CLIENT_SECRET!,
      redirectUri: 'https://localhost',
    },
  })

  await conn.login(process.env.SFDC_USERNAME!, process.env.SFDC_PASSWORD!)

  cachedConn = conn
  connExpiresAt = Date.now() + 55 * 60 * 1000 // 55 min (token dura 2h no SF)
  return conn
}

export async function executeSoql(
  conn: jsforce.Connection,
  soql: string
): Promise<Record<string, unknown>[]> {
  const result = await conn.query(soql)
  return (result.records ?? []) as Record<string, unknown>[]
}

export async function testConnection(): Promise<{ ok: boolean; orgName?: string; error?: string }> {
  try {
    const conn = await getSalesforceConnection()
    const result = await conn.query<{ Name: string }>('SELECT Name FROM Organization LIMIT 1')
    return { ok: true, orgName: result.records[0]?.Name }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/salesforce/client.ts
git commit -m "feat: cliente Salesforce com cache de conexão e execução SOQL"
```

---

## Task 5: Serviço de sync (lógica de delta + inserção de transactions)

**Files:**
- Create: `lib/salesforce/sync.ts`

**Interfaces:**
- Consumes: `getSalesforceConnection()` e `executeSoql()` de `lib/salesforce/client.ts`, `createAdminClient()` de `lib/supabase/admin.ts`
- Produces:
  - `syncRule(ruleId, triggeredBy): Promise<SyncResult>` — sync de uma regra específica
  - `syncAllDueRules(triggeredBy): Promise<SyncResult[]>` — sync de todas regras cuja hora chegou
  - `type SyncResult = { rule_id: string; rule_name: string; inserted: number; skipped: number; errors: string[] }`

- [ ] **Step 1: Criar lib/salesforce/sync.ts**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { getSalesforceConnection, executeSoql } from './client'

export type SyncResult = {
  rule_id: string
  rule_name: string
  inserted: number
  skipped: number
  errors: string[]
}

export async function syncRule(ruleId: string, triggeredBy: string): Promise<SyncResult> {
  const admin = createAdminClient()
  const result: SyncResult = { rule_id: ruleId, rule_name: '', inserted: 0, skipped: 0, errors: [] }

  // Busca regra
  const { data: rule, error: ruleErr } = await admin
    .from('scoring_rules')
    .select('id, name, points, campaign_id, sf_soql, sf_value_field, sf_alias_field')
    .eq('id', ruleId)
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)
    .single()

  if (ruleErr || !rule) {
    result.errors.push(`Regra não encontrada ou não é do tipo Salesforce: ${ruleId}`)
    return result
  }

  result.rule_name = rule.name
  const aliasField = rule.sf_alias_field ?? 'Alias'
  const valueField = rule.sf_value_field!

  // Executa SOQL
  let sfRows: Record<string, unknown>[]
  try {
    const conn = await getSalesforceConnection()
    sfRows = await executeSoql(conn, rule.sf_soql!)
  } catch (err) {
    result.errors.push(`Erro SOQL: ${err instanceof Error ? err.message : String(err)}`)
    return result
  }

  // Busca usuários da campanha com sf_alias
  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id, users!user_id(sf_alias)')
    .eq('campaign_id', rule.campaign_id)

  type ParticipantRow = { user_id: string; users: { sf_alias: string | null } | null }
  const participantList = (participants ?? []) as unknown as ParticipantRow[]

  // Busca estados de sync atuais
  const userIds = participantList.map(p => p.user_id)
  const { data: syncStates } = await admin
    .from('salesforce_sync_state')
    .select('user_id, last_value')
    .eq('scoring_rule_id', ruleId)
    .in('user_id', userIds)

  const stateMap = new Map<string, number>(
    (syncStates ?? []).map(s => [s.user_id, Number(s.last_value)])
  )

  const today = new Date().toISOString().slice(0, 10)

  for (const sfRow of sfRows) {
    const alias = String(sfRow[aliasField] ?? '').trim()
    if (!alias) { result.skipped++; continue }

    const currentValue = Number(sfRow[valueField] ?? 0)
    const participant = participantList.find(p => p.users?.sf_alias === alias)
    if (!participant) { result.skipped++; continue }

    const lastValue = stateMap.get(participant.user_id) ?? 0
    const delta = currentValue - lastValue

    if (delta <= 0) { result.skipped++; continue }

    const pointsToAdd = Math.round(delta * rule.points) // points da regra = pts por unidade de valor

    // Insere transaction
    const { error: txErr } = await admin.from('point_transactions').insert({
      campaign_id: rule.campaign_id,
      user_id: participant.user_id,
      scoring_rule_id: rule.id,
      points: pointsToAdd,
      event_date: today,
      description: `Sync Salesforce — ${rule.name}`,
      origin: 'salesforce',
      created_by: triggeredBy,
    })

    if (txErr) {
      result.errors.push(`Erro ao inserir para ${alias}: ${txErr.message}`)
      continue
    }

    // Atualiza estado de sync
    await admin.from('salesforce_sync_state').upsert({
      scoring_rule_id: rule.id,
      user_id: participant.user_id,
      last_value: currentValue,
      last_synced_at: new Date().toISOString(),
    })

    result.inserted++
  }

  return result
}

export async function syncAllDueRules(triggeredBy: string): Promise<SyncResult[]> {
  const admin = createAdminClient()
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDay = now.getDay() // 0=domingo

  // Busca todas regras SF ativas
  const { data: rules } = await admin
    .from('scoring_rules')
    .select('id, sf_frequency, sf_run_time, sf_run_day')
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)

  const dueRules = (rules ?? []).filter(r => {
    if (r.sf_frequency === '5min') return true
    if (r.sf_frequency === 'daily') return r.sf_run_time?.slice(0, 5) === currentTime
    if (r.sf_frequency === 'weekly') return r.sf_run_day === currentDay && r.sf_run_time?.slice(0, 5) === currentTime
    return false
  })

  return Promise.all(dueRules.map(r => syncRule(r.id, triggeredBy)))
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/salesforce/sync.ts
git commit -m "feat: serviço de sync Salesforce com cálculo de delta e inserção de transações"
```

---

## Task 6: API routes de sync e teste de conexão

**Files:**
- Create: `app/api/integrations/salesforce/sync/route.ts`
- Create: `app/api/integrations/salesforce/test-connection/route.ts`

**Interfaces:**
- Consumes: `syncRule()`, `syncAllDueRules()` de `lib/salesforce/sync.ts`, `testConnection()` de `lib/salesforce/client.ts`
- Produces:
  - `POST /api/integrations/salesforce/sync` — aceita `{ rule_id?: string }` — se omitido, sincroniza todas as regras devidas
  - `POST /api/integrations/salesforce/test-connection` — testa credenciais SF

**Segurança:** O endpoint de sync aceita chamada de cron (header `Authorization: Bearer <CRON_SECRET>`) ou de gestor autenticado via sessão Supabase.

- [ ] **Step 1: Criar diretório**

```bash
mkdir -p "app/api/integrations/salesforce/sync"
mkdir -p "app/api/integrations/salesforce/test-connection"
```

- [ ] **Step 2: Criar app/api/integrations/salesforce/sync/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { syncRule, syncAllDueRules } from '@/lib/salesforce/sync'
import { NextResponse, type NextRequest } from 'next/server'

function isCronAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

async function isManagerAuthorized(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'manager' ? user.id : null
}

export async function POST(request: NextRequest) {
  // Verifica autorização: cron ou gestor
  let triggeredBy: string | null = null

  if (isCronAuthorized(request)) {
    // Usa um UUID fixo para "sistema" como created_by nas transações de cron
    triggeredBy = '00000000-0000-0000-0000-000000000001'
  } else {
    triggeredBy = await isManagerAuthorized()
  }

  if (!triggeredBy) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { rule_id?: string }

  if (body.rule_id) {
    const result = await syncRule(body.rule_id, triggeredBy)
    return NextResponse.json({ results: [result] })
  }

  const results = await syncAllDueRules(triggeredBy)
  return NextResponse.json({ results })
}
```

- [ ] **Step 3: Criar app/api/integrations/salesforce/test-connection/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { testConnection } from '@/lib/salesforce/client'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await testConnection()
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/api/integrations/salesforce/
git commit -m "feat: API routes para sync e teste de conexão Salesforce"
```

---

## Task 7: Configurar Vercel Cron Jobs

**Files:**
- Create (ou modify): `vercel.json`

**Interfaces:**
- Produces: cron jobs rodando `POST /api/integrations/salesforce/sync` conforme frequência

**Nota:** Vercel Cron Jobs rodam no plano Pro a cada 1 min no mínimo. Plano Free: 1x/dia. Para a frequência de 5 minutos funcionar no Free tier, o sync será chamado a cada 5 minutos mas só processará regras `5min`. Para Daily/Weekly, o cron de 5 min serve para checar horário configurado.

- [ ] **Step 1: Criar vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/integrations/salesforce/sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

O endpoint sync já filtra quais regras estão devidas com base no horário atual (`syncAllDueRules`), então um único cron a cada 5 minutos serve para todas as frequências.

- [ ] **Step 2: Adicionar CRON_SECRET ao Vercel**

No Vercel Dashboard → Settings → Environment Variables:
- `CRON_SECRET` = mesmo valor do `.env.local`
- `SFDC_INSTANCE_URL`, `SFDC_CLIENT_ID`, `SFDC_CLIENT_SECRET`, `SFDC_USERNAME`, `SFDC_PASSWORD`

O Vercel injetará `Authorization: Bearer <CRON_SECRET>` automaticamente nas chamadas de cron.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: vercel.json com cron job para sync Salesforce a cada 5 minutos"
```

---

## Task 8: Formulário de regra com campos Salesforce

**Files:**
- Modify: `components/campaign/RuleForm.tsx`
- Modify: `app/api/campaigns/[id]/rules/route.ts` — aceitar campos SF no POST
- Modify: `app/api/campaigns/[id]/rules/[ruleId]/route.ts` — aceitar campos SF no PATCH

**Interfaces:**
- Consumes: `salesforceRuleFieldsSchema` de `schemas/salesforce.ts`
- Produces: formulário com seção SF condicional, API salva os campos

- [ ] **Step 1: Abrir components/campaign/RuleForm.tsx**

Localizar o `import` do topo. Adicionar:

```typescript
import { salesforceRuleFieldsSchema } from '@/schemas/salesforce'
```

- [ ] **Step 2: Adicionar estado para campos SF**

No `useState` do form, adicionar campos SF ao estado inicial:

```typescript
const [form, setForm] = useState({
  name: '',
  description: '',
  points: '',
  category: 'goal',
  applies_to: 'all',
  target_value: '',
  target_period: '',
  // Salesforce
  data_origin: 'manual' as 'manual' | 'salesforce',
  sf_soql: '',
  sf_value_field: '',
  sf_alias_field: 'Alias',
  sf_frequency: '' as '5min' | 'daily' | 'weekly' | '',
  sf_run_time: '',
  sf_run_day: '' as string,
})
```

- [ ] **Step 3: Atualizar handleSubmit para incluir campos SF**

No `handleSubmit`, o objeto `body` deve incluir os campos SF:

```typescript
const body = {
  name: form.name,
  description: form.description || undefined,
  points: parseInt(form.points),
  category: form.category,
  applies_to: form.applies_to,
  target_value: form.target_value ? parseInt(form.target_value) : undefined,
  target_period: form.target_period || undefined,
  // Salesforce
  data_origin: form.data_origin,
  sf_soql: form.data_origin === 'salesforce' ? form.sf_soql || undefined : undefined,
  sf_value_field: form.data_origin === 'salesforce' ? form.sf_value_field || undefined : undefined,
  sf_alias_field: form.data_origin === 'salesforce' ? (form.sf_alias_field || 'Alias') : undefined,
  sf_frequency: form.data_origin === 'salesforce' ? form.sf_frequency || undefined : undefined,
  sf_run_time: form.data_origin === 'salesforce' && form.sf_run_time ? form.sf_run_time : undefined,
  sf_run_day: form.data_origin === 'salesforce' && form.sf_run_day !== '' ? parseInt(form.sf_run_day) : undefined,
}
```

- [ ] **Step 4: Adicionar seção SF no JSX do formulário**

Após o campo `target_period` e antes do campo `description`, adicionar:

```tsx
{/* Origem dos dados */}
<div className="space-y-1 col-span-2">
  <label style={labelStyle}>Origem dos dados</label>
  <select
    value={form.data_origin}
    onChange={e => setForm(f => ({ ...f, data_origin: e.target.value as 'manual' | 'salesforce' }))}
    style={selectStyle}
  >
    <option value="manual">Manual</option>
    <option value="salesforce">Salesforce</option>
  </select>
</div>

{/* Seção Salesforce — aparece apenas quando origem = salesforce */}
{form.data_origin === 'salesforce' && (
  <>
    <div className="space-y-1 col-span-2">
      <label style={labelStyle}>Query SOQL *</label>
      <textarea
        value={form.sf_soql}
        onChange={e => setForm(f => ({ ...f, sf_soql: e.target.value }))}
        rows={3}
        placeholder="SELECT Alias, SUM(Amount) total FROM Opportunity WHERE StageName='Closed Won' AND CALENDAR_MONTH(CloseDate) = CALENDAR_MONTH(TODAY) GROUP BY Alias"
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
        required
      />
      <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.45)' }}>
        A query deve retornar uma coluna de alias e uma coluna de valor numérico por usuário.
      </p>
    </div>
    <div>
      <label style={labelStyle}>Campo do valor *</label>
      <input
        value={form.sf_value_field}
        onChange={e => setForm(f => ({ ...f, sf_value_field: e.target.value }))}
        placeholder="total"
        style={inputStyle}
        required
      />
      <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.45)' }}>
        Nome exato da coluna no resultado que contém o valor numérico.
      </p>
    </div>
    <div>
      <label style={labelStyle}>Campo do alias</label>
      <input
        value={form.sf_alias_field}
        onChange={e => setForm(f => ({ ...f, sf_alias_field: e.target.value }))}
        placeholder="Alias"
        style={inputStyle}
      />
    </div>
    <div>
      <label style={labelStyle}>Frequência de sync *</label>
      <select
        value={form.sf_frequency}
        onChange={e => setForm(f => ({ ...f, sf_frequency: e.target.value as typeof f.sf_frequency }))}
        style={selectStyle}
        required
      >
        <option value="">Selecione...</option>
        <option value="5min">A cada 5 minutos</option>
        <option value="daily">1x por dia (horário)</option>
        <option value="weekly">1x por semana (dia + horário)</option>
      </select>
    </div>
    {(form.sf_frequency === 'daily' || form.sf_frequency === 'weekly') && (
      <div>
        <label style={labelStyle}>Horário</label>
        <input
          type="time"
          value={form.sf_run_time}
          onChange={e => setForm(f => ({ ...f, sf_run_time: e.target.value }))}
          style={inputStyle}
          required
        />
      </div>
    )}
    {form.sf_frequency === 'weekly' && (
      <div>
        <label style={labelStyle}>Dia da semana</label>
        <select
          value={form.sf_run_day}
          onChange={e => setForm(f => ({ ...f, sf_run_day: e.target.value }))}
          style={selectStyle}
          required
        >
          <option value="">Selecione...</option>
          <option value="0">Domingo</option>
          <option value="1">Segunda-feira</option>
          <option value="2">Terça-feira</option>
          <option value="3">Quarta-feira</option>
          <option value="4">Quinta-feira</option>
          <option value="5">Sexta-feira</option>
          <option value="6">Sábado</option>
        </select>
      </div>
    )}
  </>
)}
```

Onde `labelStyle`, `selectStyle`, `inputStyle` seguem o mesmo padrão do formulário existente.

- [ ] **Step 5: Atualizar API POST de regras para aceitar campos SF**

Abrir `app/api/campaigns/[id]/rules/route.ts`. Atualizar `ruleSchema` para incluir campos SF:

```typescript
import { salesforceRuleFieldsSchema } from '@/schemas/salesforce'

const ruleSchema = z.object({
  name: z.string().min(1),
  points: z.number().int(),
  applies_to: z.enum(['all', 'internal_seller', 'external_seller', 'hunter']),
  category: z.enum(['goal', 'activity', 'behavior', 'bonus', 'penalty']),
  description: z.string().optional(),
  target_value: z.number().int().optional(),
  target_period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  is_active: z.boolean().default(true),
}).merge(salesforceRuleFieldsSchema)
```

- [ ] **Step 6: Atualizar API PATCH de regras individuais**

Abrir `app/api/campaigns/[id]/rules/[ruleId]/route.ts`. Atualizar `updateRuleSchema` para incluir campos SF com `.optional()`:

```typescript
import { salesforceRuleFieldsSchema } from '@/schemas/salesforce'

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  points: z.number().int().optional(),
  description: z.string().optional(),
  applies_to: z.enum(['all', 'internal_seller', 'external_seller', 'hunter']).optional(),
  category: z.enum(['goal', 'activity', 'behavior', 'bonus', 'penalty']).optional(),
  target_value: z.number().int().optional(),
  target_period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  is_active: z.boolean().optional(),
}).merge(salesforceRuleFieldsSchema.partial())
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add components/campaign/RuleForm.tsx app/api/campaigns/
git commit -m "feat: campos Salesforce no formulário de regra e APIs de CRUD"
```

---

## Task 9: Campo sf_alias no formulário de usuário

**Files:**
- Modify: `components/users/UserForm.tsx`
- Modify: `app/api/users/[id]/route.ts` — já usa `userSchema.partial()`, sem mudança necessária se o schema foi atualizado

**Interfaces:**
- Consumes: `userSchema` atualizado com `sf_alias` de `schemas/user.ts`
- Produces: campo de texto "Alias Salesforce" no formulário de edição de usuário

- [ ] **Step 1: Adicionar estado sf_alias ao UserForm**

Abrir `components/users/UserForm.tsx`. Adicionar estado:

```typescript
const [sfAlias, setSfAlias] = useState(defaultValues?.sf_alias ?? '')
```

- [ ] **Step 2: Adicionar campo no JSX**

Após o campo de Time (teams), adicionar uma seção de integração:

```tsx
<div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(63,62,62,0.1)' }}>
  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(63,62,62,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
    Integração Salesforce
  </p>
  <div>
    <label style={labelStyle}>Alias no Salesforce</label>
    <input
      value={sfAlias}
      onChange={e => { setSfAlias(e.target.value); setValue('sf_alias', e.target.value || null) }}
      style={inputStyle}
      placeholder="jsmith"
    />
    <p style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)', marginTop: '0.2rem' }}>
      Alias exato do usuário no Salesforce (campo Alias do perfil). Usado para mapear resultados da SOQL.
    </p>
  </div>
</div>
```

- [ ] **Step 3: Incluir sf_alias no onSubmit**

O `react-hook-form` já inclui `sf_alias` no submit pois foi registrado via `setValue`. Verificar que `userSchema` tem o campo (feito na Task 3).

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/users/UserForm.tsx schemas/user.ts
git commit -m "feat: campo Alias Salesforce no cadastro de usuário"
```

---

## Task 10: Botão "Sync agora" na tela de detalhe da campanha

**Files:**
- Create: `components/campaign/SyncRuleButton.tsx`
- Modify: `app/(manager)/manager/campaigns/[id]/page.tsx` — exibir botão para regras SF

**Interfaces:**
- Consumes: `POST /api/integrations/salesforce/sync` com `{ rule_id }`
- Produces: botão por regra de origem SF, exibe resultado do sync (inserções/erros)

- [ ] **Step 1: Criar components/campaign/SyncRuleButton.tsx**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

export function SyncRuleButton({ ruleId, ruleName }: { ruleId: string; ruleName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    const res = await fetch('/api/integrations/salesforce/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId }),
    })
    const json = await res.json() as { results: Array<{ inserted: number; skipped: number; errors: string[] }> }
    setLoading(false)
    const r = json.results?.[0]
    if (!r) { toast.error('Erro no sync'); return }
    if (r.errors.length > 0) {
      toast.error(`Sync com erros: ${r.errors[0]}`)
    } else {
      toast.success(`${r.inserted} transação(ões) inserida(s) — ${r.skipped} sem delta`)
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      title={`Sincronizar "${ruleName}" agora`}
      style={{
        background: 'none', border: '1px solid rgba(141,178,60,0.3)',
        borderRadius: '0 0.3rem 0.3rem 0.3rem',
        padding: '0.2rem 0.5rem', cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.72rem', color: '#5C7435',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw size={11} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      {loading ? 'Sync...' : 'Sync'}
    </button>
  )
}
```

- [ ] **Step 2: Importar e usar na página de detalhe da campanha**

Abrir `app/(manager)/manager/campaigns/[id]/page.tsx`. Adicionar import:

```typescript
import { SyncRuleButton } from '@/components/campaign/SyncRuleButton'
```

Na linha onde renderiza os botões de cada regra (junto com `EditRuleButton` e `ToggleRuleButton`), adicionar condicionalmente para regras SF:

```tsx
{r.data_origin === 'salesforce' && (
  <SyncRuleButton ruleId={r.id} ruleName={r.name} />
)}
```

- [ ] **Step 3: Atualizar o tipo RuleRow na página para incluir data_origin**

Na mesma página, onde `type RuleRow` é definido, adicionar `data_origin`:

```typescript
type RuleRow = {
  id: string; name: string; points: number; target_period: string | null
  description: string | null; is_active: boolean; data_origin: string
}
```

E na query Supabase, adicionar `data_origin`:

```typescript
.select('id, name, points, target_period, description, is_active, data_origin')
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit e push**

```bash
git add components/campaign/SyncRuleButton.tsx app/(manager)/manager/campaigns/
git commit -m "feat: botão sync manual por regra Salesforce na tela da campanha"
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Origem dos dados: Manual / Salesforce → `data_origin` em scoring_rules (Task 2 + 8)
- ✅ Select SOQL configurável → campo `sf_soql` + `sf_value_field` + `sf_alias_field` (Task 2 + 8)
- ✅ Frequência 5min / diária (horário) / semanal (dia + horário) → campos `sf_frequency`, `sf_run_time`, `sf_run_day` (Task 2 + 8)
- ✅ Alias do usuário no Salesforce → campo `sf_alias` em users (Task 3 + 9)
- ✅ Sync automático via cron → Vercel Cron Jobs (Task 7)
- ✅ Sync manual → botão na tela da campanha (Task 10)
- ✅ Teste de conexão → endpoint `/api/integrations/salesforce/test-connection` (Task 6)

**2. Placeholder scan:** Nenhum TBD ou TODO encontrado. Todos os steps têm código completo.

**3. Type consistency:**
- `syncRule(ruleId, triggeredBy)` definido em Task 5, consumido em Task 6 e Task 10 → consistente
- `SyncResult` definido em Task 5, retornado em Task 6 → consistente
- `salesforceRuleFieldsSchema` definido em Task 3, importado em Tasks 8 → consistente
- `sf_alias` em `userSchema` (Task 3) corresponde ao campo do formulário (Task 9) → consistente
- `data_origin` em `ScoringRuleRow` (Task 2) corresponde ao uso em `sync.ts` (Task 5) → consistente

**Pré-requisitos que o usuário deve configurar manualmente:**
- Connected App no Salesforce (OAuth credenciais)
- Token de segurança Salesforce (Reset My Security Token)
- Variáveis de ambiente no Vercel (SFDC_*, CRON_SECRET)
- Executar migration 007 no Supabase Dashboard
- Criar usuário "sistema" com UUID `00000000-0000-0000-0000-000000000001` na tabela `auth.users` e `users` (ou adaptar o `triggeredBy` para o ID de um gestor real)
