-- Fix: also insert celebration_events for negative points (falta/yellow card).
-- Previously the trigger only fired for points > 0.

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

  -- Fire celebration for both positive (gol) and negative (falta)
  if new.points != 0 then
    insert into celebration_events (campaign_id, user_id, points, rule_name, message)
    values (new.campaign_id, new.user_id, new.points,
      coalesce(v_rule_name,'Bônus'),
      v_user_name || case when new.points < 0 then ' levou falta!' else ' marcou ' || new.points || ' pontos!' end);
  end if;

  insert into notifications (user_id, campaign_id, type, title, body)
  values (new.user_id, new.campaign_id, 'point_earned',
    case when new.points < 0 then 'Você recebeu uma falta (' || new.points || ' pts)'
         else 'Você recebeu ' || new.points || ' pontos!' end,
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
