# Sistema de Gamificação Comercial — SCMídia
## Design Técnico v2.0
**Data:** 2026-06-25  
**Campanha inicial:** Missão Hexa  
**Status:** Aprovado para implementação

---

## 1. Visão Geral

Sistema web interno de gamificação para o time comercial da SCMídia. Permite que gestores criem campanhas temáticas com critérios de pontuação, lancem pontos manualmente e acompanhem performance. Participantes visualizam seu painel pessoal, ranking, histórico de pontos e conquistas.

A campanha inicial é a **Missão Hexa** — temática de Copa do Mundo Comercial. A estrutura é genérica o suficiente para reutilizar em campanhas futuras trocando apenas o tema visual (JSON) e os critérios, sem alterar código.

---

## 2. Stack e Arquitetura

### Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Banco de dados | Supabase (PostgreSQL + Row Level Security) |
| Autenticação | Supabase Auth + Google OAuth (restrito a @scmidia.com.br) |
| Storage | Supabase Storage (avatares, banners, anexos) |
| Real-time | Supabase Realtime (3 canais: rankings, feed_events, celebrations) |
| Deploy | Vercel com CD automático via GitHub |

### Diagrama

```
┌─────────────────────────────────────────────────────────┐
│                        VERCEL                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              NEXT.JS 15 (App Router)            │   │
│  │  /(auth)  /(manager)  /(participant)  /display  │   │
│  │  /api/*                                         │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                       SUPABASE                          │
│  PostgreSQL + RLS  │  Auth (Google)  │  Storage         │
│  Realtime (3 canais)                                    │
└─────────────────────────────────────────────────────────┘
```

### Decisões técnicas

- **Auth flow:** Login com Google → Supabase valida domínio `@scmidia.com.br` → cria/atualiza registro em `users` → redireciona para dashboard correto por `role`.
- **Segurança em duas camadas:** Middleware Next.js verifica sessão e `role`; RLS no Supabase bloqueia acesso direto ao banco.
- **Realtime strategy:** Três canais independentes:
  - `rankings` — atualiza ranking ao vivo quando ponto é lançado
  - `feed_events` — feed de atividades da campanha
  - `celebrations` — dispara animações no painel TV
- **Tema visual por campanha:** Campo `theme` (jsonb) em `campaigns` com cores, fontes e assets. CSS variables aplicadas dinamicamente — trocar tema = trocar JSON, sem código.
- **Ranking sem tabela própria:** Sempre computado via view para garantir consistência e eliminar sync bugs.

---

## 3. Estrutura de Rotas

```
/(auth)
  /login                          → Google OAuth

/(manager)
  /dashboard                      → visão geral, alertas, lançamentos recentes
  /campaigns                      → listar campanhas
  /campaigns/new                  → criar campanha
  /campaigns/[id]                 → detalhe da campanha
  /campaigns/[id]/edit            → editar campanha
  /campaigns/[id]/participants    → gerenciar participantes vinculados
  /campaigns/[id]/rules           → critérios de pontuação + exceções
  /campaigns/[id]/bonuses         → configurar bônus e conquistas
  /campaigns/[id]/levels          → configurar níveis (Rookie → Lenda)
  /users                          → listar e gerenciar usuários
  /users/new                      → cadastrar usuário
  /users/[id]                     → perfil completo do usuário
  /points                         → lançar pontos individual
  /points/import                  → importar CSV/Excel em lote
  /points/history                 → auditoria completa
  /rankings                       → rankings com filtros
  /rankings/export                → exportar ranking

/(participant)
  /dashboard                      → painel pessoal
  /ranking                        → ranking com filtros
  /history                        → histórico de pontos
  /profile                        → perfil com badges e conquistas
  /feed                           → feed de atividades

/display/[slug]?token=xxx         → painel TV (sem autenticação)

/api
  /points/create
  /points/import
  /points/[id]/edit
  /points/[id]/reverse
  /campaigns/*
  /users/*
  /rankings/*
  /notifications/read
  /celebrations/trigger
```

---

## 4. Modelo de Dados

### Tabelas

