create extension if not exists pgcrypto;

create table if not exists public.level_tiers (
  id uuid primary key default gen_random_uuid(),
  level_no integer not null unique check (level_no between 1 and 9),
  level_name text not null,
  threshold integer not null default 0 check (threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_level_tiers_active_order on public.level_tiers (is_active, level_no);

drop trigger if exists level_tiers_set_updated_at on public.level_tiers;
create trigger level_tiers_set_updated_at
before update on public.level_tiers
for each row
execute function public.set_updated_at();

insert into public.level_tiers (level_no, level_name, threshold, is_active)
values
  (1, '1段', 0, true),
  (2, '2段', 20, true),
  (3, '3段', 40, true),
  (4, '4段', 60, true),
  (5, '5段', 85, true),
  (6, '6段', 115, true),
  (7, '7段', 150, true),
  (8, '8段', 190, true),
  (9, '9段', 240, true)
on conflict (level_no) do nothing;
