# Manager Dashboard Redesign — Spec

## Goal

Redesenhar o dashboard do gestor para ter visual rico e informativo — inspirado no dashboard do participante, mas mostrando todos os participantes da campanha selecionada, com um drawer lateral de detalhes ao clicar em qualquer um.

---

## Contexto

**Dashboard atual do gestor** (`app/(manager)/manager/dashboard/page.tsx`):
- 4 stat cards simples, lista de inativos, feed de lançamentos recentes
- Sem seletor de campanha, sem fotos, sem metas, sem streak

**Dashboard do participante** (`app/(participant)/participant/dashboard/page.tsx`):
- Hero card com foto + nome + nível + streak
- 3 stats animados (pontos, posição, sequência)
- Barras de progresso de metas (`GoalProgressBar`)
- Histórico de pontos (`PointsHistory`)

**Componentes reutilizáveis disponíveis:**
- `GoalProgressBar` — barra de progresso de meta (label, actual, target, valueType, decimalPlaces, periodLabel)
- `PointsHistory` — lista de transações recentes
- `AnimatedCounter` — contador animado (client component)
- `LevelBadge` — badge de nível (nome + ícone + cor)
- `StreakBadge` — badge de sequência
- `getRanking(supabase, { campaign_id })` — retorna `CampaignRanking[]` com posição, pontos, streak, avatar_url, team_color, etc.

---

## Arquitetura

### Arquivos modificados / criados

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/(manager)/manager/dashboard/page.tsx` | Modificar | Server component — busca campanhas, participantes, KPIs; renderiza shell |
| `components/manager/DashboardParticipantList.tsx` | Criar | Client component — lista de participantes + estado do drawer |
| `components/manager/ParticipantDrawer.tsx` | Criar | Client component — drawer lateral com detalhes do participante |
| `app/api/manager/participant-details/[userId]/route.ts` | Criar | API route — retorna goals + points history + ranking info de um participante numa campanha |

---

## Seção 1 — Topo da página (Server)

### Seletor de campanha
- `searchParams.campaign_id` determina a campanha exibida
- Se não informado, usa a primeira campanha ativa
- `<select>` com `onChange` via router push (não precisa de form submit) — client component simples embutido no topo

### KPI Cards (3 cards em linha)
Dados buscados no server:

| Card | Dado | Ícone |
|---|---|---|
| Participantes | `count` de `campaign_participants` onde `campaign_id` | 👥 Users |
| Pontos hoje | `sum(points)` de `point_transactions` com `event_date = today` e `campaign_id` | ⚡ Zap |
| Inativos | count de `campaign_participants` com `last_activity_date < today - 3 days` | ⚠ AlertTriangle |

Visual: mesmos `sc-card` existentes, sem mudança de estilo.

---

## Seção 2 — Lista de participantes (`DashboardParticipantList`)

**Props recebidas do server:**
```typescript
type ParticipantRow = {
  user_id: string
  name: string
  avatar_url: string | null
  position: number
  total_points: number
  current_streak: number
  team_name: string | null
  team_color: string | null
  function: string | null
  // metas do dia: mini preview (até 2 regras)
  goals: { rule_name: string; actual: number; target: number }[]
}
```

O server passa `ParticipantRow[]` pré-computado para o client component.

**Layout de cada linha:**

```
[ Pos ] [ Avatar 44px ] [ Nome + equipe/função ]  [ pts ]  [ 🔥N ]  [ mini-goals ]  [ > ]
```

- **Posição**: 🥇🥈🥉 para top 3, número puro para os demais
- **Avatar**: componente inline com `objectPosition: top center`, border-radius SC Mídia, 44px
- **Nome**: bold; abaixo em pequeno: equipe (badge colorido) ou função
- **Pontos**: destaque verde (`#8DB23C`), font Outfit 700
- **Streak**: 🔥 + número, laranja, só aparece se `current_streak > 0`
- **Mini-goals**: até 2 barras de progresso minimalistas (sem label, só porcentagem visual), 60px de largura cada
- **Chevron**: `>` sutil para indicar que é clicável
- **Linha 1º lugar**: fundo `rgba(255,223,0,0.06)`, borda `rgba(255,223,0,0.2)`
- Hover: fundo levemente destacado, cursor pointer

**Interação:** clicar em qualquer linha define `selectedUserId` no estado local e abre o drawer.

---

## Seção 3 — Drawer lateral (`ParticipantDrawer`)

