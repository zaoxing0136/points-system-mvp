begin;

insert into public.campuses (id, name, code, status)
values
  ('a5555555-5555-5555-5555-555555555555', '东新', 'DONGXIN', 'active'),
  ('c1111111-1111-1111-1111-111111111111', '城北', 'CHENGBEI', 'active'),
  ('a6666666-6666-6666-6666-666666666666', '江湾', 'JIANGWAN', 'active'),
  ('a4444444-4444-4444-4444-444444444444', '三墩', 'SANDUN', 'active'),
  ('c2222222-2222-2222-2222-222222222222', '观成', 'GUANCHENG', 'active'),
  ('c3333333-3333-3333-3333-333333333333', '文三', 'WENSAN', 'active'),
  ('c4444444-4444-4444-4444-444444444444', '解放路', 'JIEFANGLU', 'active')
on conflict (code) do update
set
  name = excluded.name,
  status = 'active';

update public.campuses
set status = 'inactive'
where code not in ('DONGXIN', 'CHENGBEI', 'JIANGWAN', 'SANDUN', 'GUANCHENG', 'WENSAN', 'JIEFANGLU');

update public.classes
set status = 'archived'
where campus_id in (
  select id
  from public.campuses
  where status = 'inactive'
)
and status <> 'archived';

update public.teachers
set campus_id = null
where campus_id in (
  select id
  from public.campuses
  where status = 'inactive'
);

update public.point_rules
set
  category = 'classroom',
  rule_name = '准时到课',
  points = 1,
  sort_order = 60,
  is_active = true,
  is_common = true
where id = '84444444-4444-4444-4444-444444444441'
   or lower(rule_name) = lower('准时到课');

insert into public.point_rules (id, category, rule_name, points, sort_order, is_active, is_common)
values
  ('81111111-1111-1111-1111-111111111191', 'classroom', '课上提醒', -1, 110, true, false),
  ('81111111-1111-1111-1111-111111111192', 'classroom', '影响秩序', -2, 120, true, false),
  ('81111111-1111-1111-1111-111111111193', 'classroom', '未按要求完成', -1, 130, true, false),
  ('81111111-1111-1111-1111-111111111194', 'classroom', '需要再次提醒', -1, 140, true, false)
on conflict (id) do update
set
  category = excluded.category,
  rule_name = excluded.rule_name,
  points = excluded.points,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_common = excluded.is_common;

update public.badge_definitions
set
  event_label = '准时到课',
  description = '准时到课累计达到阈值后解锁。'
where code = 'persistence_star';

delete from public.student_badge_unlocks
where badge_definition_id in (
  select id
  from public.badge_definitions
  where code = 'persistence_star'
);

delete from public.student_badge_events
where badge_definition_id in (
  select id
  from public.badge_definitions
  where code = 'persistence_star'
);

commit;
