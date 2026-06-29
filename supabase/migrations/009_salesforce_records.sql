-- Registros individuais importados do Salesforce
-- Deduplicação via unique(scoring_rule_id, sf_id): cada registro SF só entra uma vez por regra
create table if not exists salesforce_records (
  id              uuid        primary key default gen_random_uuid(),
  scoring_rule_id uuid        not null references scoring_rules(id) on delete cascade,
  campaign_id     uuid        not null references campaigns(id) on delete cascade,
  sf_id           text        not null,
  sf_created_at   timestamptz,
  imported_at     timestamptz not null default now(),
  owner_name      text,
  sf_alias        text,
  account_name    text,
  description     text,
  user_id         uuid        references users(id),
  transaction_id  uuid        references point_transactions(id),
  unique(scoring_rule_id, sf_id)
);

create index if not exists idx_sf_records_rule
  on salesforce_records(scoring_rule_id, imported_at desc);

create index if not exists idx_sf_records_campaign
  on salesforce_records(campaign_id, imported_at desc);