**Comportamento:**
- Posição: `fixed`, direita, `top: 0`, `height: 100vh`, `width: 420px`
- Animação: `transform: translateX(100%)` → `translateX(0)` em 250ms ease
- Overlay: fundo semitransparente cobrindo a lista (clique fecha o drawer)
- Botão X no canto superior direito fecha o drawer
- Tecla Escape fecha o drawer

**Dados:** chamada `GET /api/manager/participant-details/[userId]?campaign_id=xxx` quando `selectedUserId` muda. Mostra loading skeleton enquanto carrega.

**Layout interno do drawer:**

```
┌─────────────────────────────┐
│ [X]                         │
│                             │
│  [Foto 80px]  Nome          │
│               Nível badge   │
│               🔥 Streak     │
│                             │
│  [ Pts totais ] [#Pos] [🔥] │
│                             │
│  ── Metas ──                │
│  [GoalProgressBar x N]      │
│                             │
│  ── Últimos pontos ──       │
│  [PointsHistory]            │
│                             │
│  [Ver painel completo ↗]    │
└─────────────────────────────┘
```

**Dados do drawer (retornados pela API):**
- `name`, `avatar_url`, `total_points`, `position`, `current_streak`
- `level`: `{ name, badge_icon, color }` (nível atual)
- `goals`: array de `{ id, rule_name, actual_value, target_value, value_type, decimal_places, target_period, is_cumulative, period_date }`
- `recentPoints`: últimas 8 transações `{ id, points, event_date, description, rule_name }`

---

## Seção 4 — API Route (`/api/manager/participant-details/[userId]`)

**Auth:** requer role `manager` via `createClient()` + `requireRole`.

**Query params:** `campaign_id` (obrigatório).

**Queries paralelas:**
1. `campaign_rankings` → posição, pontos totais, streak, avatar_url
2. `levels` → nível atual (max `min_points <= total_points`)
3. `participant_goals` → metas do mês corrente com `scoring_rules`
4. `point_transactions` → últimas 8, `status = active`, com `scoring_rules(name)`
5. `campaign_participants` → `photo_url` (foto da campanha, prioridade sobre avatar)
6. `users` → `name`, `function`

**Lógica de metas:** mesma do `participant/dashboard/page.tsx` — deduplica por regra, trata acumulado/mensal/diário.

**Resposta JSON:**
```typescript
{
  name: string
  avatar_url: string | null
  total_points: number
  position: number | null
  current_streak: number
  level: { name: string; badge_icon: string; color: string } | null
  goals: GoalItem[]
  recentPoints: PointItem[]
}
```

---

## Fluxo de dados

```
page.tsx (server)
  ├── busca campanhas ativas
  ├── busca campaign_rankings (posição, pts, streak, avatar)
  ├── busca participant_goals do mês p/ mini-goals (até 2 por user)
  ├── busca KPIs (count participantes, pts hoje, inativos)
  └── renderiza DashboardParticipantList (client)
        ├── estado: selectedUserId, drawerOpen
        ├── ao clicar: abre drawer + fetch /api/manager/participant-details/[userId]
        └── renderiza ParticipantDrawer (com dados carregados)
```

---

## Decisões de design

- **Tema**: página do gestor usa tema claro (padrão da área do gestor — fundo branco, cores SC Mídia). Não usa o tema dark do participante.
- **Foto**: prioriza `campaign_participants.photo_url`; fallback para `users.avatar_url`; fallback para inicial com fundo verde SC Mídia.
- **Metas no drawer**: usa os mesmos componentes `GoalProgressBar` já existentes — nenhum componente novo de UI necessário.
- **Mini-goals na lista**: barras simples inline (não usa `GoalProgressBar`) — apenas `div` com largura relativa, para caber na linha. Exibe as 2 primeiras regras com meta diária para hoje; se não houver, as 2 primeiras regras com meta mensal. Se não houver nenhuma, omite a coluna.
- **Paginação**: não necessária — campanhas tipicamente têm ≤ 50 participantes.
- **Responsividade**: drawer ocupa 100% da largura em telas < 640px (mobile).

---

## Constraints

- Next.js App Router (server + client components separados)
- Supabase (admin client na API route, server client no page)
- Reutilizar `GoalProgressBar`, `PointsHistory`, `LevelBadge`, `StreakBadge`, `AnimatedCounter` sem modificá-los
- Seguir padrão visual SC Mídia: border-radius `0 X X X`, cores Apple Green `#8DB23C`, Onyx `#3F3E3E`
- Sem dependências novas
