# Salesforce Records Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a abordagem de SOQL agregado + delta por importação de registros individuais do Salesforce, com deduplicação por ID Salesforce e tela de auditoria no menu gerencial.

**Architecture:** Cada regra Salesforce passa a usar uma SOQL que retorna registros individuais (ex: `SELECT Id, Owner.Name, Owner.Alias, Account.Name, Description, CreatedDate FROM Task WHERE Subject = 'Chamada'`). Cada registro novo (nunca visto antes pelo `Id` SF) gera uma transação de pontos fixa (valor da regra). Os registros são persistidos na tabela `salesforce_records` para auditoria completa. O cálculo de delta e a tabela `salesforce_sync_state` são abandonados — a deduplicação é feita pelo `(scoring_rule_id, sf_id)` único.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + admin client), TypeScript, Salesforce REST API via jsforce

## Global Constraints

- Next.js 16: `params` é sempre `Promise<{...}>` — sempre `await params` em page.tsx
- Supabase: usar `createAdminClient()` para writes, `createClient()` para auth — NUNCA o contrário
- Estilos: sem Tailwind nas páginas/componentes novos — usar inline styles com as variáveis CSS do projeto (ver `app/(manager)/manager/campaigns/[id]/page.tsx` como referência)
- Brand shape: `borderRadius: '0 <r> <r> <r>'` (top-left sempre quadrado)
- Cores: primary `#8DB23C`, accent `#FFDF00`, text `#3F3E3E`
- Font: `var(--font-outfit, sans-serif)` para headings, sistema para body
- TypeScript: sem `any` — usar `unknown` e type guards
- Commits: mensagens em português, prefixo `feat:` / `fix:` / `refactor:`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/009_salesforce_records.sql` | Criar | Tabela `salesforce_records` |
| `types/database.ts` | Modificar | Adicionar `SalesforceRecordRow` e entrada no `Database` |
| `lib/salesforce/import.ts` | Criar | Lógica de importação individual (substitui delta) |
| `lib/salesforce/sync.ts` | Modificar | `syncRule` delega para `importRule`; remove logs debug |
| `schemas/salesforce.ts` | Modificar | Remove `sf_value_field` da validação obrigatória |
| `app/(manager)/manager/salesforce/page.tsx` | Criar | Tela de auditoria dos registros importados |
| `components/shared/ManagerNav.tsx` | Modificar | Adiciona item "Salesforce" no menu |
| `components/campaign/EditRuleButton.tsx` | Modificar | Remove campo `sf_value_field`; atualiza placeholder da SOQL |
| `components/campaign/RuleForm.tsx` | Modificar | Remove campo `sf_value_field`; atualiza placeholder da SOQL |

---

## Task 1: Migration — tabela salesforce_records

**Files:**
- Create: `supabase/migrations/009_salesforce_records.sql`

**Interfaces:**
- Produces: tabela `salesforce_records` disponível para Tasks 2, 3, 4

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/009_salesforce_records.sql

-- Registros individuais importados do Salesforce
-- Deduplicação via unique(scoring_rule_id, sf_id): cada registro SF só entra uma vez por regra
create table if not exists salesforce_records (
  id              uuid        primary key default gen_random_uuid(),
  scoring_rule_id uuid        not null references scoring_rules(id) on delete cascade,
  campaign_id     uuid        not null references campaigns(id) on delete cascade,
  sf_id           text        not null,                         -- Id do registro no Salesforce
  sf_created_at   timestamptz,                                  -- CreatedDate do SF
  imported_at     timestamptz not null default now(),
  owner_name      text,                                         -- Owner.Name
  sf_alias        text,                                         -- Owner.Alias (usado no match)
  account_name    text,                                         -- Account.Name / Nome da Conta
  description     text,                                         -- Description / Descrição
  user_id         uuid        references users(id),             -- null se alias não mapeado
  transaction_id  uuid        references point_transactions(id),-- null se sem participante
  unique(scoring_rule_id, sf_id)
);

create index if not exists idx_sf_records_rule
  on salesforce_records(scoring_rule_id, imported_at desc);

create index if not exists idx_sf_records_campaign
  on salesforce_records(campaign_id, imported_at desc);
```

