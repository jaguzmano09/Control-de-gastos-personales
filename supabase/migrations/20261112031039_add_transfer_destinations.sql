-- Transfer rows remain single ledger entries; the destination is stored on the
-- same row so the two sides cannot be partially inserted.
alter table public.transactions
  add column destination_account_id uuid references public.accounts(id),
  add column destination_wallet_id uuid references public.wallets(id),
  add column destination_category_id uuid references public.categories(id);

create index transactions_destination_account_idx
  on public.transactions (destination_account_id, occurred_at)
  where destination_account_id is not null;

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

  if new.type in ('Gasto', 'Ingreso', 'Transferencia') and new.category_id is null then
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

  return new;
end;
$$;

create trigger transactions_validate_transfer
before insert or update of type, user_id, account_id, wallet_id, category_id,
  destination_account_id, destination_wallet_id, destination_category_id
on public.transactions
for each row execute function public.validate_transaction_transfer();
