# Gamificação Comercial SCMídia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based commercial gamification platform for SCMídia, starting with the "Missão Hexa" World Cup campaign, with manager and participant dashboards, real-time rankings, a TV display panel, and a full gamification layer (levels, streaks, badges, celebrations).

**Architecture:** Next.js 15 App Router with explicit API Routes, Supabase (Postgres + Auth + Storage + Realtime), deployed on Vercel. Google OAuth restricted to @scmidia.com.br. Three Realtime channels: rankings, feed_events, celebrations.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase JS v2, @supabase/ssr, Zod, react-hook-form, Papa Parse, Recharts, sonner, Vitest, React Testing Library

## Global Constraints

- Next.js 15 App Router — no Pages Router
- TypeScript strict mode — no `any` without explicit cast
- All Supabase mutations go through `/api/*` routes, never direct from client
- Google OAuth domain restricted to `@scmidia.com.br`
- RLS enabled on all tables — never disable
- `gen_random_uuid()` for all UUID primary keys
- `timestamptz` (not `timestamp`) for all datetime columns
- Tailwind only — no inline styles except for dynamic theme CSS variables
- All forms validated with Zod schemas shared between client and API
- All monetary/point values stored as integers (no floats)
- Language: Portuguese (pt-BR) in all UI copy

---

## File Structure

```
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/auth/callback/route.ts
│   ├── (manager)/layout.tsx
│   ├── (manager)/dashboard/page.tsx
│   ├── (manager)/campaigns/page.tsx
│   ├── (manager)/campaigns/new/page.tsx
│   ├── (manager)/campaigns/[id]/page.tsx
│   ├── (manager)/campaigns/[id]/edit/page.tsx
│   ├── (manager)/campaigns/[id]/participants/page.tsx
│   ├── (manager)/campaigns/[id]/rules/page.tsx
│   ├── (manager)/campaigns/[id]/bonuses/page.tsx
│   ├── (manager)/campaigns/[id]/levels/page.tsx
│   ├── (manager)/users/page.tsx
│   ├── (manager)/users/new/page.tsx
│   ├── (manager)/users/[id]/page.tsx
│   ├── (manager)/points/page.tsx
│   ├── (manager)/points/import/page.tsx
│   ├── (manager)/points/history/page.tsx
│   ├── (manager)/rankings/page.tsx
│   ├── (participant)/layout.tsx
│   ├── (participant)/dashboard/page.tsx
│   ├── (participant)/ranking/page.tsx
│   ├── (participant)/history/page.tsx
│   ├── (participant)/profile/page.tsx
│   ├── (participant)/feed/page.tsx
│   ├── display/[slug]/page.tsx
│   ├── api/points/create/route.ts
│   ├── api/points/import/route.ts
│   ├── api/points/[id]/edit/route.ts
│   ├── api/points/[id]/reverse/route.ts
│   ├── api/campaigns/route.ts
│   ├── api/campaigns/[id]/route.ts
│   ├── api/campaigns/[id]/participants/route.ts
│   ├── api/users/route.ts
│   ├── api/users/[id]/route.ts
│   ├── api/rankings/route.ts
│   ├── api/notifications/read/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                        (shadcn/ui — auto-generated)
│   ├── game/
│   │   ├── PlayerCard.tsx         (FIFA-style participant card)
│   │   ├── RankingTable.tsx       (championship table style)
│   │   ├── StreakBadge.tsx
│   │   ├── LevelBadge.tsx
│   │   ├── ProgressBar.tsx        (criteria progress)
│   │   ├── FeedItem.tsx
│   │   └── CelebrationOverlay.tsx (TV panel full-screen animation)
│   ├── campaign/
│   │   ├── CampaignCard.tsx
│   │   └── CampaignForm.tsx
│   ├── points/
│   │   ├── PointForm.tsx
│   │   ├── ImportCSV.tsx
│   │   └── AuditTable.tsx
│   └── shared/
│       ├── NotificationBell.tsx
│       ├── Avatar.tsx
│       └── DataTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              (browser client)
│   │   ├── server.ts              (server component client)
│   │   └── admin.ts               (service role — API routes only)
│   ├── auth/helpers.ts
│   ├── rankings/queries.ts
│   ├── points/calculations.ts
│   ├── csv/parser.ts
│   └── theme/apply.ts
├── types/
│   └── database.ts
├── schemas/
│   ├── point.ts                   (Zod — shared client+server)
│   ├── campaign.ts
│   └── user.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_views.sql
│   │   └── 004_triggers.sql
│   └── seed.sql
├── middleware.ts
├── next.config.ts
└── tailwind.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `app/layout.tsx`, `app/globals.css`
- Create: `vitest.config.ts`, `vitest.setup.ts`

**Interfaces:**
- Produces: runnable Next.js 15 dev server; `npm test` works

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . \
  --typescript --tailwind --eslint \
  --app --src-dir=false --import-alias="@/*"
```

Expected: project scaffold created, `npm run dev` starts on port 3000.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr \
  zod react-hook-form @hookform/resolvers \
  papaparse date-fns recharts sonner \
  lucide-react next-themes

npm install -D vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables yes
npx shadcn@latest add button input label card badge \
  table tabs dialog sheet form select textarea \
  dropdown-menu avatar separator toast progress
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Configure next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 6: Create root layout with toaster**

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })

export const metadata: Metadata = {
  title: 'SCMídia — Gamificação Comercial',
  description: 'Plataforma de campanhas e rankings comerciais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${bebas.variable} font-sans`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
```

Add to `tailwind.config.ts` fontFamily extension:
```ts
fontFamily: {
  sans: ['var(--font-inter)', 'sans-serif'],
  heading: ['var(--font-bebas)', 'sans-serif'],
},
```

- [ ] **Step 7: Run dev server and verify**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads with no errors in console.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: project scaffold — Next.js 15, shadcn/ui, Vitest"
```

---

## Task 2: Supabase Schema & Migrations

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`
- Create: `supabase/migrations/003_views.sql`
- Create: `supabase/migrations/004_triggers.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: all migration SQL files ready to run in Supabase dashboard
- NOTE: actual Supabase project creation and running migrations requires human action (see Step 1)

- [ ] **Step 1: [HUMAN ACTION] Create Supabase project**

Go to supabase.com → New Project → name: `scmidia-gamificacao`.
Note: Project URL, anon key, service_role key.
Enable: Authentication → Providers → Google → add OAuth credentials from Google Cloud Console.
Add Redirect URLs: `https://<vercel-domain>/auth/callback` and `http://localhost:3000/auth/callback`.

- [ ] **Step 2: Write migration 001 — all tables**

`supabase/migrations/001_schema.sql`:
```sql
create extension if not exists "pgcrypto";

create type user_role as enum ('manager', 'participant');
create type user_function as enum ('internal_seller','external_seller','hunter','manager','auditor');
create type user_status as enum ('active','inactive');
create type campaign_status as enum ('draft','active','closed');
create type rule_applies_to as enum ('all','internal_seller','external_seller','hunter');
create type rule_category as enum ('goal','activity','behavior','bonus','penalty');
create type rule_period as enum ('daily','weekly','monthly');
create type transaction_origin as enum ('manual','salesforce','sap');
create type transaction_status as enum ('active','reversed');
create type audit_action as enum ('created','edited','reversed');
create type bonus_trigger as enum ('manual','automatic');
create type feed_event_type as enum ('point_earned','level_up','bonus_earned','streak_milestone','ranking_change','campaign_start','campaign_end');
create type notification_type as enum ('point_earned','level_up','bonus_earned','streak_warning','ranking_up','system');

create table teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6B7280',
  created_at timestamptz not null default now()
);

create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  avatar_url text,
  role       user_role not null default 'participant',
  team_id    uuid references teams(id),
  function   user_function not null default 'internal_seller',
  status     user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  rules         text,
  prizes        text,
  banner_url    text,
  theme         jsonb not null default '{}',
  status        campaign_status not null default 'draft',
  starts_at     timestamptz,
  ends_at       timestamptz,
  display_token text not null default encode(gen_random_bytes(24),'hex'),
  created_by    uuid not null references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table campaign_participants (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns(id) on delete cascade,
  user_id            uuid not null references users(id) on delete cascade,
  joined_at          timestamptz not null default now(),
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_activity_date date,
  unique(campaign_id, user_id)
);

create table levels (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name        text not null,
  min_points  integer not null default 0,
  badge_icon  text not null default '🏅',
  color       text not null default '#6B7280',
  perks       jsonb not null default '{}',
  "order"     integer not null default 0
);

create table scoring_rules (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text not null,
  description   text,
  points        integer not null,
  applies_to    rule_applies_to not null default 'all',
  category      rule_category not null default 'goal',
  target_value  integer,
  target_period rule_period,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table scoring_rule_exceptions (
  id              uuid primary key default gen_random_uuid(),
  scoring_rule_id uuid not null references scoring_rules(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  points_override integer not null,
  reason          text,
  unique(scoring_rule_id, user_id)
);

create table point_transactions (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id),
  user_id         uuid not null references users(id),
  scoring_rule_id uuid references scoring_rules(id),
  points          integer not null,
  event_date      date not null default current_date,
  description     text,
  attachment_url  text,
  origin          transaction_origin not null default 'manual',
  status          transaction_status not null default 'active',
  import_batch_id uuid,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now()
);

create table point_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references point_transactions(id),
  action          audit_action not null,
  changed_by      uuid not null references users(id),
  previous_points integer,
  new_points      integer,
  reason          text,
  created_at      timestamptz not null default now()
);

create table bonuses (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  name           text not null,
  description    text,
  points         integer not null default 0,
  badge_icon     text not null default '⭐',
  trigger_type   bonus_trigger not null default 'manual',
  trigger_config jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create table user_bonuses (
  id             uuid primary key default gen_random_uuid(),
  bonus_id       uuid not null references bonuses(id),
  user_id        uuid not null references users(id),
  campaign_id    uuid not null references campaigns(id),
  awarded_at     timestamptz not null default now(),
  awarded_by     uuid not null references users(id),
  transaction_id uuid references point_transactions(id)
);

create table feed_events (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  user_id     uuid not null references users(id),
  event_type  feed_event_type not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table celebration_events (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id),
  user_id      uuid not null references users(id),
  points       integer not null,
  rule_name    text,
  message      text,
  triggered_at timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  type        notification_type not null,
  title       text not null,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index on point_transactions(campaign_id, user_id, status);
create index on point_transactions(campaign_id, event_date);
create index on feed_events(campaign_id, created_at desc);
create index on notifications(user_id, read_at);
create index on campaign_participants(campaign_id, user_id);
```

- [ ] **Step 3: Write migration 002 — RLS**

`supabase/migrations/002_rls.sql`:
```sql
alter table teams enable row level security;
alter table users enable row level security;
alter table campaigns enable row level security;
alter table campaign_participants enable row level security;
alter table levels enable row level security;
alter table scoring_rules enable row level security;
alter table scoring_rule_exceptions enable row level security;
alter table point_transactions enable row level security;
alter table point_audit_logs enable row level security;
alter table bonuses enable row level security;
alter table user_bonuses enable row level security;
alter table feed_events enable row level security;
alter table celebration_events enable row level security;
alter table notifications enable row level security;

create or replace function auth_role()
returns text language sql stable as
$$ select role from users where id = auth.uid() $$;

create policy "teams_select" on teams for select using (true);
create policy "teams_write" on teams for all using (auth_role() = 'manager');

create policy "users_select" on users for select using (true);
create policy "users_insert" on users for insert with check (auth_role() = 'manager');
create policy "users_update" on users for update using (id = auth.uid() or auth_role() = 'manager');

create policy "campaigns_select" on campaigns for select using (true);
create policy "campaigns_insert" on campaigns for insert with check (auth_role() = 'manager');
create policy "campaigns_update" on campaigns for update using (auth_role() = 'manager');
create policy "campaigns_delete" on campaigns for delete using (auth_role() = 'manager');

create policy "cp_select" on campaign_participants for select using (true);
create policy "cp_write" on campaign_participants for all using (auth_role() = 'manager');

create policy "levels_select" on levels for select using (true);
create policy "levels_write" on levels for all using (auth_role() = 'manager');

create policy "rules_select" on scoring_rules for select using (true);
create policy "rules_write" on scoring_rules for all using (auth_role() = 'manager');

create policy "exceptions_select" on scoring_rule_exceptions for select using (true);
create policy "exceptions_write" on scoring_rule_exceptions for all using (auth_role() = 'manager');

create policy "bonuses_select" on bonuses for select using (true);
create policy "bonuses_write" on bonuses for all using (auth_role() = 'manager');

create policy "user_bonuses_select" on user_bonuses for select using (true);
create policy "user_bonuses_write" on user_bonuses for all using (auth_role() = 'manager');

create policy "pt_select" on point_transactions for select
  using (user_id = auth.uid() or auth_role() = 'manager');
create policy "pt_insert" on point_transactions for insert with check (auth_role() = 'manager');
create policy "pt_update" on point_transactions for update using (auth_role() = 'manager');

create policy "audit_select" on point_audit_logs for select using (auth_role() = 'manager');
create policy "audit_insert" on point_audit_logs for insert with check (auth_role() = 'manager');

create policy "feed_select" on feed_events for select using (
  auth_role() = 'manager' or
  exists (select 1 from campaign_participants cp
    where cp.campaign_id = feed_events.campaign_id and cp.user_id = auth.uid())
);

create policy "celebrations_select" on celebration_events for select using (
  auth_role() = 'manager' or
  exists (select 1 from campaign_participants cp
    where cp.campaign_id = celebration_events.campaign_id and cp.user_id = auth.uid())
);

create policy "notifications_select" on notifications for select
  using (user_id = auth.uid() or auth_role() = 'manager');
create policy "notifications_update" on notifications for update
  using (user_id = auth.uid());
```

- [ ] **Step 4: Write migration 003 — ranking view**

`supabase/migrations/003_views.sql`:
```sql
create or replace view campaign_rankings as
select
  cp.campaign_id,
  cp.user_id,
  u.name,
  u.avatar_url,
  u.function,
  t.name  as team_name,
  t.color as team_color,
  t.id    as team_id,
  coalesce(sum(pt.points) filter (where pt.status = 'active'), 0) as total_points,
  cp.current_streak,
  cp.longest_streak,
  rank() over (
    partition by cp.campaign_id
    order by coalesce(sum(pt.points) filter (where pt.status = 'active'), 0) desc
  ) as position
from campaign_participants cp
join users u on u.id = cp.user_id
left join teams t on t.id = u.team_id
left join point_transactions pt
  on pt.user_id = cp.user_id and pt.campaign_id = cp.campaign_id
group by cp.campaign_id, cp.user_id, u.name, u.avatar_url,
         u.function, t.name, t.color, t.id,
         cp.current_streak, cp.longest_streak;
```

- [ ] **Step 5: Write migration 004 — triggers**

`supabase/migrations/004_triggers.sql`:
```sql
-- Sync auth.users → public.users
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- updated_at triggers
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

-- Main point transaction trigger
create or replace function handle_new_point_transaction()
returns trigger language plpgsql security definer as $$
declare
  v_rule_name    text;
  v_user_name    text;
  v_campaign_name text;
begin
  select name into v_rule_name from scoring_rules where id = new.scoring_rule_id;
  select name into v_user_name from users where id = new.user_id;
  select name into v_campaign_name from campaigns where id = new.campaign_id;

  insert into feed_events (campaign_id, user_id, event_type, payload)
  values (new.campaign_id, new.user_id, 'point_earned', jsonb_build_object(
    'points', new.points, 'rule_name', coalesce(v_rule_name,'Bônus'),
    'user_name', v_user_name, 'description', new.description
  ));

  if new.points > 0 then
    insert into celebration_events (campaign_id, user_id, points, rule_name, message)
    values (new.campaign_id, new.user_id, new.points,
      coalesce(v_rule_name,'Bônus'),
      v_user_name || ' marcou ' || new.points || ' pontos!');
  end if;

  insert into notifications (user_id, campaign_id, type, title, body)
  values (new.user_id, new.campaign_id, 'point_earned',
    'Você recebeu ' || new.points || ' pontos!',
    coalesce(v_rule_name,'Bônus') || ' — ' || v_campaign_name);

  update campaign_participants set
    last_activity_date = new.event_date,
    current_streak = case
      when last_activity_date = new.event_date - interval '1 day' then current_streak + 1
      when last_activity_date = new.event_date then current_streak
      else 1 end,
    longest_streak = greatest(longest_streak, case
      when last_activity_date = new.event_date - interval '1 day' then current_streak + 1
      when last_activity_date = new.event_date then current_streak
      else 1 end)
  where campaign_id = new.campaign_id and user_id = new.user_id;

  insert into point_audit_logs (transaction_id, action, changed_by, new_points)
  values (new.id, 'created', new.created_by, new.points);

  return new;
end;
$$;

create trigger on_point_transaction_insert
  after insert on point_transactions
  for each row execute function handle_new_point_transaction();

-- Level-up detection
create or replace function check_level_upgrade()
returns trigger language plpgsql security definer as $$
declare
  v_total integer; v_new record; v_old record; v_user_name text;
begin
  select coalesce(sum(points) filter (where status='active'),0)
  into v_total from point_transactions
  where campaign_id=new.campaign_id and user_id=new.user_id;

  select * into v_new from levels
  where campaign_id=new.campaign_id and min_points<=v_total
  order by min_points desc limit 1;
  if v_new is null then return new; end if;

  select * into v_old from levels
  where campaign_id=new.campaign_id and min_points<=(v_total-new.points)
  order by min_points desc limit 1;

  if v_old is null or v_old.id <> v_new.id then
    select name into v_user_name from users where id=new.user_id;
    insert into feed_events (campaign_id,user_id,event_type,payload)
    values (new.campaign_id,new.user_id,'level_up',jsonb_build_object(
      'user_name',v_user_name,'level_name',v_new.name,'level_icon',v_new.badge_icon));
    insert into notifications (user_id,campaign_id,type,title,body)
    values (new.user_id,new.campaign_id,'level_up',
      'Você subiu de nível! '||v_new.badge_icon,
      'Parabéns! Você alcançou o nível '||v_new.name);
  end if;
  return new;
end;
$$;

create trigger on_point_check_level
  after insert on point_transactions
  for each row execute function check_level_upgrade();

-- Streak milestones
create or replace function check_streak_milestone()
returns trigger language plpgsql security definer as $$
declare v_streak integer; v_user_name text;
begin
  select current_streak into v_streak from campaign_participants
  where campaign_id=new.campaign_id and user_id=new.user_id;
  if v_streak is null or v_streak not in (5,10,15,20) then return new; end if;
  select name into v_user_name from users where id=new.user_id;
  insert into feed_events (campaign_id,user_id,event_type,payload)
  values (new.campaign_id,new.user_id,'streak_milestone',
    jsonb_build_object('user_name',v_user_name,'streak',v_streak));
  insert into notifications (user_id,campaign_id,type,title,body)
  values (new.user_id,new.campaign_id,'bonus_earned',
    '🔥 '||v_streak||' dias seguidos!',
    'Incrível! Você manteve uma sequência de '||v_streak||' dias.');
  return new;
end;
$$;

create trigger on_point_check_streak_milestone
  after insert on point_transactions
  for each row execute function check_streak_milestone();
```

- [ ] **Step 6: Write seed.sql**

`supabase/seed.sql`:
```sql
insert into teams (name, color) values
  ('Mobile', '#3B82F6'),
  ('Têxtil', '#10B981'),
  ('Comunicação Visual', '#F59E0B'),
  ('Hunters', '#8B5CF6');
```

- [ ] **Step 7: [HUMAN ACTION] Run migrations**

After creating the Supabase project and setting credentials, run:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

- [ ] **Step 8: Commit migration files**

```bash
git add supabase/
git commit -m "feat: supabase schema — tables, RLS, views, triggers"
```

---

## Task 3: Authentication & Middleware

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`
- Create: `lib/auth/helpers.ts`
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/auth/callback/route.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces: `createClient()` (browser), `createClient()` from server (async), `createAdminClient()`, middleware routing by role, `/login` page

- [ ] **Step 1: Create .env.local.example**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` (not `.env.local.example`).

- [ ] **Step 2: Browser Supabase client**

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Server Supabase client**

`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Admin Supabase client**

`lib/supabase/admin.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 5: Auth helpers**

`lib/auth/helpers.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: 'manager' | 'participant') {
  const user = await requireAuth()
  const supabase = await createClient()
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!data || data.role !== role) redirect('/login')
  return user
}

export async function getSessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users').select('*, teams(name, color)').eq('id', user.id).single()
  return data
}
```

- [ ] **Step 6: Middleware**

`middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/display')) {
    return response
  }
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (path.startsWith('/manager') && profile?.role !== 'manager')
    return NextResponse.redirect(new URL('/participant/dashboard', request.url))
  if (path.startsWith('/participant') && profile?.role !== 'participant')
    return NextResponse.redirect(new URL('/manager/dashboard', request.url))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)'],
}
```

- [ ] **Step 7: Auth callback route**

`app/(auth)/auth/callback/route.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = await cookies()

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      const dest = profile?.role === 'manager' ? '/manager/dashboard' : '/participant/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
```

- [ ] **Step 8: Login page**

`app/(auth)/login/page.tsx`:
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const supabase = createClient()

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'scmidia.com.br' },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-black">
      <Card className="w-full max-w-sm border-yellow-500/20 bg-black/80 text-white">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl">🏆</div>
          <CardTitle className="text-2xl font-bold text-yellow-400">Missão Hexa</CardTitle>
          <p className="text-sm text-gray-400">SCMídia — Gamificação Comercial</p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleLogin}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
            Entrar com Google @scmidia.com.br
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 9: Write auth unit test**