- [ ] **Step 2: Rodar a migration no Supabase**

Abra o **Supabase → SQL Editor**, cole o conteúdo do arquivo acima e clique em **Run**.

Verificar: `select count(*) from salesforce_records;` deve retornar `0`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_salesforce_records.sql
git commit -m "feat: migration 009 — tabela salesforce_records para importação individual"
```

---

## Task 2: Tipos TypeScript — SalesforceRecordRow

**Files:**
- Modify: `types/database.ts`

**Interfaces:**
- Produces: `SalesforceRecordRow` exportado, usado em Tasks 3 e 4

- [ ] **Step 1: Adicionar o tipo e a entrada no Database**

Em `types/database.ts`, após a linha `export type SalesforceSyncStateRow = { ... }` (linha 124), adicionar:

```typescript
export type SalesforceRecordRow = {
  id: string
  scoring_rule_id: string
  campaign_id: string
  sf_id: string
  sf_created_at: string | null
  imported_at: string
  owner_name: string | null
  sf_alias: string | null
  account_name: string | null
  description: string | null
  user_id: string | null
  transaction_id: string | null
}
```

Na interface `Database`, dentro de `Tables`, adicionar após `salesforce_sync_state`:

```typescript
salesforce_records: { Row: SalesforceRecordRow; Insert: Partial<SalesforceRecordRow>; Update: Partial<SalesforceRecordRow>; Relationships: [] }
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat: tipo SalesforceRecordRow em database.ts"
```

---

## Task 3: Lógica de importação — lib/salesforce/import.ts

**Files:**
- Create: `lib/salesforce/import.ts`

**Interfaces:**
- Consumes: `createAdminClient()` de `@/lib/supabase/admin`, `getSalesforceConnection` + `executeSoql` de `./client`
- Produces: `importRule(ruleId: string, triggeredBy: string): Promise<ImportResult>`

```typescript
export type ImportResult = {
  rule_id: string
  rule_name: string
  inserted: number    // novos registros importados e pontos gerados
  skipped: number     // já existia no banco (sf_id duplicado) ou alias não mapeado
  errors: string[]
}
```

- [ ] **Step 1: Criar lib/salesforce/import.ts**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { getSalesforceConnection, executeSoql } from './client'

export type ImportResult = {
  rule_id: string
  rule_name: string
  inserted: number
  skipped: number
  errors: string[]
}

function getField(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  const lastKey = parts[parts.length - 1]
  if (lastKey in record) return record[lastKey]
  if (path in record) return record[path]
  return parts.reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, record)
}

export async function importRule(ruleId: string, triggeredBy: string): Promise<ImportResult> {
  const admin = createAdminClient()
  const result: ImportResult = { rule_id: ruleId, rule_name: '', inserted: 0, skipped: 0, errors: [] }

  const { data: rule, error: ruleErr } = await admin
    .from('scoring_rules')
    .select('id, name, points, campaign_id, sf_soql, sf_alias_field')
    .eq('id', ruleId)
    .eq('data_origin', 'salesforce')
    .eq('is_active', true)
    .single()

  if (ruleErr || !rule) {
    result.errors.push(`Regra não encontrada ou inativa: ${ruleId}`)
    return result
  }

  result.rule_name = rule.name
  const aliasField = rule.sf_alias_field ?? 'Owner.Alias'

  let sfRows: Record<string, unknown>[]
  try {
    const conn = await getSalesforceConnection()
    sfRows = await executeSoql(conn, rule.sf_soql!)
  } catch (err) {
    result.errors.push(`Erro SOQL: ${err instanceof Error ? err.message : String(err)}`)
    return result
  }

  // Participantes da campanha com seus sf_alias
  const { data: participants } = await admin
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', rule.campaign_id)

  const userIds = (participants ?? []).map(p => p.user_id)

  const { data: usersData } = await admin
    .from('users')
    .select('id, sf_alias')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  type ParticipantRow = { user_id: string; sf_alias: string | null }
  const participantList: ParticipantRow[] = (participants ?? []).map(p => ({
    user_id: p.user_id,
    sf_alias: usersData?.find(u => u.id === p.user_id)?.sf_alias ?? null,
  }))

  // IDs já importados para esta regra (evita re-checar individualmente)
  const sfIds = sfRows
    .map(r => String(r['Id'] ?? '').trim())
    .filter(Boolean)

  const { data: existing } = await admin
    .from('salesforce_records')
    .select('sf_id')
    .eq('scoring_rule_id', ruleId)
    .in('sf_id', sfIds.length > 0 ? sfIds : ['__none__'])

  const existingSet = new Set((existing ?? []).map(e => e.sf_id))

  const today = new Date().toISOString().slice(0, 10)

  for (const sfRow of sfRows) {
    const sfId = String(sfRow['Id'] ?? '').trim()
    if (!sfId) { result.skipped++; continue }

    // Deduplicação: já importado antes
    if (existingSet.has(sfId)) { result.skipped++; continue }

    const alias = String(getField(sfRow, aliasField) ?? '').trim()
    const ownerName = String(getField(sfRow, 'Owner.Name') ?? getField(sfRow, 'Name') ?? '').trim() || null
    const accountName = String(getField(sfRow, 'Account.Name') ?? sfRow['AccountName'] ?? '').trim() || null
    const description = String(sfRow['Description'] ?? sfRow['Subject'] ?? '').trim() || null
    const sfCreatedAt = sfRow['CreatedDate'] ? String(sfRow['CreatedDate']) : null

    const participant = alias ? participantList.find(p => p.sf_alias === alias) : undefined

    let transactionId: string | null = null

    if (participant) {
      const { data: tx, error: txErr } = await admin
        .from('point_transactions')
        .insert({
          campaign_id: rule.campaign_id,
          user_id: participant.user_id,
          scoring_rule_id: rule.id,
          points: rule.points,
          event_date: today,
          description: `SF Import — ${rule.name}${accountName ? ` (${accountName})` : ''}`,
          origin: 'salesforce',
          created_by: triggeredBy,
        })
        .select('id')
        .single()

      if (txErr) {
        result.errors.push(`Erro transação para ${alias}: ${txErr.message}`)
        continue
      }
      transactionId = tx?.id ?? null
    }

    // Registrar o record (mesmo sem participante, para auditoria)
    const { error: recErr } = await admin
      .from('salesforce_records')
      .insert({
        scoring_rule_id: rule.id,
        campaign_id: rule.campaign_id,
        sf_id: sfId,
        sf_created_at: sfCreatedAt,
        owner_name: ownerName,
        sf_alias: alias || null,
        account_name: accountName,
        description,
        user_id: participant?.user_id ?? null,
        transaction_id: transactionId,
      })

    if (recErr) {
      result.errors.push(`Erro ao salvar registro SF ${sfId}: ${recErr.message}`)
      continue
    }

    if (participant) result.inserted++
    else result.skipped++ // registrado mas sem participante mapeado
  }

  return result
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/salesforce/import.ts
git commit -m "feat: lib/salesforce/import.ts — importação individual com deduplicação por sf_id"
```

