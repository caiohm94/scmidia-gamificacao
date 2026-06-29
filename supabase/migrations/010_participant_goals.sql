alter type transaction_origin add value if not exists 'meta';

create table if not exists participant_goals (
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

create index if not exists idx_goals_rule_period
  on participant_goals(scoring_rule_id, period_date);

create index if not exists idx_goals_user
  on participant_goals(user_id, period_date);
