create table if not exists salesforce_sync_logs (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid references scoring_rules(id) on delete set null,
  rule_name     text not null default '',
  triggered_by  uuid references users(id) on delete set null,
  triggered_at  timestamptz not null default now(),
  sf_found      integer not null default 0,
  inserted      integer not null default 0,
  skipped       integer not null default 0,
  errors        jsonb not null default '[]'::jsonb,
  status        text not null default 'no_match'
    check (status in ('success', 'partial', 'no_match', 'error'))
);

create index if not exists salesforce_sync_logs_triggered_at_idx on salesforce_sync_logs (triggered_at desc);
create index if not exists salesforce_sync_logs_rule_id_idx on salesforce_sync_logs (rule_id);
