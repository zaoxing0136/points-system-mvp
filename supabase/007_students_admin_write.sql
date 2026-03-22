-- 管理员维护学生主档；老师只读学生主档用于建班检索
alter table public.students enable row level security;

drop policy if exists students_select_admin_teacher on public.students;
drop policy if exists students_insert_admin_only on public.students;
drop policy if exists students_update_admin_only on public.students;
drop policy if exists students_delete_admin_only on public.students;

create policy students_select_admin_teacher
on public.students
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

create policy students_insert_admin_only
on public.students
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

create policy students_update_admin_only
on public.students
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

create policy students_delete_admin_only
on public.students
for delete
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.role = 'admin'
  )
);
