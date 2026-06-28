-- Usa foto da campanha (photo_url) como prioridade, fallback para avatar global do usuário
create or replace view campaign_rankings as
select
  cp.campaign_id,
  cp.user_id,
  u.name,
  coalesce(cp.photo_url, u.avatar_url) as avatar_url,
  u.function,
  t.name  as team_name,
  t.color as team_color,
  t.id    as team_id,
  coalesce(sum(pt.points) filter (where pt.status = 'active'), 0) as total_points,
  cp.current_streak,
  cp.longest_streak,
  rank() over (
    partition by cp.campaign_id
    order by coalesce(sum(pt.points) filter (where pt.status = 'active'), 0) desc
  ) as position
from campaign_participants cp
join users u on u.id = cp.user_id
left join teams t on t.id = u.team_id
left join point_transactions pt
  on pt.user_id = cp.user_id and pt.campaign_id = cp.campaign_id
group by cp.campaign_id, cp.user_id, u.name, cp.photo_url, u.avatar_url,
         u.function, t.name, t.color, t.id,
         cp.current_streak, cp.longest_streak;