---

## Task 4: Atualizar sync.ts para usar importRule

**Files:**
- Modify: `lib/salesforce/sync.ts`

**Interfaces:**
- Consumes: `importRule` de `./import`
- Produces: `syncRule` mantém a mesma assinatura `(ruleId, triggeredBy) => Promise<SyncResult>` — compatível com `SyncRuleButton` e o route existente

- [ ] **Step 1: Reescrever sync.ts**

Substituir o conteúdo completo de `lib/salesforce/sync.ts` por:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { importRule, type ImportResult } from './import'

// SyncResult é compatível com ImportResult — mantém contrato com SyncRuleButton
export type SyncResult = ImportResult

export async function syncRule(ruleId: string, triggeredBy: string): Promise<SyncResult> {
  return importRule(ruleId, triggeredBy)
}

export async function syncAllDueRules(triggeredBy: string): Promise<SyncResult[]> {
  const admin = createAdminClient()
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDay = now.getDay()

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

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/salesforce/sync.ts
git commit -m "refactor: sync.ts delega para import.ts — remove lógica de delta e logs debug"
```

---

## Task 5: Atualizar formulários — remover sf_value_field, atualizar placeholder SOQL

**Files:**
- Modify: `components/campaign/RuleForm.tsx`
- Modify: `components/campaign/EditRuleButton.tsx`
- Modify: `schemas/salesforce.ts`

**Interfaces:**
- O campo `sf_value_field` existia na DB mas não é mais necessário no form — pode permanecer na DB sem ser enviado (valor antigo persiste inertemente)

- [ ] **Step 1: Atualizar schemas/salesforce.ts**

Substituir o conteúdo por:

```typescript
import { z } from 'zod'

export const salesforceRuleFields = z.object({
  data_origin: z.enum(['manual', 'salesforce']).default('manual'),
  sf_soql: z.string().min(10, 'SOQL muito curta').nullable().optional(),
  sf_alias_field: z.string().default('Owner.Alias'),
  sf_frequency: z.enum(['5min', 'daily', 'weekly']).nullable().optional(),
  sf_run_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  sf_run_day: z.number().int().min(0).max(6).nullable().optional(),
})

export const salesforceRuleFieldsSchema = salesforceRuleFields.superRefine((data, ctx) => {
  if (data.data_origin === 'salesforce') {
    if (!data.sf_soql) ctx.addIssue({ code: 'custom', path: ['sf_soql'], message: 'SOQL obrigatória quando origem é Salesforce' })
    if (!data.sf_frequency) ctx.addIssue({ code: 'custom', path: ['sf_frequency'], message: 'Frequência obrigatória' })
    if (data.sf_frequency === 'daily' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência diária' })
    if (data.sf_frequency === 'weekly' && !data.sf_run_time) ctx.addIssue({ code: 'custom', path: ['sf_run_time'], message: 'Horário obrigatório para frequência semanal' })
    if (data.sf_frequency === 'weekly' && data.sf_run_day == null) ctx.addIssue({ code: 'custom', path: ['sf_run_day'], message: 'Dia da semana obrigatório para frequência semanal' })
  }
})

export type SalesforceRuleFields = z.infer<typeof salesforceRuleFieldsSchema>
```

- [ ] **Step 2: Ler RuleForm.tsx para encontrar o bloco de sf_value_field**

Abra `components/campaign/RuleForm.tsx` e localize o campo `sf_value_field`. Remova o bloco `<div>` completo que contém `sf_value_field` (label "Campo do valor" + input). Atualize o placeholder da textarea da SOQL para:

```
SELECT Id, Owner.Name, Owner.Alias, Account.Name, Description, CreatedDate
FROM Task
WHERE Subject = 'Chamada'
```

Também atualize o texto de ajuda da SOQL para:
```
A query deve retornar registros individuais com: Id, Owner.Alias (para match), e opcionalmente Owner.Name, Account.Name, Description, CreatedDate.
```

- [ ] **Step 3: Aplicar mesmas mudanças em EditRuleButton.tsx**

Em `components/campaign/EditRuleButton.tsx`:
- Remover do estado `form`: `sf_value_field`
- Remover do `payload`: `sf_value_field`
- Remover o bloco `<div>` do campo "Campo do valor *"
- Atualizar o grid de 2 colunas (sf_value_field + sf_alias_field) para apenas 1 coluna com sf_alias_field
- Atualizar placeholder e texto de ajuda da SOQL igual ao Step 2

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add schemas/salesforce.ts components/campaign/RuleForm.tsx components/campaign/EditRuleButton.tsx
git commit -m "feat: remove sf_value_field dos forms — SOQL agora retorna registros individuais"
```

---

## Task 6: Tela de auditoria Salesforce — /manager/salesforce

**Files:**
- Create: `app/(manager)/manager/salesforce/page.tsx`

**Interfaces:**
- Consumes: `createClient()` de `@/lib/supabase/server`, `requireRole` de `@/lib/auth/helpers`
- Produces: página server component acessível em `/manager/salesforce`

- [ ] **Step 1: Criar app/(manager)/manager/salesforce/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CloudDownload } from 'lucide-react'

type RecordRow = {
  id: string
  sf_id: string
  sf_created_at: string | null
  imported_at: string
  owner_name: string | null
  sf_alias: string | null
  account_name: string | null
  description: string | null
  user_id: string | null
  transaction_id: string | null
  scoring_rules: { name: string; campaign_id: string } | null
  campaigns: { name: string } | null
}

type Props = { searchParams: Promise<{ campaign_id?: string; rule_id?: string }> }

export default async function SalesforceImportsPage({ searchParams }: Props) {
  await requireRole('manager')
  const { campaign_id, rule_id } = await searchParams
  const supabase = await createClient()

  // Campanhas para filtro
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .order('created_at', { ascending: false })

  // Regras para filtro (filtradas pela campanha se selecionada)
  let rulesQuery = supabase
    .from('scoring_rules')
    .select('id, name, campaign_id')
    .eq('data_origin', 'salesforce')
    .order('created_at', { ascending: false })
  if (campaign_id) rulesQuery = rulesQuery.eq('campaign_id', campaign_id)
  const { data: rules } = await rulesQuery

  // Registros importados
  let recordsQuery = supabase
    .from('salesforce_records')
    .select('id, sf_id, sf_created_at, imported_at, owner_name, sf_alias, account_name, description, user_id, transaction_id, scoring_rules(name, campaign_id), campaigns(name)')
    .order('imported_at', { ascending: false })
    .limit(200)
  if (rule_id) recordsQuery = recordsQuery.eq('scoring_rule_id', rule_id)
  else if (campaign_id) recordsQuery = recordsQuery.eq('campaign_id', campaign_id)

  const { data: recordsRaw } = await recordsQuery
  const records = (recordsRaw ?? []) as unknown as RecordRow[]

  const thStyle: React.CSSProperties = {
    padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.72rem',
    fontWeight: 600, color: 'rgba(63,62,62,0.5)',
    borderBottom: '1px solid rgba(63,62,62,0.08)', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#3F3E3E',
    borderBottom: '1px solid rgba(63,62,62,0.06)', verticalAlign: 'top',
  }

  return (
    <div>
      <div className="sc-page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: '0 0.5rem 0.5rem 0.5rem', background: 'rgba(141,178,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudDownload size={18} color="#8DB23C" />
          </div>
          <div>
            <h1 className="sc-page-title">Importações Salesforce</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(63,62,62,0.45)', fontFamily: 'var(--font-outfit, sans-serif)', marginTop: '0.1rem' }}>
              {records.length} registro(s) exibido(s)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-7xl">
        {/* Filtros */}
        <form method="GET" className="flex gap-3 flex-wrap">
          <select
            name="campaign_id"
            defaultValue={campaign_id ?? ''}
            onChange={(e) => (e.currentTarget.form as HTMLFormElement).submit()}
            style={{ border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">Todas as campanhas</option>
            {(campaigns ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            name="rule_id"
            defaultValue={rule_id ?? ''}
            style={{ border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#3F3E3E', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">Todas as regras</option>
            {(rules ?? []).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem', background: '#8DB23C', color: '#fff', border: 'none', borderRadius: '0 0.4rem 0.4rem 0.4rem', cursor: 'pointer' }}>
            Filtrar
          </button>
          {(campaign_id || rule_id) && (
            <a href="/manager/salesforce" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem', color: 'rgba(63,62,62,0.5)', border: '1px solid rgba(63,62,62,0.15)', borderRadius: '0 0.4rem 0.4rem 0.4rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Limpar
            </a>
          )}
        </form>

        {/* Tabela */}
        {records.length === 0 ? (
          <div className="sc-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(63,62,62,0.4)' }}>Nenhum registro importado ainda. Clique em "Sync SF" em uma regra Salesforce para importar.</p>
          </div>
        ) : (
          <div className="sc-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(63,62,62,0.02)' }}>
                    <th style={thStyle}>Data SF</th>
                    <th style={thStyle}>Importado em</th>
                    <th style={thStyle}>Proprietário</th>
                    <th style={thStyle}>Alias SF</th>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Regra</th>
                    <th style={thStyle}>Pontos</th>
                    <th style={thStyle}>ID Salesforce</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ background: r.transaction_id ? 'transparent' : 'rgba(255,220,0,0.04)' }}>
                      <td style={tdStyle}>
                        {r.sf_created_at
                          ? format(new Date(r.sf_created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>}
                      </td>
                      <td style={tdStyle}>{format(new Date(r.imported_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</td>
                      <td style={tdStyle}>{r.owner_name ?? <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>}</td>
                      <td style={tdStyle}>
                        <code style={{ fontSize: '0.72rem', background: 'rgba(141,178,60,0.08)', padding: '0.1rem 0.35rem', borderRadius: '0 0.25rem 0.25rem 0.25rem' }}>
                          {r.sf_alias ?? '—'}
                        </code>
                      </td>
                      <td style={tdStyle}>{r.account_name ?? <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>}</td>
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.description ?? <span style={{ color: 'rgba(63,62,62,0.3)' }}>—</span>}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(63,62,62,0.55)' }}>
                          {r.scoring_rules?.name ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {r.transaction_id
                          ? <span style={{ color: '#5C7435', fontWeight: 600, fontSize: '0.8rem' }}>✓ pts</span>
                          : <span style={{ color: 'rgba(63,62,62,0.35)', fontSize: '0.75rem' }}>sem match</span>}
                      </td>
                      <td style={tdStyle}>
                        <code style={{ fontSize: '0.68rem', color: 'rgba(63,62,62,0.4)' }}>{r.sf_id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(manager)/manager/salesforce/page.tsx"
git commit -m "feat: tela /manager/salesforce com tabela de registros importados do Salesforce"
```

---

## Task 7: ManagerNav — adicionar item Salesforce

**Files:**
- Modify: `components/shared/ManagerNav.tsx`

- [ ] **Step 1: Adicionar item no nav**

Em `components/shared/ManagerNav.tsx`, na linha 1 (import), adicionar `CloudDownload` ao import do lucide-react:

```typescript
import { LayoutDashboard, Trophy, Users, Target, History, Upload, BarChart3, Palette, CloudDownload } from 'lucide-react'
```

No array `navItems`, após o item `Temas`, adicionar:

```typescript
{ href: '/manager/salesforce', label: 'Salesforce', icon: CloudDownload },
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit e push**

```bash
git add components/shared/ManagerNav.tsx
git commit -m "feat: item Salesforce no menu gerencial"
git push origin main
```

---

## Verificação Final

Após o deploy no Vercel:

1. **Rodar a migration 009** no Supabase SQL Editor (Task 1, Step 2)

2. **Atualizar a SOQL da regra "Contatos Feitos"** em Campanhas → Missão Hexa → Editar regra → trocar a SOQL para:
   ```sql
   SELECT Id, Owner.Name, Owner.Alias, Account.Name, Description, CreatedDate
   FROM Task
   WHERE Subject = 'Chamada'
   ```
   E mudar o campo **"Campo do alias"** para `Owner.Alias`

3. **Clicar Sync SF** na regra — deve inserir registros novos

4. **Abrir /manager/salesforce** — deve mostrar a tabela com os registros importados (Proprietário, Alias, Cliente, Data SF, ID SF)

5. **Clicar Sync SF de novo** — deve mostrar 0 inseridos (todos já existem pelo sf_id)

---

## Self-Review

**Spec coverage:**
- ✅ Tabela com: Data Criação SF, Data Importação, Proprietário, Alias SF, Nome da Conta, Descrição, ID Salesforce
- ✅ Deduplicação por ID Salesforce
- ✅ Pontos ajustados por registro individual
- ✅ Tela no menu

**Placeholder scan:** Nenhum TBD/TODO encontrado.

**Type consistency:** `ImportResult` = `SyncResult` — contrato com `SyncRuleButton` mantido.
