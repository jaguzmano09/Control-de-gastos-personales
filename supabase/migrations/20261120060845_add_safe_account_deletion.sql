create table public.account_deletion_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status = 'data_removed'),
  started_at timestamptz not null default now()
);

alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;
grant select on public.account_deletion_jobs to authenticated;
grant all on public.account_deletion_jobs to service_role;

create policy "members read their own account deletion state"
  on public.account_deletion_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role is required';
  end if;

  if p_user_id is null then
    raise exception 'A user ID is required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  perform 1 from auth.users where id = p_user_id for update;
  if not found then
    raise exception 'Account does not exist';
  end if;

  if exists (select 1 from public.account_deletion_jobs where user_id = p_user_id) then
    return;
  end if;

  if exists (
    select 1 from public.accounts a join public.categories c on c.id = a.category_id
    where c.user_id = p_user_id and a.user_id <> p_user_id
  ) or exists (
    select 1 from public.wallets w join public.categories c on c.id = w.category_id
    where c.user_id = p_user_id and w.user_id <> p_user_id
  ) or exists (
    select 1 from public.wallets w join public.accounts a on a.id = w.account_id
    where a.user_id = p_user_id and w.user_id <> p_user_id
  ) then
    raise exception 'Cross-owner account references prevent deletion' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.transactions t
    where t.user_id <> p_user_id and (
      t.account_id in (select id from public.accounts where user_id = p_user_id)
      or t.destination_account_id in (select id from public.accounts where user_id = p_user_id)
      or t.wallet_id in (select id from public.wallets where user_id = p_user_id)
      or t.destination_wallet_id in (select id from public.wallets where user_id = p_user_id)
      or t.category_id in (select id from public.categories where user_id = p_user_id)
      or t.destination_category_id in (select id from public.categories where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.duplicate_review_log d
    where d.user_id <> p_user_id and (
      d.transaction_id in (select id from public.transactions where user_id = p_user_id)
      or d.matched_transaction_id in (select id from public.transactions where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.category_budgets b
    where b.user_id <> p_user_id and b.category_id in (select id from public.categories where user_id = p_user_id)
  ) or exists (
    select 1 from public.wallet_budgets b
    where b.user_id <> p_user_id and (
      b.account_id in (select id from public.accounts where user_id = p_user_id)
      or b.wallet_id in (select id from public.wallets where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.categorization_rules r
    where r.user_id <> p_user_id and (
      r.account_id in (select id from public.accounts where user_id = p_user_id)
      or r.wallet_id in (select id from public.wallets where user_id = p_user_id)
      or r.category_id in (select id from public.categories where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.budget_rollover_reviews r
    where r.user_id <> p_user_id and (
      r.account_id in (select id from public.accounts where user_id = p_user_id)
      or r.wallet_id in (select id from public.wallets where user_id = p_user_id)
      or r.category_id in (select id from public.categories where user_id = p_user_id)
      or r.source_budget_id in (select id from public.wallet_budgets where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.email_sources e
    where e.user_id <> p_user_id and e.account_id in (select id from public.accounts where user_id = p_user_id)
  ) or exists (
    select 1 from public.yield_configs y
    where y.user_id <> p_user_id and (
      y.account_id in (select id from public.accounts where user_id = p_user_id)
      or y.wallet_id in (select id from public.wallets where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.yield_rates r
    where r.user_id <> p_user_id and r.config_id in (select id from public.yield_configs where user_id = p_user_id)
  ) then
    raise exception 'Cross-owner financial references prevent deletion' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.shopping_lists l
    where l.user_id <> p_user_id and l.store_id in (select id from public.stores where user_id = p_user_id)
  ) or exists (
    select 1 from public.shopping_list_items i
    where i.user_id <> p_user_id and i.list_id in (select id from public.shopping_lists where user_id = p_user_id)
  ) or exists (
    select 1 from public.price_history h
    where h.user_id <> p_user_id and (
      h.store_id in (select id from public.stores where user_id = p_user_id)
      or h.list_id in (select id from public.shopping_lists where user_id = p_user_id)
      or h.list_item_id in (select id from public.shopping_list_items where user_id = p_user_id)
    )
  ) or exists (
    select 1 from public.shopping_purchase_drafts d
    where d.user_id <> p_user_id and d.transaction_id in (select id from public.transactions where user_id = p_user_id)
  ) or exists (
    select 1
    from public.shopping_purchase_draft_lines l
    join public.shopping_purchase_drafts d on d.id = l.draft_id
    where d.user_id <> p_user_id and (
      l.list_id in (select id from public.shopping_lists where user_id = p_user_id)
      or l.item_id in (select id from public.shopping_list_items where user_id = p_user_id)
    )
  ) then
    raise exception 'Cross-owner shopping references prevent deletion' using errcode = '23514';
  end if;

  delete from public.product_events where user_id = p_user_id;
  delete from public.support_requests where user_id = p_user_id;
  delete from public.ocr_rate_limits where user_id = p_user_id;
  delete from public.user_document_acceptances where user_id = p_user_id;
  delete from public.duplicate_review_log where user_id = p_user_id;

  delete from public.shopping_purchase_draft_lines l
  where l.draft_id in (select d.id from public.shopping_purchase_drafts d where d.user_id = p_user_id);
  delete from public.shopping_purchase_drafts where user_id = p_user_id;
  delete from public.price_history where user_id = p_user_id;
  delete from public.shopping_list_items where user_id = p_user_id;
  delete from public.shopping_lists where user_id = p_user_id;
  delete from public.stores where user_id = p_user_id;

  delete from public.yield_rates where user_id = p_user_id;
  delete from public.yield_configs where user_id = p_user_id;
  delete from public.budget_rollover_reviews where user_id = p_user_id;
  delete from public.categorization_rules where user_id = p_user_id;
  delete from public.email_sources where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;

  delete from public.wallet_budgets where user_id = p_user_id;
  delete from public.category_budgets where user_id = p_user_id;
  delete from public.gmail_connections where user_id = p_user_id;
  delete from public.wallets where user_id = p_user_id;
  delete from public.accounts where user_id = p_user_id;
  delete from public.categories where user_id = p_user_id;

  update public.user_profiles set role = 'user' where user_id = p_user_id;
  insert into public.account_deletion_jobs (user_id, status)
  values (p_user_id, 'data_removed');
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

alter table public.product_events
  drop constraint product_events_user_id_fkey,
  add constraint product_events_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

update public.document_versions
set is_active = false
where document_key = 'privacy'
  and is_active;

insert into public.document_versions (document_key, version, public_path, is_active)
values ('privacy', '2026-11-20.1', '/privacidad', true);
