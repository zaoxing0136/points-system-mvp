-- Student lifecycle controls: keep using the existing `pending_merge`
-- status as the storage value for "停用", and align read views so stopped
-- students no longer appear in rosters or badge leaderboards.

create or replace view public.class_student_roster as
select
  cs.class_id,
  cs.student_id,
  cs.joined_at,
  cs.member_status,
  cs.joined_by_id,
  cs.notes,
  s.student_code,
  s.legal_name,
  s.display_name,
  s.avatar_url,
  s.grade,
  s.status as student_status,
  coalesce(ps.total_points, 0) as total_points,
  coalesce(ps.progress_7d, 0) as progress_7d,
  ps.last_point_at
from public.class_students cs
join public.students s on s.id = cs.student_id
left join public.student_points_summary ps on ps.student_id = cs.student_id
where s.status not in ('merged', 'pending_merge');

create or replace view public.student_badge_progress as
select
  s.id as student_id,
  s.student_code,
  s.legal_name,
  s.display_name,
  s.avatar_url,
  s.grade,
  s.status,
  bd.id as badge_definition_id,
  bd.code,
  bd.name as badge_name,
  bd.description,
  bd.event_label,
  bd.icon_token,
  bd.threshold,
  bd.is_active,
  bd.sort_order,
  count(sbe.id)::integer as event_count,
  greatest(bd.threshold - count(sbe.id)::integer, 0) as remaining_count,
  sbu.unlocked_at,
  sbu.source_event_count,
  sbu.threshold_snapshot
from public.students s
cross join public.badge_definitions bd
left join public.student_badge_events sbe
  on sbe.student_id = s.id
 and sbe.badge_definition_id = bd.id
left join public.student_badge_unlocks sbu
  on sbu.student_id = s.id
 and sbu.badge_definition_id = bd.id
where s.status not in ('merged', 'pending_merge')
  and bd.is_active = true
  and (
    public.is_admin_user()
    or public.can_teacher_access_student(s.id)
    or auth.role() = 'service_role'
  )
group by
  s.id,
  s.student_code,
  s.legal_name,
  s.display_name,
  s.avatar_url,
  s.grade,
  s.status,
  bd.id,
  bd.code,
  bd.name,
  bd.description,
  bd.event_label,
  bd.icon_token,
  bd.threshold,
  bd.is_active,
  bd.sort_order,
  sbu.unlocked_at,
  sbu.source_event_count,
  sbu.threshold_snapshot;

alter view public.student_badge_progress set (security_invoker = true);

create or replace view public.badge_leaderboard as
with event_summary as (
  select
    sbe.student_id,
    count(*)::integer as event_count
  from public.student_badge_events sbe
  group by sbe.student_id
),
unlock_summary as (
  select
    sbu.student_id,
    count(*)::integer as unlocked_count,
    max(sbu.unlocked_at) as latest_unlocked_at,
    string_agg(bd.name, ' · ' order by bd.sort_order asc, bd.created_at asc) as unlocked_badge_names
  from public.student_badge_unlocks sbu
  join public.badge_definitions bd on bd.id = sbu.badge_definition_id
  where bd.is_active = true
  group by sbu.student_id
)
select
  s.id as student_id,
  s.student_code,
  s.legal_name,
  s.display_name,
  s.avatar_url,
  s.grade,
  s.status,
  coalesce(us.unlocked_count, 0) as unlocked_count,
  coalesce(es.event_count, 0) as event_count,
  us.latest_unlocked_at,
  coalesce(us.unlocked_badge_names, '') as unlocked_badge_names
from public.students s
left join event_summary es on es.student_id = s.id
left join unlock_summary us on us.student_id = s.id
where s.status not in ('merged', 'pending_merge')
  and (coalesce(us.unlocked_count, 0) > 0 or coalesce(es.event_count, 0) > 0);