`__tests__/auth/redirect.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

function resolveDestination(role: string | undefined) {
  return role === 'manager' ? '/manager/dashboard' : '/participant/dashboard'
}

describe('auth redirect logic', () => {
  it('redirects manager to manager dashboard', () => {
    expect(resolveDestination('manager')).toBe('/manager/dashboard')
  })
  it('redirects participant to participant dashboard', () => {
    expect(resolveDestination('participant')).toBe('/participant/dashboard')
  })
  it('redirects unknown role to participant dashboard', () => {
    expect(resolveDestination(undefined)).toBe('/participant/dashboard')
  })
})
```

Run: `npm run test:run`
Expected: 3 tests pass.

- [ ] **Step 10: Commit**

```bash
git add lib/ middleware.ts app/\(auth\)/ __tests__/
git commit -m "feat: auth — Google OAuth, middleware role routing, login page"
```

---

## Task 4: Database Types

**Files:**
- Create: `types/database.ts`

**Interfaces:**
- Produces: `Database` type, `Tables<T>`, `Enums<T>`, `UserProfile`, `CampaignRanking`, `CampaignTheme`
- NOTE: `npx supabase gen types` requires Supabase project credentials in `.env.local`

- [ ] **Step 1: Create placeholder types file**

Create `types/database.ts` with manual types (to be regenerated after Supabase is live):
```ts
// Auto-generated types will replace this file after: npx supabase gen types typescript --project-id <ref> > types/database.ts
// For now, define the minimum needed for TypeScript to compile

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> }
      campaigns: { Row: CampaignRow; Insert: Partial<CampaignRow>; Update: Partial<CampaignRow> }
      campaign_participants: { Row: CampaignParticipantRow; Insert: Partial<CampaignParticipantRow>; Update: Partial<CampaignParticipantRow> }
      teams: { Row: TeamRow; Insert: Partial<TeamRow>; Update: Partial<TeamRow> }
      scoring_rules: { Row: ScoringRuleRow; Insert: Partial<ScoringRuleRow>; Update: Partial<ScoringRuleRow> }
      scoring_rule_exceptions: { Row: ScoringRuleExceptionRow; Insert: Partial<ScoringRuleExceptionRow>; Update: Partial<ScoringRuleExceptionRow> }
      point_transactions: { Row: PointTransactionRow; Insert: Partial<PointTransactionRow>; Update: Partial<PointTransactionRow> }
      point_audit_logs: { Row: PointAuditLogRow; Insert: Partial<PointAuditLogRow>; Update: Partial<PointAuditLogRow> }
      levels: { Row: LevelRow; Insert: Partial<LevelRow>; Update: Partial<LevelRow> }
      bonuses: { Row: BonusRow; Insert: Partial<BonusRow>; Update: Partial<BonusRow> }
      user_bonuses: { Row: UserBonusRow; Insert: Partial<UserBonusRow>; Update: Partial<UserBonusRow> }
      feed_events: { Row: FeedEventRow; Insert: Partial<FeedEventRow>; Update: Partial<FeedEventRow> }
      celebration_events: { Row: CelebrationEventRow; Insert: Partial<CelebrationEventRow>; Update: Partial<CelebrationEventRow> }
      notifications: { Row: NotificationRow; Insert: Partial<NotificationRow>; Update: Partial<NotificationRow> }
    }
    Views: {
      campaign_rankings: { Row: CampaignRankingRow }
    }
    Enums: {
      user_role: 'manager' | 'participant'
      user_function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
      user_status: 'active' | 'inactive'
      campaign_status: 'draft' | 'active' | 'closed'
      rule_applies_to: 'all' | 'internal_seller' | 'external_seller' | 'hunter'
      rule_category: 'goal' | 'activity' | 'behavior' | 'bonus' | 'penalty'
      rule_period: 'daily' | 'weekly' | 'monthly'
      transaction_origin: 'manual' | 'salesforce' | 'sap'
      transaction_status: 'active' | 'reversed'
      audit_action: 'created' | 'edited' | 'reversed'
      bonus_trigger: 'manual' | 'automatic'
      feed_event_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_milestone' | 'ranking_change' | 'campaign_start' | 'campaign_end'
      notification_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_warning' | 'ranking_up' | 'system'
    }
  }
}

interface UserRow {
  id: string; name: string; email: string; avatar_url: string | null
  role: 'manager' | 'participant'; team_id: string | null
  function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
  status: 'active' | 'inactive'; created_at: string; updated_at: string
}
interface TeamRow { id: string; name: string; color: string; created_at: string }
interface CampaignRow {
  id: string; name: string; slug: string; description: string | null; rules: string | null
  prizes: string | null; banner_url: string | null; theme: Json
  status: 'draft' | 'active' | 'closed'; starts_at: string | null; ends_at: string | null
  display_token: string; created_by: string; created_at: string; updated_at: string
}
interface CampaignParticipantRow {
  id: string; campaign_id: string; user_id: string; joined_at: string
  current_streak: number; longest_streak: number; last_activity_date: string | null
}
interface ScoringRuleRow {
  id: string; campaign_id: string; name: string; description: string | null; points: number
  applies_to: 'all' | 'internal_seller' | 'external_seller' | 'hunter'
  category: 'goal' | 'activity' | 'behavior' | 'bonus' | 'penalty'
  target_value: number | null; target_period: 'daily' | 'weekly' | 'monthly' | null
  is_active: boolean; created_at: string
}
interface ScoringRuleExceptionRow {
  id: string; scoring_rule_id: string; user_id: string; points_override: number; reason: string | null
}
interface PointTransactionRow {
  id: string; campaign_id: string; user_id: string; scoring_rule_id: string | null
  points: number; event_date: string; description: string | null; attachment_url: string | null
  origin: 'manual' | 'salesforce' | 'sap'; status: 'active' | 'reversed'
  import_batch_id: string | null; created_by: string; created_at: string
}
interface PointAuditLogRow {
  id: string; transaction_id: string; action: 'created' | 'edited' | 'reversed'
  changed_by: string; previous_points: number | null; new_points: number | null
  reason: string | null; created_at: string
}
interface LevelRow {
  id: string; campaign_id: string; name: string; min_points: number
  badge_icon: string; color: string; perks: Json; order: number
}
interface BonusRow {
  id: string; campaign_id: string; name: string; description: string | null
  points: number; badge_icon: string; trigger_type: 'manual' | 'automatic'
  trigger_config: Json; created_at: string
}
interface UserBonusRow {
  id: string; bonus_id: string; user_id: string; campaign_id: string
  awarded_at: string; awarded_by: string; transaction_id: string | null
}
interface FeedEventRow {
  id: string; campaign_id: string; user_id: string
  event_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_milestone' | 'ranking_change' | 'campaign_start' | 'campaign_end'
  payload: Json; created_at: string
}
interface CelebrationEventRow {
  id: string; campaign_id: string; user_id: string; points: number
  rule_name: string | null; message: string | null; triggered_at: string
}
interface NotificationRow {
  id: string; user_id: string; campaign_id: string | null
  type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_warning' | 'ranking_up' | 'system'
  title: string; body: string; read_at: string | null; created_at: string
}
interface CampaignRankingRow {
  campaign_id: string; user_id: string; name: string; avatar_url: string | null
  function: string; team_name: string | null; team_color: string | null; team_id: string | null
  total_points: number; current_streak: number; longest_streak: number; position: number
}

// Convenience helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type UserProfile = Tables<'users'> & { teams: { name: string; color: string } | null }

export type CampaignRanking = {
  campaign_id: string; user_id: string; name: string; avatar_url: string | null
  function: string; team_name: string | null; team_color: string | null; team_id: string | null
  total_points: number; current_streak: number; longest_streak: number; position: number
}

export type CampaignTheme = {
  primary?: string; secondary?: string; accent?: string; dark?: string
  font_heading?: string; font_body?: string
  icons?: { points: string; streak: string; bonus: string; penalty: string; trophy: string }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only errors about missing .env.local, which is expected).

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat: database types — manual placeholders, regenerate after Supabase live"
```

---

## Task 5: Zod Schemas (shared client + server)

**Files:**
- Create: `schemas/user.ts`, `schemas/campaign.ts`, `schemas/point.ts`

- [ ] **Step 1: User schema**

`schemas/user.ts`:
```ts
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['manager', 'participant']),
  team_id: z.string().uuid().nullable(),
  function: z.enum(['internal_seller','external_seller','hunter','manager','auditor']),
  status: z.enum(['active','inactive']),
})

export type UserInput = z.infer<typeof userSchema>
```

- [ ] **Step 2: Campaign schema**

