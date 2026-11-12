-- Backfill only unambiguous categories evidenced by confirmed November 2026 income.
with income_categories as (
  select user_id, account_id, (array_agg(distinct category_id))[1] as category_id
  from public.transactions
  where type = 'Ingreso'
    and status = 'confirmada'
    and category_id is not null
    and occurred_at >= date '2026-11-01'
    and occurred_at < date '2026-12-01'
  group by user_id, account_id
  having count(distinct category_id) = 1
)
update public.accounts a
set category_id = c.category_id
from income_categories c
where a.id = c.account_id
  and a.user_id = c.user_id
  and a.category_id is null;

with wallet_income_categories as (
  select user_id, wallet_id, (array_agg(distinct category_id))[1] as category_id
  from public.transactions
  where type = 'Ingreso'
    and status = 'confirmada'
    and wallet_id is not null
    and category_id is not null
    and occurred_at >= date '2026-11-01'
    and occurred_at < date '2026-12-01'
  group by user_id, wallet_id
  having count(distinct category_id) = 1
)
update public.wallets w
set category_id = c.category_id
from wallet_income_categories c
where w.id = c.wallet_id
  and w.user_id = c.user_id
  and w.category_id is null;

create or replace function public.validate_transaction_transfer()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_account_owner uuid;
  destination_account_owner uuid;
  source_wallet_account uuid;
  source_wallet_owner uuid;
  destination_wallet_account uuid;
  destination_wallet_owner uuid;
  source_category_owner uuid;
  destination_category_owner uuid;
  source_effective_category uuid;
  destination_effective_category uuid;
  source_account_category uuid;
  destination_account_category uuid;
  source_wallet_category uuid;
  destination_wallet_category uuid;
begin
  select user_id, category_id into source_account_owner, source_account_category
  from public.accounts where id = new.account_id;
  if source_account_owner is distinct from new.user_id then
    raise exception 'Source account must belong to the transaction owner';
  end if;

  if new.wallet_id is not null then
    select account_id, user_id, category_id
      into source_wallet_account, source_wallet_owner, source_wallet_category
    from public.wallets where id = new.wallet_id;
    if source_wallet_owner is distinct from new.user_id
      or source_wallet_account is distinct from new.account_id then
      raise exception 'Source wallet must belong to the source account owner';
    end if;
  end if;

  if new.status = 'confirmada' and new.type in ('Gasto', 'Ingreso', 'Transferencia') and new.category_id is null then
    raise exception 'A category is required for this transaction';
  end if;

  if new.type <> 'Transferencia' then
    if new.destination_account_id is not null
      or new.destination_wallet_id is not null
      or new.destination_category_id is not null then
      raise exception 'Destination fields are only valid for transfers';
    end if;

    if new.category_id is not null then
      select user_id into source_category_owner
      from public.categories where id = new.category_id;
      if source_category_owner is distinct from new.user_id then
        raise exception 'Category must belong to the transaction owner';
      end if;
    end if;

    if new.type = 'Ingreso' and new.status = 'confirmada' then
      source_effective_category := coalesce(source_wallet_category, source_account_category);
      if source_effective_category is null then
        if new.wallet_id is not null then
          update public.wallets set category_id = new.category_id
          where id = new.wallet_id and user_id = new.user_id and category_id is null;
        else
          update public.accounts set category_id = new.category_id
          where id = new.account_id and user_id = new.user_id and category_id is null;
        end if;
      elsif source_effective_category is distinct from new.category_id then
        raise exception 'Income category must match its assigned account or pocket category';
      end if;
    end if;
    return new;
  end if;

  if new.category_id is null or new.destination_category_id is null or new.destination_account_id is null then
    raise exception 'A source and destination category and account are required for transfers';
  end if;

  if new.account_id = new.destination_account_id
    and coalesce(new.wallet_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(new.destination_wallet_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'Transfer source and destination must be different';
  end if;

  select user_id, category_id into destination_account_owner, destination_account_category
  from public.accounts where id = new.destination_account_id;
  select user_id into source_category_owner
  from public.categories where id = new.category_id;
  select user_id into destination_category_owner
  from public.categories where id = new.destination_category_id;

  if destination_account_owner is distinct from new.user_id
    or source_category_owner is distinct from new.user_id
    or destination_category_owner is distinct from new.user_id then
    raise exception 'Transfer references must belong to the transaction owner';
  end if;

  if new.destination_wallet_id is not null then
    select account_id, user_id, category_id
      into destination_wallet_account, destination_wallet_owner, destination_wallet_category
    from public.wallets where id = new.destination_wallet_id;
    if destination_wallet_owner is distinct from new.user_id
      or destination_wallet_account is distinct from new.destination_account_id then
      raise exception 'Destination wallet must belong to the destination account owner';
    end if;
  end if;

  source_effective_category := coalesce(source_wallet_category, source_account_category);
  destination_effective_category := coalesce(destination_wallet_category, destination_account_category);

  -- First use can assign a missing category through the transfer form. These
  -- updates and the transaction insert run in the same database transaction.
  if source_effective_category is null then
    if new.wallet_id is not null then
      update public.wallets set category_id = new.category_id
      where id = new.wallet_id and user_id = new.user_id and category_id is null;
    else
      update public.accounts set category_id = new.category_id
      where id = new.account_id and user_id = new.user_id and category_id is null;
    end if;
    source_effective_category := new.category_id;
  end if;

  if destination_effective_category is null then
    if new.destination_wallet_id is not null then
      update public.wallets set category_id = new.destination_category_id
      where id = new.destination_wallet_id and user_id = new.user_id and category_id is null;
    else
      update public.accounts set category_id = new.destination_category_id
      where id = new.destination_account_id and user_id = new.user_id and category_id is null;
    end if;
    destination_effective_category := new.destination_category_id;
  end if;

  select coalesce(w.category_id, a.category_id) into source_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.wallet_id and w.account_id = a.id
  where a.id = new.account_id;
  select coalesce(w.category_id, a.category_id) into destination_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.destination_wallet_id and w.account_id = a.id
  where a.id = new.destination_account_id;

  if source_effective_category is distinct from new.category_id
    or destination_effective_category is distinct from new.destination_category_id then
    raise exception 'Transfer categories must match assigned account or pocket categories';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_transfer on public.transactions;
create trigger transactions_validate_transfer
before insert or update of type, status, user_id, account_id, wallet_id, category_id,
  destination_account_id, destination_wallet_id, destination_category_id
on public.transactions
for each row execute function public.validate_transaction_transfer();
