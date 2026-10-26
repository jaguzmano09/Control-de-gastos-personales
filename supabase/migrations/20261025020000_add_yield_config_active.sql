alter table public.yield_configs
  add column is_active boolean not null default true;
