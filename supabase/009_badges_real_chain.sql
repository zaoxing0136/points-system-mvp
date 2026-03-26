create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text not null default '',
  event_label text not null,
  icon_token text,
  threshold integer not null default 10 check (threshold > 0 and threshold <= 9999),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint badge_definitions_code_key unique (code)
);

create table if not exists public.student_badge_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_definition_id uuid not null references public.badge_definitions(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_badge_unlocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_definition_id uuid not null references public.badge_definitions(id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  source_event_count integer,
  threshold_snapshot integer,
  created_at timestamptz not null default timezone('utc', now()),
  constraint student_badge_unlocks_unique unique (student_id, badge_definition_id)
);

create index if not exists idx_badge_definitions_active_sort
  on public.badge_definitions(is_active, sort_order asc, created_at asc);

create index if not exists idx_student_badge_events_student_badge_created
  on public.student_badge_events(student_id, badge_definition_id, created_at desc);

create index if not exists idx_student_badge_events_class_created
  on public.student_badge_events(class_id, created_at desc);

create index if not exists idx_student_badge_events_teacher_created
  on public.student_badge_events(teacher_id, created_at desc);

create index if not exists idx_student_badge_unlocks_student_unlocked
  on public.student_badge_unlocks(student_id, unlocked_at desc);

create index if not exists idx_student_badge_unlocks_badge_unlocked
  on public.student_badge_unlocks(badge_definition_id, unlocked_at desc);

drop trigger if exists badge_definitions_set_updated_at on public.badge_definitions;
create trigger badge_definitions_set_updated_at
before update on public.badge_definitions
for each row
execute function public.set_updated_at();

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.role = 'admin'
      and up.is_active = true
  );
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.teacher_id
  from public.user_profiles up
  where up.id = auth.uid()
    and up.role = 'teacher'
    and up.is_active = true
  limit 1;
$$;

create or replace function public.can_teacher_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_students cs
    join public.classes c on c.id = cs.class_id
    where cs.student_id = p_student_id
      and cs.member_status = 'active'
      and c.teacher_id = public.current_teacher_id()
  );
$$;