```sql
-- Times/Verticais
teams
  id          uuid PK
  name        text          -- Mobile, Têxtil, Comunicação Visual
  color       text          -- cor hex
  created_at  timestamptz

-- Usuários (espelha auth.users)
users
  id          uuid PK       -- = auth.users.id
  name        text
  email       text UNIQUE
  avatar_url  text
  role        enum('manager', 'participant')
  team_id     uuid FK → teams
  function    enum('internal_seller','external_seller',
                   'hunter','manager','auditor')
  status      enum('active','inactive')
  created_at  timestamptz
  updated_at  timestamptz

-- Campanhas
campaigns
  id             uuid PK
  name           text
  slug           text UNIQUE   -- URL do painel TV
  description    text
  rules          text
  prizes         text
  banner_url     text
  theme          jsonb         -- { primary, secondary, accent, font, assets, animations }
  status         enum('draft','active','closed')
  starts_at      timestamptz
  ends_at        timestamptz
  display_token  text          -- token para URL pública do painel TV
  created_by     uuid FK → users
  created_at     timestamptz
  updated_at     timestamptz

-- Participantes da campanha
campaign_participants
  id                 uuid PK
  campaign_id        uuid FK → campaigns
  user_id            uuid FK → users
  joined_at          timestamptz
  current_streak     integer DEFAULT 0
  longest_streak     integer DEFAULT 0
  last_activity_date date
  UNIQUE(campaign_id, user_id)

-- Níveis por campanha
levels
  id           uuid PK
  campaign_id  uuid FK → campaigns
  name         text      -- "Rookie", "Craque", "Artilheiro", "Lenda"
  min_points   integer
  badge_icon   text
  color        text
  perks        jsonb
  order        integer

-- Critérios de pontuação
scoring_rules
  id             uuid PK
  campaign_id    uuid FK → campaigns
  name           text
  description    text
  points         integer     -- positivo ou negativo
  applies_to     enum('all','internal_seller','external_seller','hunter')
  category       enum('goal','activity','behavior','bonus','penalty')
  target_value   integer     -- quantidade alvo (ex: 5 ligações)
  target_period  enum('daily','weekly','monthly')
  is_active      boolean DEFAULT true
  created_at     timestamptz

-- Exceções por usuário
scoring_rule_exceptions
  id               uuid PK
  scoring_rule_id  uuid FK → scoring_rules
  user_id          uuid FK → users
  points_override  integer   -- ex: Victor = 30pts na meta diária
  reason           text

-- Lançamentos de pontos
point_transactions
  id               uuid PK
  campaign_id      uuid FK → campaigns
  user_id          uuid FK → users
  scoring_rule_id  uuid FK → scoring_rules  -- nullable
  points           integer
  event_date       date
  description      text
  attachment_url   text
  origin           enum('manual','salesforce','sap')
  status           enum('active','reversed')
  import_batch_id  uuid      -- agrupa lançamentos do mesmo CSV
  created_by       uuid FK → users
  created_at       timestamptz

-- Auditoria de pontos
point_audit_logs
  id                uuid PK
  transaction_id    uuid FK → point_transactions
  action            enum('created','edited','reversed')
  changed_by        uuid FK → users
  previous_points   integer
  new_points        integer
  reason            text
  created_at        timestamptz

-- Bônus e conquistas
bonuses
  id              uuid PK
  campaign_id     uuid FK → campaigns
  name            text
  description     text
  points          integer
  badge_icon      text
  trigger_type    enum('manual','automatic')
  trigger_config  jsonb     -- { type: "streak", value: 5 }
  created_at      timestamptz

-- Bônus conquistados
user_bonuses
  id              uuid PK
  bonus_id        uuid FK → bonuses
  user_id         uuid FK → users
  campaign_id     uuid FK → campaigns
  awarded_at      timestamptz
  awarded_by      uuid FK → users
  transaction_id  uuid FK → point_transactions

-- Feed de atividades (populado por triggers Postgres)
feed_events
  id           uuid PK
  campaign_id  uuid FK → campaigns
  user_id      uuid FK → users
  event_type   enum('point_earned','level_up','bonus_earned',
                    'streak_milestone','ranking_change',
                    'campaign_start','campaign_end')
  payload      jsonb
  created_at   timestamptz

-- Eventos de celebração (painel TV)
celebration_events
  id           uuid PK
  campaign_id  uuid FK → campaigns
  user_id      uuid FK → users
  points       integer
  rule_name    text
  message      text
  triggered_at timestamptz

-- Notificações in-app
notifications
  id           uuid PK
  user_id      uuid FK → users
  campaign_id  uuid FK → campaigns
  type         enum('point_earned','level_up','bonus_earned',
                    'streak_warning','ranking_up','system')
  title        text
  body         text
  read_at      timestamptz
  created_at   timestamptz
```

### View de Ranking

```sql
CREATE VIEW campaign_rankings AS
SELECT
  cp.campaign_id,
  cp.user_id,
  u.name,
  u.avatar_url,
  t.name          AS team_name,
  t.color         AS team_color,
  u.function,
  COALESCE(SUM(pt.points) FILTER (
    WHERE pt.status = 'active'
  ), 0)           AS total_points,
  cp.current_streak,
  RANK() OVER (
    PARTITION BY cp.campaign_id
    ORDER BY COALESCE(SUM(pt.points) FILTER (
      WHERE pt.status = 'active'
    ), 0) DESC
  )               AS position
FROM campaign_participants cp
JOIN users u ON u.id = cp.user_id
LEFT JOIN teams t ON t.id = u.team_id
LEFT JOIN point_transactions pt
  ON pt.user_id = cp.user_id
  AND pt.campaign_id = cp.campaign_id
GROUP BY cp.campaign_id, cp.user_id, u.name,
         u.avatar_url, t.name, t.color,
         u.function, cp.current_streak;
```

