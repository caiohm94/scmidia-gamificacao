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