create or replace function public.can_teacher_manage_badge_event(
  p_class_id uuid,
  p_student_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_teacher_id() is not null
    and public.current_teacher_id() = p_teacher_id
    and exists (
      select 1
      from public.classes c
      join public.class_students cs on cs.class_id = c.id
      where c.id = p_class_id
        and c.teacher_id = public.current_teacher_id()
        and cs.student_id = p_student_id
        and cs.member_status = 'active'
    );
$$;

create or replace function public.sync_student_badge_unlock_for_event(
  p_student_id uuid,
  p_badge_definition_id uuid,
  p_unlocked_at timestamptz default timezone('utc', now())
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold integer;
  v_event_count integer;
begin
  select bd.threshold
  into v_threshold
  from public.badge_definitions bd
  where bd.id = p_badge_definition_id
    and bd.is_active = true;

  if v_threshold is null then
    return;
  end if;

  select count(*)::integer
  into v_event_count
  from public.student_badge_events sbe
  where sbe.student_id = p_student_id
    and sbe.badge_definition_id = p_badge_definition_id;

  if v_event_count < v_threshold then
    return;
  end if;

  insert into public.student_badge_unlocks (
    student_id,
    badge_definition_id,
    unlocked_at,
    source_event_count,
    threshold_snapshot
  )
  values (
    p_student_id,
    p_badge_definition_id,
    coalesce(p_unlocked_at, timezone('utc', now())),
    v_event_count,
    v_threshold
  )
  on conflict (student_id, badge_definition_id) do nothing;
end;
$$;

create or replace function public.sync_all_student_badge_unlocks_for_definition(p_badge_definition_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_badge_unlocks (
    student_id,
    badge_definition_id,
    unlocked_at,
    source_event_count,
    threshold_snapshot
  )
  select
    sbe.student_id,
    bd.id,
    timezone('utc', now()),
    count(sbe.id)::integer as source_event_count,
    bd.threshold
  from public.badge_definitions bd
  join public.student_badge_events sbe on sbe.badge_definition_id = bd.id
  where bd.id = p_badge_definition_id
    and bd.is_active = true
  group by sbe.student_id, bd.id, bd.threshold
  having count(sbe.id) >= bd.threshold
  on conflict (student_id, badge_definition_id) do nothing;
end;
$$;

create or replace function public.handle_student_badge_event_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_student_badge_unlock_for_event(new.student_id, new.badge_definition_id, new.created_at);
  return new;
end;
$$;

create or replace function public.handle_badge_definition_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_all_student_badge_unlocks_for_definition(new.id);
  return new;
end;
$$;

drop trigger if exists student_badge_events_unlock_trigger on public.student_badge_events;
create trigger student_badge_events_unlock_trigger
after insert on public.student_badge_events
for each row
execute function public.handle_student_badge_event_insert();

drop trigger if exists badge_definitions_unlock_backfill_trigger on public.badge_definitions;
create trigger badge_definitions_unlock_backfill_trigger
after insert or update of threshold, is_active on public.badge_definitions
for each row
execute function public.handle_badge_definition_sync();

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
where s.status <> 'merged'
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
where s.status <> 'merged'
  and (coalesce(us.unlocked_count, 0) > 0 or coalesce(es.event_count, 0) > 0);

alter table public.badge_definitions enable row level security;
alter table public.student_badge_events enable row level security;
alter table public.student_badge_unlocks enable row level security;

drop policy if exists badge_definitions_select_admin on public.badge_definitions;
drop policy if exists badge_definitions_select_teacher_active on public.badge_definitions;
drop policy if exists badge_definitions_insert_admin_only on public.badge_definitions;
drop policy if exists badge_definitions_update_admin_only on public.badge_definitions;
drop policy if exists badge_definitions_delete_admin_only on public.badge_definitions;

create policy badge_definitions_select_admin
on public.badge_definitions
for select
using (public.is_admin_user());

create policy badge_definitions_select_teacher_active
on public.badge_definitions
for select
using (public.current_teacher_id() is not null and is_active = true);

create policy badge_definitions_insert_admin_only
on public.badge_definitions
for insert
with check (public.is_admin_user());

create policy badge_definitions_update_admin_only
on public.badge_definitions
for update
using (public.is_admin_user())
with check (public.is_admin_user());

create policy badge_definitions_delete_admin_only
on public.badge_definitions
for delete
using (public.is_admin_user());

drop policy if exists student_badge_events_select_admin on public.student_badge_events;
drop policy if exists student_badge_events_select_teacher_owned on public.student_badge_events;
drop policy if exists student_badge_events_insert_admin on public.student_badge_events;
drop policy if exists student_badge_events_insert_teacher_owned on public.student_badge_events;

create policy student_badge_events_select_admin
on public.student_badge_events
for select
using (public.is_admin_user());

create policy student_badge_events_select_teacher_owned
on public.student_badge_events
for select
using (
  public.current_teacher_id() is not null
  and (
    teacher_id = public.current_teacher_id()
    or exists (
      select 1
      from public.classes c
      where c.id = class_id
        and c.teacher_id = public.current_teacher_id()
    )
  )
);

create policy student_badge_events_insert_admin
on public.student_badge_events
for insert
with check (public.is_admin_user());

create policy student_badge_events_insert_teacher_owned
on public.student_badge_events
for insert
with check (
  public.current_teacher_id() is not null
  and exists (
    select 1
    from public.badge_definitions bd
    where bd.id = badge_definition_id
      and bd.is_active = true
  )
  and public.can_teacher_manage_badge_event(class_id, student_id, teacher_id)
);

drop policy if exists student_badge_unlocks_select_admin on public.student_badge_unlocks;
drop policy if exists student_badge_unlocks_select_teacher_owned on public.student_badge_unlocks;

create policy student_badge_unlocks_select_admin
on public.student_badge_unlocks
for select
using (public.is_admin_user());

create policy student_badge_unlocks_select_teacher_owned
on public.student_badge_unlocks
for select
using (public.can_teacher_access_student(student_id));

grant select, insert, update, delete on public.badge_definitions to authenticated;
grant select, insert on public.student_badge_events to authenticated;
grant select on public.student_badge_unlocks to authenticated;
grant select on public.student_badge_progress to authenticated;
grant select on public.badge_leaderboard to authenticated, anon;

insert into public.badge_definitions (
  code,
  name,
  description,
  event_label,
  icon_token,
  threshold,
  is_active,
  sort_order
)
values
  ('focus_star', '专注星', '专注听课累计达到阈值后解锁。', '专注听课', '⭐', 10, true, 10),
  ('expression_star', '表达星', '积极表达累计达到阈值后解锁。', '积极表达', '🗣️', 10, true, 20),
  ('cooperation_star', '协作星', '帮助同学或合作良好累计达到阈值后解锁。', '主动帮助', '🤝', 10, true, 30),
  ('persistence_star', '坚持星', '坚持完成任务累计达到阈值后解锁。', '坚持完成', '🏁', 10, true, 40)
on conflict (code) do nothing;
