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
