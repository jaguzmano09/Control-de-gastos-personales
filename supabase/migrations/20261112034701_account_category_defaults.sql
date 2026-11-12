-- Accounts define a default budget category; a pocket may override it.
alter table public.accounts
  add column category_id uuid references public.categories(id);

alter table public.wallets
  add column category_id uuid references public.categories(id);

create or replace function public.validate_account_category_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category_owner uuid;
begin
  if new.category_id is not null then
    select user_id into category_owner
    from public.categories where id = new.category_id;
    if category_owner is distinct from new.user_id then
      raise exception 'Account category must belong to the account owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger accounts_validate_category_owner
before insert or update of user_id, category_id on public.accounts
for each row execute function public.validate_account_category_owner();

create or replace function public.validate_wallet_category_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_owner uuid;
  category_owner uuid;
begin
  select user_id into account_owner from public.accounts where id = new.account_id;
  if account_owner is distinct from new.user_id then
    raise exception 'Wallet account must belong to the wallet owner';
  end if;
  if new.category_id is not null then
    select user_id into category_owner
    from public.categories where id = new.category_id;
    if category_owner is distinct from new.user_id then
      raise exception 'Wallet category must belong to the wallet owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger wallets_validate_category_owner
before insert or update of user_id, account_id, category_id on public.wallets
for each row execute function public.validate_wallet_category_owner();

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
begin
  select user_id into source_account_owner
  from public.accounts where id = new.account_id;
  if source_account_owner is distinct from new.user_id then
    raise exception 'Source account must belong to the transaction owner';
  end if;

  if new.wallet_id is not null then
    select account_id, user_id into source_wallet_account, source_wallet_owner
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
    return new;
  end if;

  if new.account_id = new.destination_account_id
    and coalesce(new.wallet_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(new.destination_wallet_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'Transfer source and destination must be different';
  end if;

  select user_id into destination_account_owner
  from public.accounts where id = new.destination_account_id;
  select user_id into source_category_owner
  from public.categories where id = new.category_id;
  select user_id into destination_category_owner
  from public.categories where id = new.destination_category_id;

  if source_account_owner is distinct from new.user_id
    or destination_account_owner is distinct from new.user_id
    or source_category_owner is distinct from new.user_id
    or destination_category_owner is distinct from new.user_id then
    raise exception 'Transfer references must belong to the transaction owner';
  end if;

  if new.destination_wallet_id is not null then
    select account_id, user_id into destination_wallet_account, destination_wallet_owner
    from public.wallets where id = new.destination_wallet_id;
    if destination_wallet_owner is distinct from new.user_id
      or destination_wallet_account is distinct from new.destination_account_id then
      raise exception 'Destination wallet must belong to the destination account owner';
    end if;
  end if;

  select coalesce(w.category_id, a.category_id) into source_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.wallet_id and w.account_id = a.id
  where a.id = new.account_id;
  select coalesce(w.category_id, a.category_id) into destination_effective_category
  from public.accounts a left join public.wallets w
    on w.id = new.destination_wallet_id and w.account_id = a.id
  where a.id = new.destination_account_id;

  if source_effective_category is null or source_effective_category is distinct from new.category_id
    or destination_effective_category is null or destination_effective_category is distinct from new.destination_category_id then
    raise exception 'Transfer categories must match the assigned categories of their accounts or pockets';
  end if;

  return new;
end;
$$;