`schemas/campaign.ts`:
```ts
import { z } from 'zod'

export const campaignSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  rules: z.string().optional(),
  prizes: z.string().optional(),
  status: z.enum(['draft','active','closed']),
  starts_at: z.string().datetime().nullable(),
  ends_at: z.string().datetime().nullable(),
  theme: z.record(z.unknown()).default({}),
})

export type CampaignInput = z.infer<typeof campaignSchema>
```

- [ ] **Step 3: Point schema**

`schemas/point.ts`:
```ts
import { z } from 'zod'

export const pointSchema = z.object({
  campaign_id: z.string().uuid(),
  user_id: z.string().uuid(),
  scoring_rule_id: z.string().uuid().nullable(),
  points: z.number().int().refine(v => v !== 0, 'Pontos não podem ser zero'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  origin: z.enum(['manual','salesforce','sap']).default('manual'),
})

export type PointInput = z.infer<typeof pointSchema>

export const csvRowSchema = z.object({
  participante: z.string().min(1),
  criterio: z.string().min(1),
  pontos: z.coerce.number().int(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
})

export type CSVRow = z.infer<typeof csvRowSchema>
```

- [ ] **Step 4: Commit**

```bash
git add schemas/
git commit -m "feat: zod schemas for user, campaign, point"
```

---

## Task 6: Teams & Users — API + UI

**Files:**
- Create: `app/api/users/route.ts`, `app/api/users/[id]/route.ts`
- Create: `app/(manager)/users/page.tsx`, `app/(manager)/users/new/page.tsx`
- Create: `app/(manager)/users/[id]/page.tsx`
- Create: `components/shared/Avatar.tsx`

- [ ] **Step 1: Users API — list + create**

`app/api/users/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { userSchema } from '@/schemas/user'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*, teams(name, color)')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = userSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('users').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Users API — get + update**

`app/api/users/[id]/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { userSchema } from '@/schemas/user'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users').select('*, teams(name, color)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const parsed = userSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('users').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Avatar component**

`components/shared/Avatar.tsx`:
```tsx
import Image from 'next/image'

interface Props { src?: string | null; name: string; size?: number; className?: string }

export function Avatar({ src, name, size = 40, className = '' }: Props) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (src) {
    return <Image src={src} alt={name} width={size} height={size}
      className={`rounded-full object-cover ${className}`} />
  }
  return (
    <div
      className={`rounded-full bg-yellow-500 text-black font-bold flex items-center justify-center ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}
