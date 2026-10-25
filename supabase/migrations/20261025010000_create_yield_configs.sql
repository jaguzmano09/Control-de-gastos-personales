-- Configuración e historial de tasas para cuentas y bolsillos de alto rendimiento.
-- La vigencia de una tasa termina el día anterior a valid_from de la siguiente tasa.

create table public.yield_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yield_configs_target_chk check (
    (wallet_id is not null and account_id is null)
    or (wallet_id is null and account_id is not null)
  )
);

create unique index yield_configs_wallet_uidx
  on public.yield_configs(user_id, wallet_id)
  where wallet_id is not null;

create unique index yield_configs_account_uidx
  on public.yield_configs(user_id, account_id)
  where account_id is not null;

create table public.yield_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  config_id uuid not null references public.yield_configs(id) on delete cascade,
  ea_percent numeric(7, 4) not null check (ea_percent >= 0 and ea_percent <= 100),
  valid_from date not null,
  created_at timestamptz not null default now(),
  unique (config_id, valid_from)
);

create index yield_rates_config_date_idx
  on public.yield_rates(config_id, valid_from desc);

create or replace function public.validate_yield_config()
returns trigger
language plpgsql
as $$
begin
  if new.wallet_id is not null and not exists (
    select 1
    from public.wallets w
    where w.id = new.wallet_id
      and w.user_id = new.user_id
  ) then
    raise exception 'El bolsillo no pertenece al usuario';
  end if;

  if new.account_id is not null then
    if not exists (
      select 1
      from public.accounts a
      where a.id = new.account_id
        and a.user_id = new.user_id
    ) then
      raise exception 'La cuenta no pertenece al usuario';
    end if;

    if exists (
      select 1
      from public.accounts a
      where a.id = new.account_id
        and a.has_wallets
    ) then
      raise exception 'Esta cuenta tiene bolsillos; configura el rendimiento en cada bolsillo';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_yield_configs_validate
before insert or update on public.yield_configs
for each row execute function public.validate_yield_config();

create trigger trg_yield_configs_updated
before update on public.yield_configs
for each row execute function public.set_updated_at();

create or replace function public.validate_yield_rate()
returns trigger
language plpgsql
as $$
declare
  config_user_id uuid;
  config_start_date date;
begin
  select c.user_id, c.start_date
    into config_user_id, config_start_date
  from public.yield_configs c
  where c.id = new.config_id;

  if not found then
    raise exception 'La configuración de rendimiento no existe';
  end if;

  if config_user_id <> new.user_id then
    raise exception 'La configuración no pertenece al usuario';
  end if;

  if new.valid_from < config_start_date then
    raise exception 'La tasa no puede iniciar antes de activar el rendimiento';
  end if;

  return new;
end;
$$;

create trigger trg_yield_rates_validate
before insert or update on public.yield_rates
for each row execute function public.validate_yield_rate();

-- Una cuenta con configuración propia no puede convertirse en cuenta con bolsillos.
create or replace function public.prevent_account_wallet_mode_change()
returns trigger
language plpgsql
as $$
begin
  if new.has_wallets and not old.has_wallets and exists (
    select 1
    from public.yield_configs c
    where c.account_id = new.id
  ) then
    raise exception 'Elimina el rendimiento de la cuenta antes de crear bolsillos';
  end if;

  return new;
end;
$$;

create trigger trg_accounts_prevent_yield_wallet_mode
before update on public.accounts
for each row execute function public.prevent_account_wallet_mode_change();

-- También se bloquea crear un bolsillo por otra vía distinta de la aplicación.
create or replace function public.prevent_wallet_for_yield_account()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.yield_configs c
    where c.account_id = new.account_id
  ) then
    raise exception 'Elimina el rendimiento de la cuenta antes de crear bolsillos';
  end if;

  return new;
end;
$$;

create trigger trg_wallets_prevent_account_yield
before insert or update on public.wallets
for each row execute function public.prevent_wallet_for_yield_account();

alter table public.yield_configs enable row level security;
alter table public.yield_rates enable row level security;

create policy "yield_configs_owner" on public.yield_configs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "yield_rates_owner" on public.yield_rates
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.yield_configs, public.yield_rates to authenticated;

revoke all on public.yield_configs, public.yield_rates from anon;