---

## 5. Telas do Sistema

### Gestor

| Tela | Conteúdo |
|---|---|
| Dashboard | Cards de resumo (participantes, pontos hoje, campanhas ativas). Alertas de participantes sem pontuação há +3 dias. Lançamentos recentes. Evolução semanal por time. |
| Campanhas | Lista com status, banner, datas, participantes. Ações: criar, editar, encerrar. |
| Detalhe da Campanha | Tabs: Visão geral / Participantes / Critérios / Bônus / Níveis / Painel TV. |
| Usuários | Tabela filtrável por time/função/status. |
| Lançar Pontos | Form com preview antes de confirmar. Participante + critério (auto-preenche pontos) + data + observação + anexo. |
| Importar CSV | Upload → preview em tabela com validação linha a linha → confirmar lote. |
| Auditoria | Tabela de todos os lançamentos. Filtros por período, participante, origem. |
| Rankings | Tabs: Geral / Por time / Por função / Semanal / Mensal. Top 3 em destaque. Exportar. |

### Participante

| Tela | Conteúdo |
|---|---|
| Dashboard | Pontuação total + posição + nível + streak. Progress bars dos critérios da semana. Bônus conquistados. Comparativo com média do time. |
| Ranking | Ranking com filtros. Posição própria destacada. |
| Histórico | Lista cronológica: data, critério, pontos, motivo, origem. |
| Feed | Stream de atividades da campanha em tempo real via Realtime. |
| Perfil | Foto, nível, streak, badges, evolução histórica. |

### Painel TV `/display/[slug]?token=xxx`

- Sem autenticação — protegido por token na URL
- Rotação automática a cada 15s: Ranking Geral → Ranking por Time → Top 3 Spotlight → Feed
- Countdown para fim da campanha
- Quando `celebration_events` dispara: interrompe rotação com animação full-screen (foto do participante, nome, pontos, confete)
- Polling de fallback a cada 30s além do Realtime
- Design landscape-first, tipografia grande, alto contraste

---

## 6. Fluxos de Usuário

### Gestor

```
Login Google (@scmidia.com.br)
  → Dashboard
  → Criar Campanha (nome, tema, datas, regras, premiação, banner)
  → Configurar Critérios (pontos por função + exceções individuais)
  → Configurar Níveis (Rookie / Craque / Artilheiro / Lenda)
  → Configurar Bônus (manuais e automáticos por trigger)
  → Vincular Participantes
  → Ativar Campanha
  → Gerar URL do Painel TV
  → [Ciclo diário] Lançar pontos (individual ou CSV)
    → Painel TV anima → Feed atualiza → Notificações enviadas
  → Acompanhar dashboard e alertas
  → Editar/Estornar pontos com justificativa (auditoria registrada)
  → Encerrar Campanha → Ranking final → Exportar
```

### Participante

```
Login Google (@scmidia.com.br)
  → Dashboard (pontuação, rank, nível, streak, progress bars)
  → Ranking (filtros por time/semana/mês)
  → Feed (atividades em tempo real)
  → Histórico (todos os pontos com motivo)
  → Perfil (badges, conquistas, evolução)
```

---

## 7. Permissões e Segurança

### Middleware Next.js

```
/login              → público
/display/*          → valida token na URL, sem auth
/(manager)/*        → auth + role === 'manager'
/(participant)/*    → auth + role === 'participant'
/api/points/*       → auth + role === 'manager'
/api/rankings/*     → auth (qualquer role)
/api/users/*        → auth + role === 'manager'
/api/campaigns/*    → GET: auth qualquer | mutações: manager
/api/notifications/ → auth (próprio usuário)
```

### Row Level Security

```sql
-- Transações: participante vê só as próprias
point_transactions SELECT:
  user_id = auth.uid() OR role = 'manager'

-- Notificações: cada um vê só as suas
notifications SELECT:
  user_id = auth.uid()

-- Campanhas: todos leem, só manager escreve
campaigns SELECT: true
campaigns INSERT/UPDATE/DELETE: role = 'manager'

-- Usuários: todos leem, manager ou o próprio escreve
users SELECT: true
users UPDATE: id = auth.uid() OR role = 'manager'
```

---

## 8. Tema Visual — Missão Hexa

