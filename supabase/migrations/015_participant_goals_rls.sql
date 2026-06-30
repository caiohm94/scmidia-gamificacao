alter table participant_goals enable row level security;

create policy "goals_select" on participant_goals for select
  using (user_id = auth.uid() or auth_role() = 'manager');
