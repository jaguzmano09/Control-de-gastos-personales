-- Categories are assigned through income/transfer transaction triggers only.
create or replace function public.validate_account_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category_owner uuid;
begin
  if new.category_id is distinct from (case when tg_op = 'UPDATE' then old.category_id else null end)
    and pg_trigger_depth() < 2 then
    raise exception 'Assign account categories through an income or transfer transaction';
  end if;

  if new.category_id is not null then
    if new.has_wallets or exists (select 1 from public.wallets w where w.account_id = new.id) then
      raise exception 'Accounts with pockets use a separate category per pocket';
    end if;
    select user_id into category_owner from public.categories where id = new.category_id;
    if category_owner is distinct from new.user_id then
      raise exception 'Account category must belong to its owner';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_wallet_category_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_owner uuid;
  category_owner uuid;
begin
  if new.category_id is distinct from (case when tg_op = 'UPDATE' then old.category_id else null end)
    and pg_trigger_depth() < 2 then
    raise exception 'Assign pocket categories through an income or transfer transaction';
  end if;

  select user_id into account_owner from public.accounts where id = new.account_id;
  if account_owner is distinct from new.user_id then
    raise exception 'Pocket account must belong to the pocket owner';
  end if;
  if new.category_id is not null then
    select user_id into category_owner from public.categories where id = new.category_id;
    if category_owner is distinct from new.user_id then
      raise exception 'Pocket category must belong to the pocket owner';
    end if;
  end if;
  return new;
end;
$$;