```json
{
  "name": "missao-hexa",
  "primary": "#1B5E20",
  "secondary": "#F9A825",
  "accent": "#FFFFFF",
  "dark": "#0A0A0A",
  "gradient": "linear-gradient(135deg, #1B5E20 0%, #0A0A0A 100%)",
  "font_heading": "Bebas Neue",
  "font_body": "Inter",
  "card_style": "fifa-player-card",
  "ranking_style": "championship-table",
  "celebration": {
    "animation": "confetti-gold",
    "sound": "stadium-cheer"
  },
  "icons": {
    "points": "⚽",
    "streak": "🔥",
    "bonus": "⭐",
    "penalty": "🟨",
    "trophy": "🏆"
  }
}
```

Cards de participante inspirados em cards FIFA. Ranking estilo tabela de campeonato. Painel TV com estética de estádio. Cores: verde (#1B5E20), dourado (#F9A825), preto (#0A0A0A), branco (#FAFAFA).

---

## 9. Features de Gamificação

### Sistema de Níveis
- Configurável por campanha: Rookie → Craque → Artilheiro → Lenda
- Detecção automática de upgrade via trigger Postgres
- Badge visual desbloqueado + evento no feed + notificação

### Streaks
- Tracker de dias consecutivos com pontuação em `campaign_participants`
- Job diário verifica e zera streak se sem atividade
- Milestone automático (5, 10, 15 dias) dispara bônus configurado

### Feed de Atividades
- Populado por triggers Postgres em `feed_events`
- Tipos: ponto ganho, subiu de nível, bônus conquistado, streak milestone, mudança de ranking
- Consumido via Supabase Realtime no dashboard e na tela Feed

### Painel TV com Celebrações
- Canal Realtime `celebrations` separado do ranking
- Quando ponto é lançado → trigger popula `celebration_events` → painel TV detecta e exibe animação full-screen
- Interrompe rotação automática por 8s, depois retorna

### Notificações In-App
- Badge no header com contador de não lidas
- Tipos: ponto ganho, subiu de nível, bônus, streak em risco, subiu no ranking
- Futura extensão: webhook para WhatsApp Business

### Importação em Lote (CSV)
- Upload de planilha com colunas: participante, critério, pontos, data, observação
- Preview com validação linha a linha antes de confirmar
- Endpoint `/api/points/import` — mesma rota que será usada pelo Salesforce/SAP na Phase 2

### Progress Bars de Metas
- Campo `target_value` + `target_period` em `scoring_rules`
- Dashboard do participante mostra progresso de cada critério na semana/mês

---

## 10. Preparação para Integrações (Phase 2)

- Campo `origin` em `point_transactions` distingue `manual`, `salesforce`, `sap`
- Campo `import_batch_id` agrupa lançamentos de uma importação
- Endpoint `/api/points/import` já aceita payload estruturado — Salesforce/SAP usarão o mesmo endpoint com `origin` diferente
- Auditoria completa mantém rastreabilidade independente da origem

---

## 11. Plano de Desenvolvimento

### Fase 0 — Setup (~2 dias)
- Criar projeto Supabase + schema completo + RLS
- Scaffold Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Google OAuth configurado e restrito ao domínio @scmidia.com.br
- Middleware de auth + role
- Deploy na Vercel com CD automático via GitHub

### Fase 1 — Core CRUD (~5 dias)
- Gestão de times e usuários
- CRUD de campanhas com upload de banner
- Critérios de pontuação + exceções individuais
- Configuração de níveis e bônus
- Vínculo de participantes à campanha

### Fase 2 — Lançamento de Pontos (~3 dias)
- Lançamento individual com preview
- Importação CSV em lote com validação
- Auditoria (editar, estornar, histórico)
- Triggers Postgres → feed_events + notifications + celebration_events

### Fase 3 — Rankings e Dashboards (~4 dias)
- View de ranking com todos os filtros
- Dashboard do gestor
- Dashboard do participante (pontos, nível, streak, progress bars)
- Exportação de ranking CSV

### Fase 4 — Realtime e Painel TV (~3 dias)
- Subscriptions Supabase Realtime nos 3 canais
- Rota `/display/[slug]` com rotação automática
- Animações de celebração ao vivo
- Feed de atividades em tempo real

### Fase 5 — Gamificação Completa (~3 dias)
- Sistema de níveis com detecção automática de upgrade
- Tracker de streaks com job diário
- Notificações in-app com badge no header
- Bônus automáticos por trigger config

### Fase 6 — Tema Missão Hexa (~2 dias)
- Design completo com identidade visual Copa do Mundo
- Cards FIFA-style dos participantes
- Ranking em estilo tabela de campeonato
- Animações e micro-interações
- Ajustes responsivos

**Total estimado: ~22 dias de desenvolvimento**

---

## 12. Fora do Escopo (MVP)

- Integração Salesforce e SAP B1 (Phase 2)
- PWA / app mobile nativo
- Notificações push (WhatsApp/email)
- Automação de bônus por regras complexas
- Multi-tenancy (outras empresas usando o sistema)
- SSO / Active Directory
