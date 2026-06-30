-- TV display (anon client) needs to read feed_events and celebration_events.
-- Security is handled at app level via display_token check.
-- Dropping the restrictive policies and replacing with open-select for these
-- public-facing display tables.

drop policy if exists "feed_select"          on feed_events;
drop policy if exists "celebrations_select"  on celebration_events;

create policy "feed_select" on feed_events
  for select using (true);

create policy "celebrations_select" on celebration_events
  for select using (true);

-- Also enable Supabase Realtime publication for both tables
-- (no-op if already added; safe to run multiple times via DO block)
do $$
begin
  begin
    alter publication supabase_realtime add table feed_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table celebration_events;
  exception when duplicate_object then null;
  end;
end;
$$;
