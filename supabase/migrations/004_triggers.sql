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
