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