-- Return owner-scoped monthly allocation facts for account/pocket selectors.
create or replace function public.get_transaction_location_status(p_period_month date)
returns table (
  location_type text,
  location_id uuid,
  account_id uuid,
  account_name text,
  location_name text,
  category_id uuid,
  category_name text,
  assigned_amount numeric,
  rollover_amount numeric,
  transfer_in numeric,
  transfer_out numeric,
  spent numeric,
  available_amount numeric,
  budget_assigned boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with targets as (
    select
      'account'::text as location_type,
      a.id as location_id,
      a.id as account_id,
      a.name as account_name,
      a.name as location_name,
      a.category_id
    from public.accounts a
    where a.user_id = (select auth.uid())
      and not a.has_wallets
      and not exists (select 1 from public.wallets w where w.account_id = a.id)

    union all

    select
      'wallet'::text as location_type,
      w.id as location_id,
      a.id as account_id,
      a.name as account_name,
      w.name as location_name,
      w.category_id
    from public.wallets w
    join public.accounts a on a.id = w.account_id and a.user_id = w.user_id
    where w.user_id = (select auth.uid())
  ), budgets as (
    select
      'wallet'::text as location_type,
      b.wallet_id as location_id,
      b.assigned_amount,
      b.rollover_amount
    from public.wallet_budgets b
    where b.user_id = (select auth.uid())
      and b.period_month = p_period_month
      and b.wallet_id is not null

    union all

    select
      'account'::text as location_type,
      b.account_id as location_id,
      b.assigned_amount,
      b.rollover_amount
    from public.wallet_budgets b
    where b.user_id = (select auth.uid())
      and b.period_month = p_period_month
      and b.account_id is not null
      and b.wallet_id is null
  ), flows as (
    select
      'wallet'::text as location_type,
      t.wallet_id as location_id,
      0::numeric as transfer_in,
      t.amount as transfer_out,
      0::numeric as spent
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Transferencia'
      and t.status = 'confirmada'
      and t.wallet_id is not null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')

    union all

    select
      'wallet', t.destination_wallet_id, t.amount, 0::numeric, 0::numeric
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Transferencia'
      and t.status = 'confirmada'
      and t.destination_wallet_id is not null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')

    union all

    select
      'account', t.account_id, 0::numeric, t.amount, 0::numeric
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Transferencia'
      and t.status = 'confirmada'
      and t.wallet_id is null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')

    union all

    select
      'account', t.destination_account_id, t.amount, 0::numeric, 0::numeric
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Transferencia'
      and t.status = 'confirmada'
      and t.destination_account_id is not null
      and t.destination_wallet_id is null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')

    union all

    select 'wallet', t.wallet_id, 0::numeric, 0::numeric, t.amount
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Gasto'
      and t.status = 'confirmada'
      and t.wallet_id is not null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')

    union all

    select 'account', t.account_id, 0::numeric, 0::numeric, t.amount
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.type = 'Gasto'
      and t.status = 'confirmada'
      and t.wallet_id is null
      and t.occurred_at >= p_period_month
      and t.occurred_at < (p_period_month + interval '1 month')
  ), flow_totals as (
    select location_type, location_id,
      sum(transfer_in) as transfer_in,
      sum(transfer_out) as transfer_out,
      sum(spent) as spent
    from flows
    group by location_type, location_id
  ), status as (
    select
      t.location_type,
      t.location_id,
      t.account_id,
      t.account_name,
      t.location_name,
      t.category_id,
      c.name as category_name,
      coalesce(b.assigned_amount, 0) as assigned_amount,
      coalesce(b.rollover_amount, 0) as rollover_amount,
      coalesce(f.transfer_in, 0) as transfer_in,
      coalesce(f.transfer_out, 0) as transfer_out,
      coalesce(f.spent, 0) as spent
    from targets t
    left join budgets b using (location_type, location_id)
    left join flow_totals f using (location_type, location_id)
    left join public.categories c on c.id = t.category_id and c.user_id = (select auth.uid())
  )
  select
    s.location_type,
    s.location_id,
    s.account_id,
    s.account_name,
    s.location_name,
    s.category_id,
    s.category_name,
    s.assigned_amount,
    s.rollover_amount,
    s.transfer_in,
    s.transfer_out,
    s.spent,
    s.assigned_amount + s.rollover_amount + s.transfer_in - s.transfer_out - s.spent,
    (s.assigned_amount + s.rollover_amount > 0 or s.transfer_in > 0)
  from status s
  order by s.account_name, s.location_type, s.location_name;
$$;

revoke all on function public.get_transaction_location_status(date) from public, anon;
grant execute on function public.get_transaction_location_status(date) to authenticated;

-- A confirmed expense must use the assigned location category and a funded
-- monthly location budget. Overspending remains recordable by product rule.
create or replace function public.validate_expense_location_budget()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_owner uuid;
  account_name text;
  account_category uuid;
  account_has_wallets boolean;
  location_owner uuid;
  location_name text;
  location_category uuid;
  assigned_amount numeric := 0;
  rollover_amount numeric := 0;
  transfer_in numeric := 0;
  period_start date;
begin
  if new.type <> 'Gasto' or new.status <> 'confirmada' then
    return new;
  end if;

  select a.user_id, a.name, a.category_id,
    a.has_wallets or exists (select 1 from public.wallets w where w.account_id = a.id)
    into account_owner, account_name, account_category, account_has_wallets
  from public.accounts a
  where a.id = new.account_id;
  if account_owner is distinct from new.user_id then
    raise exception 'La cuenta seleccionada no pertenece a este usuario';
  end if;

  if account_has_wallets and new.wallet_id is null then
    raise exception 'La cuenta «%» organiza su presupuesto por bolsillos. Elige el bolsillo para registrar el gasto.', account_name;
  end if;

  if new.wallet_id is not null then
    select w.user_id, w.name, w.category_id
      into location_owner, location_name, location_category
    from public.wallets w
    where w.id = new.wallet_id and w.account_id = new.account_id;
    if location_owner is distinct from new.user_id then
      raise exception 'El bolsillo seleccionado no pertenece a la cuenta elegida';
    end if;
    location_name := account_name || ' / ' || location_name;
  else
    location_owner := account_owner;
    location_name := account_name;
    location_category := account_category;
  end if;

  if location_category is null then
    raise exception 'No se puede registrar el gasto: «%» no tiene una categoría asignada. Registra primero un ingreso o una transferencia para asignarla.', location_name;
  end if;
  if new.category_id is distinct from location_category then
    raise exception 'La categoría del gasto debe coincidir con la categoría asignada a «%»', location_name;
  end if;

  period_start := date_trunc('month', new.occurred_at::timestamp)::date;
  if new.wallet_id is not null then
    select coalesce(b.assigned_amount, 0), coalesce(b.rollover_amount, 0)
      into assigned_amount, rollover_amount
    from (select 1) seed
    left join public.wallet_budgets b
      on b.user_id = new.user_id and b.wallet_id = new.wallet_id and b.period_month = period_start;
    select coalesce(sum(t.amount), 0) into transfer_in
    from public.transactions t
    where t.user_id = new.user_id and t.type = 'Transferencia' and t.status = 'confirmada'
      and t.destination_wallet_id = new.wallet_id and t.destination_category_id = location_category
      and t.occurred_at >= period_start and t.occurred_at < (period_start + interval '1 month');
  else
    select coalesce(b.assigned_amount, 0), coalesce(b.rollover_amount, 0)
      into assigned_amount, rollover_amount
    from (select 1) seed
    left join public.wallet_budgets b
      on b.user_id = new.user_id and b.account_id = new.account_id and b.wallet_id is null and b.period_month = period_start;
    select coalesce(sum(t.amount), 0) into transfer_in
    from public.transactions t
    where t.user_id = new.user_id and t.type = 'Transferencia' and t.status = 'confirmada'
      and t.destination_account_id = new.account_id and t.destination_wallet_id is null
      and t.destination_category_id = location_category
      and t.occurred_at >= period_start and t.occurred_at < (period_start + interval '1 month');
  end if;

  if assigned_amount + rollover_amount <= 0 and transfer_in <= 0 then
    raise exception 'No se puede registrar el gasto: «%» tiene la categoría «%», pero no tiene presupuesto asignado para este mes. Registra un ingreso o recibe una transferencia en este destino.', location_name, (select c.name from public.categories c where c.id = location_category);
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_validate_expense_budget on public.transactions;
create trigger transactions_validate_expense_budget
before insert or update of type, status, user_id, occurred_at, account_id, wallet_id, category_id
on public.transactions
for each row execute function public.validate_expense_location_budget();
