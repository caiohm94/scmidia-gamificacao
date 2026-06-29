# Design Spec: Sistema de Metas vs Realizado

**Data:** 2026-06-29
**Status:** Aprovado para implementação

---

## Contexto

O sistema de pontuação tem dois tipos de regras:

- **Fez → ganha** (atividade): cada ação gera pontos. Ex: fez uma chamada → +10 pts.
- **Bateu meta → ganha** (meta): pontos gerados apenas se o realizado atingir a meta do período. Ex: vendeu R$100k no dia → +50 pts.

Hoje não existe forma de cadastrar metas individuais por participante nem de registrar o realizado. Este spec define a tela e a lógica para isso.

---

## Escopo

- Nova página `/manager/metas` no menu do gestor
- Nova tabela `participant_goals` no banco
- API para criar/atualizar metas e realizados
- Geração automática de `point_transaction` quando realizado ≥ meta
- Suporte a realizado manual (gestor digita) e via Salesforce (sync automático)

**Fora do escopo:** exibição no painel do vendedor (TV) — fica para iteração futura.

---

## Modelo de Dados

### Tabela `participant_goals`

```sql
create table participant_goals (
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
```

**`period_date` por tipo de período:**
- Diário: a data exata (ex: `2026-06-15`)
- Semanal: segunda-feira da semana (ex: `2026-06-15`)
- Mensal: primeiro dia do mês (ex: `2026-06-01`)

**Regra de geração de pontos:**
- Quando `actual_value >= target_value` e `points_awarded = false` → insere `point_transaction` com `origin = 'meta'`, marca `points_awarded = true` e grava `awarded_tx_id`
- Idempotente: se já foi premiado, não duplica

---

## Elegibilidade de Regras

Somente regras com `categoria = 'Meta'` aparecem na página. O campo `categoria` já existe em `scoring_rules`.

---

## Página `/manager/metas`

### Layout Geral

```
[ Campanha ▾ ]  [ Indicador ▾ ]   ← Junho 2026 →

[ Aba: Metas ]  [ Aba: Realizado ]

─────────────────────────── (conteúdo da aba ativa)
```

- **Campanha**: dropdown, filtra indicadores disponíveis
- **Indicador**: dropdown com regras `categoria = 'Meta'` da campanha selecionada
- **Navegação temporal**: mês/semana/período conforme `target_period` da regra
- **Abas**: Metas (configuração) e Realizado (lançamento diário)

---

### Aba "Metas" — Configuração

Matriz: **linhas = participantes**, **colunas = dias/períodos do mês**.

```
Participante    | 01   | 02   | 03   | ... | 30   | Junho ↓
────────────────────────────────────────────────────────────
Caio Miranda    | 100k | 100k | 100k | ... | 100k | [Replicar]  [↕ Copiar p/ todos]
Vivian Couto    | 80k  |  80k |  80k | ... |  80k | [Replicar]
Daiana Perotoni |  —   |  —   |  —   | ... |  —   | [Replicar]
────────────────────────────────────────────────────────────
```

**Coluna de resumo (última):** mostra o mês/período atual — somente leitura, exibe `X/Y dias com meta definida`.

**Célula de meta:**
- Exibe o valor formatado (ex: `100k` para R$100.000)
- Clique → input numérico inline, confirmado com Enter ou blur
- Células sem meta exibem `—`

**Botão "Replicar" (por linha):**
- Pega o valor do primeiro dia com meta definida para aquele participante
- Preenche todos os dias restantes do mês que estão vazios
- Não sobrescreve dias que já têm meta

**Botão "Copiar p/ todos" (por linha):**
- Pega todos os valores de meta daquele participante (todos os dias)
- Aplica os mesmos valores para todos os outros participantes da campanha
- Exibe confirmação antes de executar

**Dias passados:** meta ainda editável (correção permitida). Se já houve realizado e pontos foram gerados, exibir ícone de aviso ao editar.

---

### Aba "Realizado" — Lançamento Diário

Vista simplificada focada no dia selecionado (padrão: hoje).

```
Data: [ 29/06/2026 ▾ ]

Participante      Meta        Realizado       Status
──────────────────────────────────────────────────────
Caio Miranda      R$100.000   [  67.000  ]    🟡 67%
Vivian Couto       R$80.000   [  92.000  ]    ✅ Bateu
Daiana Perotoni    R$90.000   [          ]    — Não lançado
──────────────────────────────────────────────────────
                                    [ Salvar tudo ]
```

- **Meta**: somente leitura (vem da aba Metas)
- **Realizado**: input numérico editável
- **Status**: calculado em tempo real ao digitar
  - `—` sem realizado
  - `🟡 XX%` realizado < meta
  - `✅ Bateu` realizado ≥ meta → pontos gerados ao salvar
- **"Salvar tudo"**: salva todos os realizados alterados de uma vez
- Participante sem meta cadastrada aparece na lista mas campo realizado desabilitado com tooltip "Defina a meta primeiro"

---

## Lógica de Pontos

### Manual (aba Realizado)

Ao salvar um realizado onde `actual_value >= target_value` e `points_awarded = false`:

1. Inserir `point_transaction` com:
   - `user_id`, `campaign_id`, `scoring_rule_id` da regra
   - `points` = valor de `points` da `scoring_rule`
   - `event_date` = `period_date`
   - `origin = 'meta'`
2. Atualizar `participant_goals` com `points_awarded = true`, `awarded_tx_id = <novo id>`

Se o realizado for editado para baixo de meta depois que pontos já foram gerados: **não estorna automaticamente** — gestor deve estornar manualmente via Auditoria.

### Salesforce (sync automático)

Quando o sync do Salesforce traz o realizado de um participante (via SOQL com valor agregado), a lógica é a mesma: atualiza `actual_value` na `participant_goals` e dispara a geração de pontos se atingiu meta.

Configuração na regra: campo `sf_actual_field` indica qual campo do retorno SOQL usar como realizado (ex: `total` numa query `COUNT(Id)`).

---

## API Routes

| Método | Rota | Ação |
|--------|------|------|
| GET | `/api/goals?rule_id=&month=2026-06` | Lista metas+realizados do mês |
| PUT | `/api/goals` | Upsert de uma ou mais metas/realizados |
| POST | `/api/goals/replicate` | Replica meta do dia 1 para o mês inteiro |
| POST | `/api/goals/copy-to-all` | Copia metas de um participante para todos |

---

## Menu

Adicionar item "Metas" no `ManagerNav` entre "Lançar Pontos" e "Salesforce":

```
Dashboard | Campanhas | Lançar Pontos | Metas | Salesforce | Importar CSV | Rankings | Auditoria | Usuários | Temas
```

Ícone sugerido: `Target` (já importado) ou `TrendingUp` do lucide-react.

---

## Constraints Globais

- Next.js 16 App Router: `params` e `searchParams` são Promises — sempre `await`
- Supabase: `createAdminClient()` para writes, `createClient()` para reads autenticados
- Estilo visual: `borderRadius: '0 <r> <r> <r>'`, cor primária `#8DB23C`, texto `#3F3E3E`
- Todos os valores monetários são `numeric` no banco, sem formatação — formatação só na UI
- Autenticação obrigatória: todas as rotas verificam role `manager`
