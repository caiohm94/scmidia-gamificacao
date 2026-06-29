alter table scoring_rules
  add column if not exists value_type text not null default 'number',
  add column if not exists decimal_places integer not null default 0;

alter table scoring_rules
  drop constraint if exists scoring_rules_value_type_check;

alter table scoring_rules
  add constraint scoring_rules_value_type_check
  check (value_type in ('number', 'currency'));
