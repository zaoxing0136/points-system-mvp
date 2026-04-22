alter table public.subjects enable row level security;

drop policy if exists subjects_select_admin_teacher on public.subjects;
drop policy if exists subjects_insert_admin_only on public.subjects;
drop policy if exists subjects_update_admin_only on public.subjects;

create policy subjects_select_admin_teacher
on public.subjects
for select
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.role in ('admin', 'teacher')
  )
);

create policy subjects_insert_admin_only
on public.subjects
for insert
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.role = 'admin'
  )
);

create policy subjects_update_admin_only
on public.subjects
for update
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.role = 'admin'
  )
);
