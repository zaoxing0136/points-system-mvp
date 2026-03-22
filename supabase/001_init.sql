create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint campuses_code_key unique (code),
  constraint campuses_name_key unique (name)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint subjects_code_key unique (code),
  constraint subjects_name_key unique (name)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text,
  phone text,
  role text not null default 'teacher' check (role in ('teacher', 'office', 'admin')),
  campus_id uuid references public.campuses(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null,
  legal_name text not null,
  display_name text not null,
  gender text check (gender in ('male', 'female', 'unknown')),
  grade text,
  birth_year integer check (birth_year between 1990 and 2100),
  parent_name text,
  parent_phone text,
  avatar_url text,
  status text not null default 'normal' check (status in ('normal', 'temporary', 'pending_merge', 'merged')),
  created_by_role text not null default 'admin' check (created_by_role in ('admin', 'teacher', 'system', 'office')),
  created_by_id uuid,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint students_student_code_key unique (student_code)
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  schedule_text text,
  class_type text not null default 'regular' check (class_type in ('regular', 'intensive', 'trial', 'camp')),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_by_id uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  member_status text not null default 'active' check (member_status in ('active', 'paused', 'removed')),
  joined_by_id uuid references public.teachers(id) on delete set null,
  notes text,
  constraint class_students_unique unique (class_id, student_id)
);

create table if not exists public.point_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('classroom', 'homework', 'project', 'habits')),
  rule_name text not null,
  points integer not null check (points between -50 and 50),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  is_common boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  campus_id uuid references public.campuses(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  rule_id uuid references public.point_rules(id) on delete set null,
  rule_name_snapshot text not null,
  category_snapshot text not null check (category_snapshot in ('classroom', 'homework', 'project', 'habits')),
  points_delta integer not null,
  action_type text not null check (action_type in ('add', 'deduct', 'batch_add')),
  remark text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_teachers_campus_id on public.teachers(campus_id);
create index if not exists idx_teachers_status on public.teachers(status);
create index if not exists idx_students_status on public.students(status);
create index if not exists idx_students_parent_phone on public.students(parent_phone);
create index if not exists idx_students_legal_name on public.students(legal_name);
create index if not exists idx_students_grade on public.students(grade);
create index if not exists idx_students_dup_high on public.students(legal_name, parent_phone);
create index if not exists idx_students_dup_medium on public.students(legal_name, grade);
create index if not exists idx_classes_campus_id on public.classes(campus_id);
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_classes_subject_id on public.classes(subject_id);
create index if not exists idx_classes_status on public.classes(status);
create index if not exists idx_class_students_student_id on public.class_students(student_id);
create index if not exists idx_class_students_member_status on public.class_students(member_status);
create index if not exists idx_point_rules_category_order on public.point_rules(category, is_active desc, is_common desc, sort_order asc);
create index if not exists idx_point_ledger_student_created_at on public.point_ledger(student_id, created_at desc);
create index if not exists idx_point_ledger_class_created_at on public.point_ledger(class_id, created_at desc);
create index if not exists idx_point_ledger_campus_created_at on public.point_ledger(campus_id, created_at desc);
create index if not exists idx_point_ledger_teacher_created_at on public.point_ledger(teacher_id, created_at desc);
create index if not exists idx_point_ledger_rule_id on public.point_ledger(rule_id);
create index if not exists idx_point_ledger_action_type on public.point_ledger(action_type);

create or replace trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

create or replace view public.student_points_summary as
select
  s.id as student_id,
  s.student_code,
  s.legal_name,
  s.display_name,
  s.avatar_url,
  s.grade,
  s.status,
  coalesce(sum(pl.points_delta), 0)::integer as total_points,
  coalesce(sum(case when pl.created_at >= timezone('utc', now()) - interval '7 days' then pl.points_delta else 0 end), 0)::integer as progress_7d,
  max(pl.created_at) as last_point_at
from public.students s
left join public.point_ledger pl on pl.student_id = s.id
group by s.id, s.student_code, s.legal_name, s.display_name, s.avatar_url, s.grade, s.status;

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
left join public.student_points_summary ps on ps.student_id = cs.student_id;
