-- Accounts with pockets have no account-level category. Every pocket owns its
-- category; only accounts without pockets can have an account category.
update public.accounts a
set category_id = null
where a.category_id is not null
  and (a.has_wallets or exists (select 1 from public.wallets w where w.account_id = a.id));

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
  and a.category_id is null
  and not a.has_wallets
  and not exists (select 1 from public.wallets w where w.account_id = a.id);

create or replace function public.validate_account_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category_owner uuid;
begin
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

drop trigger if exists accounts_validate_category on public.accounts;
create trigger accounts_validate_category
before insert or update of user_id, category_id, has_wallets on public.accounts
for each row execute function public.validate_account_category();

create or replace function public.mark_account_as_pocketed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.accounts
  set has_wallets = true, category_id = null
  where id = new.account_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists wallets_mark_account_as_pocketed on public.wallets;
create trigger wallets_mark_account_as_pocketed
after insert or update of account_id on public.wallets
for each row execute function public.mark_account_as_pocketed();

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
  source_has_wallets boolean;
  destination_has_wallets boolean;
begin
  select user_id, category_id, has_wallets or exists (
    select 1 from public.wallets w where w.account_id = a.id
  ) into source_account_owner, source_account_category, source_has_wallets
  from public.accounts a where id = new.account_id;
  if source_account_owner is distinct from new.user_id then
    raise exception 'Source account must belong to the transaction owner';
  end if;

  if new.wallet_id is not null then
    select account_id, user_id, category_id
      into source_wallet_account, source_wallet_owner, source_wallet_category
    from public.wallets where id = new.wallet_id;
    if source_wallet_owner is distinct from new.user_id
      or source_wallet_account is distinct from new.account_id then
      raise exception 'Source pocket must belong to the source account owner';
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

    if new.status = 'confirmada' and new.type in ('Gasto', 'Ingreso')
      and source_has_wallets and new.wallet_id is null then
      raise exception 'Choose a pocket for transactions in an account with pockets';
    end if;

    if new.type = 'Ingreso' and new.status = 'confirmada' then
      source_effective_category := case when new.wallet_id is not null
        then source_wallet_category else source_account_category end;
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

  select user_id, category_id, has_wallets or exists (
    select 1 from public.wallets w where w.account_id = a.id
  ) into destination_account_owner, destination_account_category, destination_has_wallets
  from public.accounts a where id = new.destination_account_id;
  select user_id into source_category_owner from public.categories where id = new.category_id;
  select user_id into destination_category_owner from public.categories where id = new.destination_category_id;
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
      raise exception 'Destination pocket must belong to the destination account owner';
    end if;
  end if;

  if (source_has_wallets and new.wallet_id is null)
    or (destination_has_wallets and new.destination_wallet_id is null) then
    raise exception 'Choose a pocket for each account that has pockets';
  end if;

  source_effective_category := case when new.wallet_id is not null
    then source_wallet_category else source_account_category end;
  destination_effective_category := case when new.destination_wallet_id is not null
    then destination_wallet_category else destination_account_category end;

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

  select case when new.wallet_id is not null then w.category_id else a.category_id end
    into source_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.wallet_id and w.account_id = a.id
  where a.id = new.account_id;
  select case when new.destination_wallet_id is not null then w.category_id else a.category_id end
    into destination_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.destination_wallet_id and w.account_id = a.id
  where a.id = new.destination_account_id;

  if source_effective_category is distinct from new.category_id
    or destination_effective_category is distinct from new.destination_category_id then
    raise exception 'Transfer categories must match their assigned account or pocket categories';
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
