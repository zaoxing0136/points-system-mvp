alter table public.point_ledger
  drop constraint if exists point_ledger_action_type_check;

alter table public.point_ledger
  add constraint point_ledger_action_type_check
  check (action_type in ('add', 'deduct', 'batch_add', 'seed'));