```

- [ ] **Step 4: Users list page (manager)**

`app/(manager)/users/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function UsersPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('users').select('*, teams(name, color)').order('name')

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Link href="/manager/users/new">
          <Button>Novo usuário</Button>
        </Link>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Usuário','Time','Função','Status',''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 flex items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.name} size={32} />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.teams && (
                    <Badge style={{ backgroundColor: u.teams.color + '20', color: u.teams.color }}>
                      {u.teams.name}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.function}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                    {u.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/manager/users/${u.id}`}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/users/ app/\(manager\)/users/ components/shared/Avatar.tsx schemas/
git commit -m "feat: users API and manager UI"
```

---

## Task 7: Campaign Management — API + UI

**Files:**
- Create: `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/route.ts`
- Create: `app/(manager)/campaigns/page.tsx`
- Create: `app/(manager)/campaigns/new/page.tsx`
- Create: `components/campaign/CampaignForm.tsx`

- [ ] **Step 1: Campaigns API**

`app/api/campaigns/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { campaignSchema } from '@/schemas/campaign'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = campaignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('campaigns')
    .insert({ ...parsed.data, created_by: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

`app/api/campaigns/[id]/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { campaignSchema } from '@/schemas/campaign'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const parsed = campaignSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('campaigns').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Campaign form component**

`components/campaign/CampaignForm.tsx`:
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { campaignSchema, type CampaignInput } from '@/schemas/campaign'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props { defaultValues?: Partial<CampaignInput>; campaignId?: string }

export function CampaignForm({ defaultValues, campaignId }: Props) {
  const router = useRouter()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<CampaignInput>({ resolver: zodResolver(campaignSchema), defaultValues })

  async function onSubmit(values: CampaignInput) {
    const url = campaignId ? `/api/campaigns/${campaignId}` : '/api/campaigns'
    const method = campaignId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    if (!res.ok) { toast.error('Erro ao salvar campanha'); return }
    toast.success(campaignId ? 'Campanha atualizada!' : 'Campanha criada!')
    router.push('/manager/campaigns')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input {...register('name')} placeholder="Missão Hexa" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Slug (URL)</Label>
          <Input {...register('slug')} placeholder="missao-hexa" />
          {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Descrição</Label>
        <Textarea {...register('description')} rows={3} />
      </div>
      <div className="space-y-1">
        <Label>Regras Gerais</Label>
        <Textarea {...register('rules')} rows={4} />
      </div>
      <div className="space-y-1">
        <Label>Premiação</Label>
        <Textarea {...register('prizes')} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Início</Label>
          <Input type="datetime-local" {...register('starts_at')} />
        </div>
        <div className="space-y-1">
          <Label>Fim</Label>
          <Input type="datetime-local" {...register('ends_at')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select onValueChange={v => setValue('status', v as CampaignInput['status'])} defaultValue={defaultValues?.status ?? 'draft'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="closed">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : campaignId ? 'Salvar alterações' : 'Criar campanha'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Campaigns list page**

`app/(manager)/campaigns/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusLabel: Record<string, string> = { draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada' }
const statusVariant: Record<string, 'default'|'secondary'|'outline'> = {
  draft: 'secondary', active: 'default', closed: 'outline'
}

export default async function CampaignsPage() {
  await requireRole('manager')
  const supabase = await createClient()
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <Link href="/manager/campaigns/new"><Button>Nova campanha</Button></Link>
      </div>
      <div className="grid gap-4">
        {campaigns?.map(c => (
          <div key={c.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.starts_at && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                  {c.ends_at && ` → ${format(new Date(c.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}`}
                </p>
              )}
            </div>
            <Link href={`/manager/campaigns/${c.id}`}>
              <Button variant="outline" size="sm">Gerenciar</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: New campaign page**

`app/(manager)/campaigns/new/page.tsx`:
```tsx
import { requireRole } from '@/lib/auth/helpers'
import { CampaignForm } from '@/components/campaign/CampaignForm'

export default async function NewCampaignPage() {
  await requireRole('manager')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Nova Campanha</h1>
      <CampaignForm />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/ app/\(manager\)/campaigns/ components/campaign/
git commit -m "feat: campaigns API and manager UI"
```

---

## Task 8: Scoring Rules, Levels & Bonuses

**Files:**
- Create: `app/api/campaigns/[id]/participants/route.ts`
- Create: `app/(manager)/campaigns/[id]/rules/page.tsx`
- Create: `app/(manager)/campaigns/[id]/levels/page.tsx`
- Create: `app/(manager)/campaigns/[id]/bonuses/page.tsx`
- Create: `app/(manager)/campaigns/[id]/participants/page.tsx`

- [ ] **Step 1: Scoring rules API (inline in campaign route)**

`app/api/campaigns/[id]/rules/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ruleSchema = z.object({
  name: z.string().min(1),
  points: z.number().int(),
  applies_to: z.enum(['all','internal_seller','external_seller','hunter']),
  category: z.enum(['goal','activity','behavior','bonus','penalty']),
  description: z.string().optional(),
  target_value: z.number().int().optional(),
  target_period: z.enum(['daily','weekly','monthly']).optional(),
  is_active: z.boolean().default(true),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('scoring_rules')
    .select('*, scoring_rule_exceptions(*, users(name))')
    .eq('campaign_id', id).order('category')
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('scoring_rules')
    .insert({ ...parsed.data, campaign_id: id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Participants API**

`app/api/campaigns/[id]/participants/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('campaign_participants')
    .select('*, users(id, name, email, avatar_url, function, teams(name, color))')
    .eq('campaign_id', id)
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user_ids } = await request.json() as { user_ids: string[] }
  const admin = createAdminClient()
  const rows = user_ids.map(user_id => ({ campaign_id: id, user_id }))
  const { data, error } = await admin.from('campaign_participants').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user_id } = await request.json() as { user_id: string }
  const admin = createAdminClient()
  const { error } = await admin.from('campaign_participants')
    .delete().eq('campaign_id', id).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/campaigns/
git commit -m "feat: scoring rules, levels, bonuses, participants API"
```

---

## Task 9: Point Transactions — Single Launch

**Files:**
- Create: `app/api/points/create/route.ts`
- Create: `app/api/points/[id]/edit/route.ts`
- Create: `app/api/points/[id]/reverse/route.ts`
- Create: `app/(manager)/points/page.tsx`
- Create: `components/points/PointForm.tsx`

- [ ] **Step 1: Create point API**

`app/api/points/create/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { pointSchema } from '@/schemas/point'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = pointSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Apply exception override if exists
  let points = parsed.data.points
  if (parsed.data.scoring_rule_id) {
    const admin = createAdminClient()
    const { data: exception } = await admin
      .from('scoring_rule_exceptions')
      .select('points_override')
      .eq('scoring_rule_id', parsed.data.scoring_rule_id)
      .eq('user_id', parsed.data.user_id)
      .single()
    if (exception) points = exception.points_override
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('point_transactions')
    .insert({ ...parsed.data, points, created_by: user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Edit point API**

`app/api/points/[id]/edit/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const editSchema = z.object({ points: z.number().int(), description: z.string().optional(), reason: z.string().min(1) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('point_transactions').select('points').eq('id', id).single()
  await admin.from('point_audit_logs').insert({
    transaction_id: id, action: 'edited', changed_by: user.id,
    previous_points: existing?.points, new_points: parsed.data.points, reason: parsed.data.reason,
  })

  const { data, error } = await admin.from('point_transactions')
    .update({ points: parsed.data.points, description: parsed.data.description }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Reverse point API**

`app/api/points/[id]/reverse/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await request.json() as { reason: string }
  const admin = createAdminClient()

  const { data: existing } = await admin.from('point_transactions').select('points').eq('id', id).single()
  await admin.from('point_audit_logs').insert({
    transaction_id: id, action: 'reversed', changed_by: user.id,
    previous_points: existing?.points, new_points: 0, reason,
  })

  const { data, error } = await admin.from('point_transactions')
    .update({ status: 'reversed' }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Point form component**

`components/points/PointForm.tsx`:
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pointSchema, type PointInput } from '@/schemas/point'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  participants: { id: string; name: string }[]
  campaigns: { id: string; name: string }[]
  rules: { id: string; name: string; points: number; campaign_id: string }[]
}

export function PointForm({ participants, campaigns, rules }: Props) {
  const router = useRouter()
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<PointInput>({ resolver: zodResolver(pointSchema), defaultValues: { event_date: new Date().toISOString().slice(0,10), origin: 'manual' } })

  const selectedCampaign = watch('campaign_id')
  const filteredRules = rules.filter(r => r.campaign_id === selectedCampaign)

  async function onSubmit(values: PointInput) {
    const res = await fetch('/api/points/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
    })
    if (!res.ok) { toast.error('Erro ao lançar ponto'); return }
    toast.success('Ponto lançado com sucesso! ⚽')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Campanha</Label>
        <Select onValueChange={v => setValue('campaign_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione a campanha" /></SelectTrigger>
          <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Participante</Label>
        <Select onValueChange={v => setValue('user_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione o participante" /></SelectTrigger>
          <SelectContent>{participants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Critério</Label>
        <Select onValueChange={v => {
          setValue('scoring_rule_id', v)
          const rule = rules.find(r => r.id === v)
          if (rule) setValue('points', rule.points)
        }}>
          <SelectTrigger><SelectValue placeholder="Selecione o critério" /></SelectTrigger>
          <SelectContent>{filteredRules.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.points > 0 ? '+' : ''}{r.points} pts)</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Pontos</Label>
          <Input type="number" {...register('points', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Data do evento</Label>
          <Input type="date" {...register('event_date')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Observação</Label>
        <Textarea {...register('description')} rows={2} placeholder="Detalhe opcional..." />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Lançando...' : 'Lançar ponto ⚽'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/points/ components/points/PointForm.tsx
git commit -m "feat: point transactions — create, edit, reverse API + launch form"
```

---

## Task 10: CSV Import

**Files:**
- Create: `lib/csv/parser.ts`
- Create: `app/api/points/import/route.ts`
- Create: `components/points/ImportCSV.tsx`
- Create: `app/(manager)/points/import/page.tsx`

- [ ] **Step 1: CSV parser**

`lib/csv/parser.ts`:
```ts
import Papa from 'papaparse'
import { csvRowSchema, type CSVRow } from '@/schemas/point'

export type ParsedRow = CSVRow & { _line: number; _error?: string }

export function parsePointsCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const results: ParsedRow[] = (data as Record<string, string>[]).map((row, i) => {
          const parsed = csvRowSchema.safeParse(row)
          if (!parsed.success) {
            return { ...row, _line: i + 2, _error: parsed.error.errors[0]?.message } as ParsedRow
          }
          return { ...parsed.data, _line: i + 2 }
        })
        resolve(results)
      },
    })
  })
}
```

- [ ] **Step 2: Write parser test**

`__tests__/csv/parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parsePointsCSV } from '@/lib/csv/parser'

function makeFile(content: string) {
  return new File([content], 'test.csv', { type: 'text/csv' })
}

describe('parsePointsCSV', () => {
  it('parses valid CSV rows', async () => {
    const csv = `participante,criterio,pontos,data,observacao\nJoão,Meta diária,10,2026-07-01,ok`
    const rows = await parsePointsCSV(makeFile(csv))
    expect(rows).toHaveLength(1)
    expect(rows[0].pontos).toBe(10)
    expect(rows[0]._error).toBeUndefined()
  })

  it('flags rows with invalid date', async () => {
    const csv = `participante,criterio,pontos,data\nJoão,Meta,10,31-07-2026`
    const rows = await parsePointsCSV(makeFile(csv))
    expect(rows[0]._error).toBeDefined()
  })
})
```

Run: `npm test -- parser.test`
Expected: 2 tests pass.

- [ ] **Step 3: Import API**

`app/api/points/import/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const importSchema = z.object({
  campaign_id: z.string().uuid(),
  rows: z.array(z.object({
    user_id: z.string().uuid(),
    scoring_rule_id: z.string().uuid().nullable(),
    points: z.number().int(),
    event_date: z.string(),
    description: z.string().optional(),
  })),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const batch_id = uuidv4()
  const rows = parsed.data.rows.map(r => ({
    ...r, campaign_id: parsed.data.campaign_id,
    origin: 'manual' as const, created_by: user.id, import_batch_id: batch_id,
  }))

  const admin = createAdminClient()
  const { data, error } = await admin.from('point_transactions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length, batch_id }, { status: 201 })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/csv/ app/api/points/import/ __tests__/csv/
git commit -m "feat: CSV import — parser, API, validation"
```

---

## Task 11: Rankings API

**Files:**
- Create: `app/api/rankings/route.ts`
- Create: `lib/rankings/queries.ts`

- [ ] **Step 1: Rankings queries**

`lib/rankings/queries.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CampaignRanking } from '@/types/database'

export type RankingFilter = {
  campaign_id: string
  team_id?: string
  function?: string
  period?: 'weekly' | 'monthly' | 'all'
  week_start?: string  // YYYY-MM-DD
  month?: string       // YYYY-MM
}

export async function getRanking(
  supabase: SupabaseClient<Database>,
  filter: RankingFilter
): Promise<CampaignRanking[]> {
  // For period filters we query point_transactions directly
  if (filter.period && filter.period !== 'all') {
    let dateFilter = ''
    if (filter.period === 'weekly' && filter.week_start) {
      const end = new Date(filter.week_start)
      end.setDate(end.getDate() + 6)
      dateFilter = `event_date.gte.${filter.week_start},event_date.lte.${end.toISOString().slice(0,10)}`
    }
    if (filter.period === 'monthly' && filter.month) {
      dateFilter = `event_date.gte.${filter.month}-01,event_date.lte.${filter.month}-31`
    }
    // Fall through to view with date-filtered sum — simplified: use the view and note period filtering
    // is a Phase 2 enhancement for the API; the view covers the full-period default
  }

  let query = supabase.from('campaign_rankings').select('*').eq('campaign_id', filter.campaign_id)
  if (filter.team_id) query = query.eq('team_id', filter.team_id)
  if (filter.function) query = query.eq('function', filter.function)

  const { data, error } = await query.order('position')
  if (error) throw error
  return (data ?? []) as CampaignRanking[]
}
```

- [ ] **Step 2: Rankings API route**

`app/api/rankings/route.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/rankings/queries'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaign_id = searchParams.get('campaign_id')
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const supabase = await createClient()
  try {
    const ranking = await getRanking(supabase, {
      campaign_id,
      team_id: searchParams.get('team_id') ?? undefined,
      function: searchParams.get('function') ?? undefined,
      period: (searchParams.get('period') as 'weekly' | 'monthly' | 'all') ?? 'all',
      week_start: searchParams.get('week_start') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    })
    return NextResponse.json(ranking)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/rankings/ lib/rankings/
git commit -m "feat: rankings API with campaign_rankings view"
```

---

## Task 12: Manager Dashboard

**Files:**
- Create: `app/(manager)/dashboard/page.tsx`
- Create: `app/(manager)/layout.tsx`
- Create: `components/game/RankingTable.tsx`

- [ ] **Step 1: Manager layout with nav**

`app/(manager)/layout.tsx`:
```tsx
import { requireRole } from '@/lib/auth/helpers'
import Link from 'next/link'
import { LayoutDashboard, Trophy, Users, Target, History, Upload } from 'lucide-react'

const nav = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/campaigns', label: 'Campanhas', icon: Trophy },
  { href: '/manager/users', label: 'Usuários', icon: Users },
  { href: '/manager/points', label: 'Lançar Pontos', icon: Target },
  { href: '/manager/points/import', label: 'Importar CSV', icon: Upload },
  { href: '/manager/points/history', label: 'Auditoria', icon: History },
  { href: '/manager/rankings', label: 'Rankings', icon: Trophy },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('manager')
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-950 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-yellow-400">🏆 SCMídia</h1>
          <p className="text-xs text-gray-400">Painel do Gestor</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Manager dashboard page**

`app/(manager)/dashboard/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { subDays, format } from 'date-fns'

export default async function ManagerDashboard() {
  await requireRole('manager')
  const supabase = await createClient()
  const threeDaysAgo = subDays(new Date(), 3).toISOString().slice(0, 10)

  const [{ count: totalUsers }, { count: activeCampaigns }, { data: recentPoints }, { data: inactiveParticipants }] =
    await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('point_transactions')
        .select('*, users(name, avatar_url), scoring_rules(name), campaigns(name)')
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('campaign_participants')
        .select('*, users(name, avatar_url), campaigns(name)')
        .lt('last_activity_date', threeDaysAgo)
        .not('last_activity_date', 'is', null),
    ])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Usuários Ativos', value: totalUsers ?? 0, icon: '👥' },
          { label: 'Campanhas Ativas', value: activeCampaigns ?? 0, icon: '🏆' },
          { label: 'Pontos Hoje', value: recentPoints?.filter(p => p.created_at.slice(0,10) === new Date().toISOString().slice(0,10)).length ?? 0, icon: '⚽' },
          { label: 'Alertas', value: inactiveParticipants?.length ?? 0, icon: '⚠️' },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="text-3xl mb-1">{card.icon}</div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(inactiveParticipants?.length ?? 0) > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50">
          <CardHeader><CardTitle className="text-sm text-yellow-700">⚠️ Participantes sem pontuação há +3 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {inactiveParticipants?.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{(p.users as any)?.name}</span>
                  <span className="text-muted-foreground">{(p.campaigns as any)?.name}</span>
                  <span className="text-muted-foreground">Último: {p.last_activity_date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Lançamentos Recentes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentPoints?.map(pt => (
              <div key={pt.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <span className="font-medium">{(pt.users as any)?.name}</span>
                <span className="text-muted-foreground">{(pt.scoring_rules as any)?.name ?? 'Bônus'}</span>
                <Badge variant={pt.points > 0 ? 'default' : 'destructive'}>
                  {pt.points > 0 ? '+' : ''}{pt.points} pts
                </Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(pt.created_at), 'dd/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(manager\)/
git commit -m "feat: manager layout and dashboard"
```

---

## Task 13: Participant Dashboard & Layout

**Files:**
- Create: `app/(participant)/layout.tsx`
- Create: `app/(participant)/dashboard/page.tsx`
- Create: `components/game/LevelBadge.tsx`
- Create: `components/game/StreakBadge.tsx`
- Create: `components/game/ProgressBar.tsx`
- Create: `components/game/PlayerCard.tsx`

- [ ] **Step 1: Participant layout**

`app/(participant)/layout.tsx`:
```tsx
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Avatar } from '@/components/shared/Avatar'
import Link from 'next/link'

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  await requireRole('participant')
  const user = await getSessionUser()
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link href="/participant/dashboard" className="text-yellow-400 font-bold text-lg">🏆 Missão Hexa</Link>
        <nav className="flex items-center gap-6 text-sm text-gray-300">
          <Link href="/participant/dashboard" className="hover:text-white">Painel</Link>
          <Link href="/participant/ranking" className="hover:text-white">Ranking</Link>
          <Link href="/participant/history" className="hover:text-white">Histórico</Link>
          <Link href="/participant/feed" className="hover:text-white">Feed</Link>
        </nav>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Avatar src={user?.avatar_url} name={user?.name ?? ''} size={32} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Game components**

`components/game/LevelBadge.tsx`:
```tsx
interface Props { name: string; icon: string; color: string }
export function LevelBadge({ name, icon, color }: Props) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border"
      style={{ borderColor: color, color, backgroundColor: color + '20' }}>
      {icon} {name}
    </span>
  )
}
```

`components/game/StreakBadge.tsx`:
```tsx
interface Props { streak: number }
export function StreakBadge({ streak }: Props) {
  if (streak === 0) return null
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
      🔥 {streak} {streak === 1 ? 'dia' : 'dias'} seguidos
    </span>
  )
}
```

`components/game/ProgressBar.tsx`:
```tsx
interface Props { label: string; current: number; target: number; icon?: string }
export function ProgressBar({ label, current, target, icon = '⚽' }: Props) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{icon} {label}</span>
        <span className="text-muted-foreground">{current}/{target}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Participant dashboard page**

`app/(participant)/dashboard/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelBadge } from '@/components/game/LevelBadge'
import { StreakBadge } from '@/components/game/StreakBadge'
import { ProgressBar } from '@/components/game/ProgressBar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default async function ParticipantDashboard() {
  await requireRole('participant')
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()

  // Active campaign
  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]

  // My points
  const { data: myPoints } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name, target_value, target_period, category)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const totalPoints = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0

  // My position
  let myPosition: number | null = null
  let myStreak = 0
  if (campaign) {
    const ranking = await getRanking(supabase, { campaign_id: campaign.id })
    const me = ranking.find(r => r.user_id === user.id)
    myPosition = me?.position ?? null
    myStreak = me?.current_streak ?? 0

    // Current level
    const { data: levels } = await supabase.from('levels')
      .select('*').eq('campaign_id', campaign.id)
      .lte('min_points', totalPoints).order('min_points', { ascending: false }).limit(1)
    var currentLevel = levels?.[0]

    // Bonuses
    const { data: myBonuses } = await supabase.from('user_bonuses')
      .select('*, bonuses(name, badge_icon)').eq('user_id', user.id).eq('campaign_id', campaign.id)
    var earnedBonuses = myBonuses
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Olá, {user.name.split(' ')[0]}! 👋</h1>
          {campaign && <p className="text-gray-400">{campaign.name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {currentLevel && <LevelBadge name={currentLevel.name} icon={currentLevel.badge_icon} color={currentLevel.color} />}
          <StreakBadge streak={myStreak} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-yellow-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-yellow-400">{totalPoints}</div>
            <p className="text-sm text-gray-400 mt-1">pontos totais ⚽</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{myPosition ? `#${myPosition}` : '—'}</div>
            <p className="text-sm text-gray-400 mt-1">posição no ranking 🏆</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-orange-400">{myStreak}</div>
            <p className="text-sm text-gray-400 mt-1">dias seguidos 🔥</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader><CardTitle className="text-sm">Últimos pontos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myPoints?.slice(0, 8).map(pt => (
              <div key={pt.id} className="flex justify-between text-sm">
                <span className="text-gray-300">{(pt.scoring_rules as any)?.name ?? 'Bônus'}</span>
                <span className="text-xs text-gray-500">{format(new Date(pt.event_date), 'dd/MM')}</span>
                <Badge variant={pt.points > 0 ? 'default' : 'destructive'} className="text-xs">
                  {pt.points > 0 ? '+' : ''}{pt.points}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {earnedBonuses && earnedBonuses.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-sm">Conquistas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {earnedBonuses.map(ub => (
                  <div key={ub.id} className="text-center p-2 rounded-lg bg-gray-800 border border-gray-700 text-xs">
                    <div className="text-2xl">{(ub.bonuses as any)?.badge_icon}</div>
                    <div className="mt-1 text-gray-300">{(ub.bonuses as any)?.name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(participant\)/ components/game/
git commit -m "feat: participant layout and dashboard"
```

---

## Task 14: Ranking Pages + Participant History

**Files:**
- Create: `app/(manager)/rankings/page.tsx`
- Create: `app/(participant)/ranking/page.tsx`
- Create: `app/(participant)/history/page.tsx`
- Create: `components/game/RankingTable.tsx`

- [ ] **Step 1: RankingTable component**

`components/game/RankingTable.tsx`:
```tsx
import { Avatar } from '@/components/shared/Avatar'
import { StreakBadge } from '@/components/game/StreakBadge'
import type { CampaignRanking } from '@/types/database'

interface Props { rows: CampaignRanking[]; highlightUserId?: string }

const medalEmoji = ['🥇', '🥈', '🥉']

export function RankingTable({ rows, highlightUserId }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Participante</th>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-right">Pontos</th>
            <th className="px-4 py-3 text-right hidden md:table-cell">Sequência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_id}
              className={`border-t border-gray-800 ${row.user_id === highlightUserId ? 'bg-yellow-500/10' : 'hover:bg-gray-900/50'}`}>
              <td className="px-4 py-3 text-lg">
                {row.position <= 3 ? medalEmoji[row.position - 1] : row.position}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={row.avatar_url} name={row.name} size={36} />
                  <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.function?.replace('_', ' ')}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {row.team_name && (
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: (row.team_color ?? '#666') + '20', color: row.team_color ?? '#666' }}>
                    {row.team_name}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold text-yellow-400 text-lg">
                {row.total_points.toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <StreakBadge streak={row.current_streak} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Participant ranking page**

`app/(participant)/ranking/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { RankingTable } from '@/components/game/RankingTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ParticipantRankingPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('*').eq('status', 'active').limit(1)
  const campaign = campaigns?.[0]
  if (!campaign) return <div className="p-6 text-gray-400">Nenhuma campanha ativa.</div>

  const [overall, teamRanking] = await Promise.all([
    getRanking(supabase, { campaign_id: campaign.id }),
    user?.team_id ? getRanking(supabase, { campaign_id: campaign.id, team_id: user.team_id }) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏆 {campaign.name} — Ranking</h1>
      <Tabs defaultValue="overall">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="overall">Geral</TabsTrigger>
          <TabsTrigger value="team">Meu Time</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="mt-4">
          <RankingTable rows={overall} highlightUserId={user?.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <RankingTable rows={teamRanking} highlightUserId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Participant history page**

`app/(participant)/history/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole, getSessionUser } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function HistoryPage() {
  await requireRole('participant')
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: points } = await supabase
    .from('point_transactions')
    .select('*, scoring_rules(name), campaigns(name)')
    .eq('user_id', user!.id)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Histórico de Pontos</h1>
      <div className="space-y-2">
        {points?.map(pt => (
          <div key={pt.id} className={`flex items-center justify-between p-4 rounded-lg border ${pt.status === 'reversed' ? 'border-gray-700 opacity-50' : 'border-gray-700 bg-gray-900'}`}>
            <div className="space-y-0.5">
              <p className="font-medium">{(pt.scoring_rules as any)?.name ?? 'Bônus'}</p>
              <p className="text-xs text-gray-400">{(pt.campaigns as any)?.name}</p>
              {pt.description && <p className="text-xs text-gray-500">{pt.description}</p>}
            </div>
            <div className="text-right space-y-1">
              <Badge variant={pt.points > 0 ? 'default' : 'destructive'} className="text-sm">
                {pt.points > 0 ? '+' : ''}{pt.points} pts
              </Badge>
              <p className="text-xs text-gray-400">
                {format(new Date(pt.event_date), "dd 'de' MMM yyyy", { locale: ptBR })}
              </p>
              {pt.status === 'reversed' && <p className="text-xs text-red-400">Estornado</p>}
              <p className="text-xs text-gray-600">{pt.origin}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Manager rankings page**

`app/(manager)/rankings/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { getRanking } from '@/lib/rankings/queries'
import { RankingTable } from '@/components/game/RankingTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default async function ManagerRankingsPage({ searchParams }: { searchParams: Promise<{ campaign_id?: string }> }) {
  await requireRole('manager')
  const { campaign_id } = await searchParams
  const supabase = await createClient()

  const { data: campaigns } = await supabase.from('campaigns').select('id, name').neq('status', 'draft')
  const activeCampaignId = campaign_id ?? campaigns?.[0]?.id

  const ranking = activeCampaignId
    ? await getRanking(supabase, { campaign_id: activeCampaignId })
    : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rankings</h1>
        <div className="flex gap-2">
          <a href={`/api/rankings/export?campaign_id=${activeCampaignId}`}>
            <Button variant="outline" size="sm">Exportar CSV</Button>
          </a>
        </div>
      </div>
      <Tabs defaultValue="overall">
        <TabsList>
          <TabsTrigger value="overall">Geral</TabsTrigger>
          <TabsTrigger value="sellers">Vendedores Int.</TabsTrigger>
          <TabsTrigger value="external">Vendedores Ext.</TabsTrigger>
          <TabsTrigger value="hunters">Hunters</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="mt-4">
          <RankingTable rows={ranking} />
        </TabsContent>
        <TabsContent value="sellers" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'internal_seller')} />
        </TabsContent>
        <TabsContent value="external" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'external_seller')} />
        </TabsContent>
        <TabsContent value="hunters" className="mt-4">
          <RankingTable rows={ranking.filter(r => r.function === 'hunter')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/game/RankingTable.tsx app/\(participant\)/ranking/ app/\(participant\)/history/ app/\(manager\)/rankings/
git commit -m "feat: ranking table component and ranking/history pages"
```

---

## Task 15: Realtime Feed + Notifications

**Files:**
- Create: `app/(participant)/feed/page.tsx`
- Create: `components/game/FeedItem.tsx`
- Create: `components/shared/NotificationBell.tsx`
- Create: `app/api/notifications/read/route.ts`

- [ ] **Step 1: FeedItem component**

`components/game/FeedItem.tsx`:
```tsx
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar } from '@/components/shared/Avatar'

const eventLabels: Record<string, string> = {
  point_earned: 'marcou pontos',
  level_up: 'subiu de nível',
  bonus_earned: 'conquistou um bônus',
  streak_milestone: 'atingiu sequência especial',
  campaign_start: 'A campanha começou!',
  campaign_end: 'A campanha encerrou!',
}

interface FeedEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  user_id: string
}

export function FeedItem({ event }: { event: FeedEvent }) {
  const payload = event.payload as any
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
      <div className="text-2xl mt-0.5">
        {event.event_type === 'point_earned' ? '⚽' :
         event.event_type === 'level_up' ? '🏅' :
         event.event_type === 'bonus_earned' ? '⭐' :
         event.event_type === 'streak_milestone' ? '🔥' : '📢'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-semibold">{payload.user_name}</span>
          {' '}{eventLabels[event.event_type] ?? event.event_type}
          {event.event_type === 'point_earned' && payload.points && (
            <span className="ml-1 text-yellow-400 font-bold">+{payload.points} pts</span>
          )}
        </p>
        {payload.rule_name && (
          <p className="text-xs text-gray-400 mt-0.5">{payload.rule_name}</p>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Feed page with Realtime**

`app/(participant)/feed/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeedItem } from '@/components/game/FeedItem'

export default function FeedPage() {
  const [events, setEvents] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    supabase.from('feed_events').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setEvents(data ?? []))

    // Realtime subscription
    const channel = supabase.channel('feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'feed_events'
      }, payload => {
        setEvents(prev => [payload.new as any, ...prev.slice(0, 49)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Feed ao Vivo 📡</h1>
      <div className="space-y-2">
        {events.map(e => <FeedItem key={e.id} event={e} />)}
        {events.length === 0 && (
          <p className="text-gray-400 text-center py-8">Nenhuma atividade ainda. Seja o primeiro! ⚽</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Notifications API**

`app/api/notifications/read/route.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json() as { ids?: string[] }
  const admin = createAdminClient()

  let query = admin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id)
  if (ids?.length) query = query.in('id', ids)
  else query = query.is('read_at', null)

  await query
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: NotificationBell component**

`components/shared/NotificationBell.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem
} from '@/components/ui/dropdown-menu'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = createClient()
  const unread = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    supabase.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setNotifications(data ?? []))

    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => setNotifications(prev => [payload.new as any, ...prev]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex justify-between items-center px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-yellow-500 hover:underline">Marcar todas como lidas</button>}
        </div>
        {notifications.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma notificação</p>}
        {notifications.map(n => (
          <DropdownMenuItem key={n.id} className={`flex flex-col items-start gap-0.5 ${!n.read_at ? 'bg-yellow-50 dark:bg-yellow-500/5' : ''}`}>
            <span className="font-medium text-sm">{n.title}</span>
            <span className="text-xs text-gray-400">{n.body}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(participant\)/feed/ components/game/FeedItem.tsx components/shared/NotificationBell.tsx app/api/notifications/
git commit -m "feat: realtime feed, notification bell, notifications API"
```

---

## Task 16: Painel TV (Display Route)

**Files:**
- Create: `app/display/[slug]/page.tsx`
- Create: `components/game/CelebrationOverlay.tsx`

- [ ] **Step 1: CelebrationOverlay component**

`components/game/CelebrationOverlay.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'

interface CelebrationEvent {
  user_id: string
  points: number
  rule_name: string
  message: string
  avatar_url?: string
  user_name?: string
}

interface Props { event: CelebrationEvent | null; onDone: () => void }

export function CelebrationOverlay({ event, onDone }: Props) {
  useEffect(() => {
    if (!event) return
    const t = setTimeout(onDone, 8000)
    return () => clearTimeout(t)
  }, [event, onDone])

  if (!event) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Confetti effect via CSS animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-sm animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#F9A825','#1B5E20','#FFFFFF','#FFD700'][i % 4],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.5 + Math.random()}s`,
            }} />
        ))}
      </div>

      <div className="text-center space-y-6 relative z-10">
        <div className="text-8xl animate-bounce">⚽</div>
        {event.avatar_url && (
          <Avatar src={event.avatar_url} name={event.user_name ?? ''} size={120}
            className="mx-auto ring-8 ring-yellow-500" />
        )}
        <div className="space-y-2">
          <h2 className="text-5xl font-black text-yellow-400">{event.user_name ?? event.message}</h2>
          <p className="text-3xl font-bold text-white">+{event.points} pontos! 🥅</p>
          <p className="text-xl text-gray-400">{event.rule_name}</p>
        </div>
        <div className="text-6xl">🏆🎊🏆</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TV display page**

`app/display/[slug]/page.tsx`:
```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RankingTable } from '@/components/game/RankingTable'
import { FeedItem } from '@/components/game/FeedItem'
import { CelebrationOverlay } from '@/components/game/CelebrationOverlay'
import type { CampaignRanking } from '@/types/database'

const ROTATION_INTERVAL = 15000 // 15s
const VIEWS = ['ranking', 'top3', 'feed'] as const

export default function DisplayPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const [campaign, setCampaign] = useState<any>(null)
  const [ranking, setRanking] = useState<CampaignRanking[]>([])
  const [feedEvents, setFeedEvents] = useState<any[]>([])
  const [celebration, setCelebration] = useState<any>(null)
  const [view, setView] = useState<typeof VIEWS[number]>('ranking')
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { slug } = await params
      const { token } = await searchParams

      const { data: camp } = await supabase.from('campaigns')
        .select('*').eq('slug', slug).single()

      if (!camp || camp.display_token !== token) {
        setAuthorized(false)
        return
      }

      setAuthorized(true)
      setCampaign(camp)

      // Load ranking
      const { data: r } = await supabase.from('campaign_rankings')
        .select('*').eq('campaign_id', camp.id).order('position')
      setRanking((r ?? []) as CampaignRanking[])

      // Load feed
      const { data: f } = await supabase.from('feed_events')
        .select('*').eq('campaign_id', camp.id).order('created_at', { ascending: false }).limit(10)
      setFeedEvents(f ?? [])

      // Realtime: ranking updates
      supabase.channel('display-rankings')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'point_transactions', filter: `campaign_id=eq.${camp.id}` },
          async () => {
            const { data } = await supabase.from('campaign_rankings')
              .select('*').eq('campaign_id', camp.id).order('position')
            setRanking((data ?? []) as CampaignRanking[])
          })
        .subscribe()

      // Realtime: feed
      supabase.channel('display-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events', filter: `campaign_id=eq.${camp.id}` },
          payload => setFeedEvents(prev => [payload.new as any, ...prev.slice(0, 9)]))
        .subscribe()

      // Realtime: celebrations
      supabase.channel('display-celebrations')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'celebration_events', filter: `campaign_id=eq.${camp.id}` },
          async payload => {
            const ev = payload.new as any
            const { data: u } = await supabase.from('users').select('name, avatar_url').eq('id', ev.user_id).single()
            setCelebration({ ...ev, user_name: u?.name, avatar_url: u?.avatar_url })
          })
        .subscribe()
    }
    init()
  }, [])

  // Rotate views
  useEffect(() => {
    if (!authorized || celebration) return
    const t = setInterval(() => {
      setView(v => {
        const idx = VIEWS.indexOf(v)
        return VIEWS[(idx + 1) % VIEWS.length]
      })
    }, ROTATION_INTERVAL)
    return () => clearInterval(t)
  }, [authorized, celebration])

  if (!authorized) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white text-2xl">Acesso não autorizado.</div>
  }

  const top3 = ranking.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  const theme = campaign?.theme ?? {}

  return (
    <div className="min-h-screen text-white overflow-hidden select-none"
      style={{ background: `linear-gradient(135deg, ${theme.primary ?? '#1B5E20'} 0%, #0A0A0A 100%)` }}>

      <CelebrationOverlay event={celebration} onDone={() => setCelebration(null)} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <h1 className="text-3xl font-black" style={{ color: theme.secondary ?? '#F9A825' }}>
          🏆 {campaign?.name}
        </h1>
        <div className="text-right text-sm text-gray-400">
          {campaign?.ends_at && (
            <p>{Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000))} dias restantes</p>
          )}
          <p className="text-xs">{new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {/* Content area */}
      <div className="px-8 py-6">
        {view === 'ranking' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-300">Ranking Geral</h2>
            <RankingTable rows={ranking.slice(0, 10)} />
          </div>
        )}

        {view === 'top3' && (
          <div className="flex items-end justify-center gap-8 h-80">
            {[top3[1], top3[0], top3[2]].map((row, i) => {
              if (!row) return <div key={i} className="w-48" />
              const heights = ['h-48', 'h-72', 'h-40']
              const positions = [1, 0, 2]
              return (
                <div key={row.user_id} className={`w-48 ${heights[i]} flex flex-col items-center justify-end pb-4 rounded-t-2xl`}
                  style={{ backgroundColor: (theme.secondary ?? '#F9A825') + (i === 1 ? '30' : '15') }}>
                  <p className="text-4xl">{medals[positions[i]]}</p>
                  <p className="font-bold text-center text-sm mt-2">{row.name}</p>
                  <p className="text-2xl font-black" style={{ color: theme.secondary ?? '#F9A825' }}>
                    {row.total_points.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400">pontos</p>
                </div>
              )
            })}
          </div>
        )}

        {view === 'feed' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-300">Feed ao Vivo 📡</h2>
            <div className="space-y-2">
              {feedEvents.slice(0, 6).map(e => <FeedItem key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>

      {/* View indicator dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {VIEWS.map(v => (
          <div key={v} className={`w-2 h-2 rounded-full transition-all ${v === view ? 'bg-yellow-400 w-4' : 'bg-gray-600'}`} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/display/ components/game/CelebrationOverlay.tsx
git commit -m "feat: TV display panel with realtime ranking, feed and celebration overlay"
```

---

## Task 17: Levels Automation + Streaks

**Files:**
- Modify: `supabase/migrations/004_triggers.sql` (append streak-milestone trigger)
- Create: `supabase/migrations/005_streak_reset.sql`

- [ ] **Step 1: Add level-up detection to point trigger**

Append to `004_triggers.sql` (also apply in Supabase SQL editor):
```sql
-- Check level upgrade after each point transaction
create or replace function check_level_upgrade()
returns trigger language plpgsql security definer as $$
declare
  v_total_points integer;
  v_new_level record;
  v_old_level record;
  v_user_name text;
begin
  select coalesce(sum(points) filter (where status = 'active'), 0)
  into v_total_points
  from point_transactions
  where campaign_id = new.campaign_id and user_id = new.user_id;

  select * into v_new_level
  from levels
  where campaign_id = new.campaign_id and min_points <= v_total_points
  order by min_points desc limit 1;

  if v_new_level is null then return new; end if;

  -- Check previous level (before this transaction)
  select * into v_old_level
  from levels
  where campaign_id = new.campaign_id
    and min_points <= (v_total_points - new.points)
  order by min_points desc limit 1;

  -- Level changed → fire feed + notification
  if v_old_level is null or v_old_level.id <> v_new_level.id then
    select name into v_user_name from users where id = new.user_id;

    insert into feed_events (campaign_id, user_id, event_type, payload)
    values (new.campaign_id, new.user_id, 'level_up', jsonb_build_object(
      'user_name', v_user_name,
      'level_name', v_new_level.name,
      'level_icon', v_new_level.badge_icon
    ));

    insert into notifications (user_id, campaign_id, type, title, body)
    values (new.user_id, new.campaign_id, 'level_up',
      'Você subiu de nível! ' || v_new_level.badge_icon,
      'Parabéns! Você alcançou o nível ' || v_new_level.name
    );
  end if;

  return new;
end;
$$;

create trigger on_point_check_level
  after insert on point_transactions
  for each row execute function check_level_upgrade();
```

- [ ] **Step 2: Streak milestone trigger**

Append to `004_triggers.sql`:
```sql
create or replace function check_streak_milestone()
returns trigger language plpgsql security definer as $$
declare
  v_streak integer;
  v_user_name text;
  v_milestone integer;
begin
  select current_streak into v_streak
  from campaign_participants
  where campaign_id = new.campaign_id and user_id = new.user_id;

  if v_streak is null then return new; end if;

  -- Milestones: 5, 10, 15, 20 days
  if v_streak in (5, 10, 15, 20) then
    v_milestone := v_streak;
    select name into v_user_name from users where id = new.user_id;

    insert into feed_events (campaign_id, user_id, event_type, payload)
    values (new.campaign_id, new.user_id, 'streak_milestone', jsonb_build_object(
      'user_name', v_user_name, 'streak', v_milestone
    ));

    insert into notifications (user_id, campaign_id, type, title, body)
    values (new.user_id, new.campaign_id, 'bonus_earned',
      '🔥 ' || v_milestone || ' dias seguidos!',
      'Incrível! Você manteve uma sequência de ' || v_milestone || ' dias.'
    );
  end if;

  return new;
end;
$$;

create trigger on_point_check_streak_milestone
  after insert on point_transactions
  for each row execute function check_streak_milestone();
```

- [ ] **Step 3: Daily streak reset (Supabase Edge Function)**

In Supabase dashboard → Edge Functions → New function `reset-streaks`:
```ts
// supabase/functions/reset-streaks/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Reset streak for participants who had no activity yesterday
  const { error } = await supabase
    .from('campaign_participants')
    .update({ current_streak: 0 })
    .lt('last_activity_date', yesterdayStr)
    .not('last_activity_date', 'is', null)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ ok: true, reset_at: new Date().toISOString() }))
})
```

Schedule in Supabase → Edge Functions → reset-streaks → Schedule → `0 3 * * *` (3am daily).

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: level-up and streak milestone triggers, daily streak reset edge function"
```

---

## Task 18: Missão Hexa Visual Theme

**Files:**
- Create: `lib/theme/apply.ts`
- Modify: `app/globals.css`
- Create: `components/game/PlayerCard.tsx`

- [ ] **Step 1: Theme application utility**

`lib/theme/apply.ts`:
```ts
import type { CampaignTheme } from '@/types/database'

export function themeToCSS(theme: CampaignTheme): string {
  return `
    --color-primary: ${theme.primary ?? '#1B5E20'};
    --color-secondary: ${theme.secondary ?? '#F9A825'};
    --color-accent: ${theme.accent ?? '#FFFFFF'};
    --color-dark: ${theme.dark ?? '#0A0A0A'};
  `.trim()
}
```

- [ ] **Step 2: FIFA-style PlayerCard component**

`components/game/PlayerCard.tsx`:
```tsx
import { Avatar } from '@/components/shared/Avatar'
import type { CampaignRanking } from '@/types/database'

const functionLabels: Record<string, string> = {
  internal_seller: 'Vendedor Int.',
  external_seller: 'Vendedor Ext.',
  hunter: 'Hunter',
  manager: 'Gestor',
  auditor: 'Auditor',
}

interface Props { player: CampaignRanking; theme?: { secondary?: string } }

export function PlayerCard({ player, theme }: Props) {
  const accent = theme?.secondary ?? '#F9A825'
  return (
    <div className="relative w-36 rounded-xl overflow-hidden border-2 bg-gradient-to-b from-green-900 to-black text-white text-center p-3 space-y-2"
      style={{ borderColor: accent }}>
      <div className="text-2xl font-black" style={{ color: accent }}>{player.position}</div>
      <Avatar src={player.avatar_url} name={player.name} size={64} className="mx-auto ring-2" style={{ ['--tw-ring-color' as string]: accent }} />
      <div>
        <p className="text-xs font-bold truncate">{player.name.split(' ')[0]}</p>
        <p className="text-xs text-gray-400">{player.name.split(' ').slice(1).join(' ')}</p>
      </div>
      <div className="text-lg font-black" style={{ color: accent }}>
        {player.total_points.toLocaleString('pt-BR')}
      </div>
      <div className="text-xs text-gray-400 border-t border-white/10 pt-1">
        {functionLabels[player.function] ?? player.function}
      </div>
      {player.current_streak > 0 && (
        <div className="absolute top-1 right-1 text-xs">🔥{player.current_streak}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add Google Fonts for Missão Hexa**

In `app/layout.tsx`, add Bebas Neue alongside Inter:
```tsx
import { Inter, Bebas_Neue } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
// Apply both: className={`${inter.variable} ${bebas.variable}`}
```

In `tailwind.config.ts` extend fonts:
```ts
fontFamily: {
  sans: ['var(--font-inter)', 'sans-serif'],
  heading: ['var(--font-bebas)', 'sans-serif'],
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/theme/ components/game/PlayerCard.tsx app/layout.tsx tailwind.config.ts
git commit -m "feat: Missão Hexa visual theme — player cards, fonts, CSS variables"
```

---

## Task 19: Ranking CSV Export + Points History (Manager) + Polish

**Files:**
- Create: `app/api/rankings/export/route.ts`
- Create: `app/(manager)/points/history/page.tsx`

- [ ] **Step 1: Ranking CSV export**

`app/api/rankings/export/route.ts`:
```ts
import { createClient } from '@/lib/supabase/server'
import { getRanking } from '@/lib/rankings/queries'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaign_id = searchParams.get('campaign_id')
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const supabase = await createClient()
  const ranking = await getRanking(supabase, { campaign_id })

  const header = 'Posição,Nome,Time,Função,Pontos Totais,Sequência Atual\n'
  const rows = ranking.map(r =>
    `${r.position},"${r.name}","${r.team_name ?? ''}","${r.function}",${r.total_points},${r.current_streak}`
  ).join('\n')

  return new NextResponse(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ranking-${campaign_id}.csv"`,
    }
  })
}
```

- [ ] **Step 2: Manager points history / audit page**

`app/(manager)/points/history/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default async function PointsHistoryPage() {
  await requireRole('manager')
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('*, users(name), scoring_rules(name), campaigns(name), point_audit_logs(action, changed_by, reason, created_at, users(name))')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Auditoria de Pontos</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Data','Participante','Critério','Pontos','Status','Campanha','Lançado por'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions?.map(tx => (
              <tr key={tx.id} className={`border-t ${tx.status === 'reversed' ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {format(new Date(tx.event_date), 'dd/MM/yy')}
                </td>
                <td className="px-3 py-2 font-medium">{(tx.users as any)?.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{(tx.scoring_rules as any)?.name ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge variant={tx.points > 0 ? 'default' : 'destructive'} className="text-xs">
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={tx.status === 'active' ? 'outline' : 'secondary'} className="text-xs">
                    {tx.status === 'active' ? 'Ativo' : 'Estornado'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{(tx.campaigns as any)?.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{tx.origin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Final commit**

```bash
git add app/api/rankings/export/ app/\(manager\)/points/history/
git commit -m "feat: ranking CSV export, manager audit history — MVP complete"
```

---

## Verification

After all tasks, verify end-to-end:

1. `npm run dev` starts without errors
2. `npm test` — all unit tests pass
3. Login with a `@scmidia.com.br` Google account
4. Manager: create campaign → add participants → configure rules → launch a point → verify TV panel shows celebration animation → check participant sees the point in their dashboard and notification bell
5. Participant: view ranking (updates in <2s after point launch), view feed, view history
6. TV panel: open `/display/missao-hexa?token=<token>` in a second browser tab — verify ranking updates and celebration fires when manager launches a point
7. Export ranking CSV: download and open in Excel
8. `git log --oneline` — verify 15+ atomic commits

---

## Out of Scope (Phase 2)

- Salesforce webhook integration
- SAP B1 data import
- Automatic bonus trigger evaluation (beyond streak milestones)
- PWA / push notifications
- Multi-tenancy
