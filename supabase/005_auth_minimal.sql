create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher')),
  phone text not null,
  display_name text not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_phone_key unique (phone),
  constraint user_profiles_teacher_role_check check (
    role = 'admin' or (role = 'teacher' and teacher_id is not null)
  )
);

create unique index if not exists idx_user_profiles_teacher_id_unique
  on public.user_profiles(teacher_id)
  where teacher_id is not null;

create index if not exists idx_user_profiles_role_active
  on public.user_profiles(role, is_active);

create index if not exists idx_user_profiles_phone
  on public.user_profiles(phone);

create index if not exists idx_teachers_phone
  on public.teachers(phone);