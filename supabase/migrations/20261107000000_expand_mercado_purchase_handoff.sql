-- Mercado: agrupación libre, borradores de compra y confirmación financiera atómica.
alter table public.shopping_list_items add column if not exists group_name text;
create index if not exists shopping_list_items_list_group_position_idx
  on public.shopping_list_items (list_id, group_name, position);

create table if not exists public.shopping_purchase_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  status text not null default 'borrador' check (status in ('borrador', 'confirmado', 'cancelado')),
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.shopping_purchase_draft_lines (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.shopping_purchase_drafts(id) on delete cascade,
  item_id uuid not null references public.shopping_list_items(id) on delete restrict,
  list_id uuid not null references public.shopping_lists(id) on delete restrict,
  name text not null,
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null,
  actual_unit_price numeric(14,2) not null check (actual_unit_price >= 0),
  created_at timestamptz not null default now(),
  unique(draft_id, item_id)
);
create index if not exists shopping_purchase_drafts_user_status_idx
  on public.shopping_purchase_drafts(user_id, status, created_at desc);

alter table public.shopping_purchase_drafts enable row level security;
alter table public.shopping_purchase_draft_lines enable row level security;
create policy "shopping_purchase_drafts_owner" on public.shopping_purchase_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_purchase_draft_lines_owner" on public.shopping_purchase_draft_lines
  for all using (exists (select 1 from public.shopping_purchase_drafts d where d.id = draft_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.shopping_purchase_drafts d where d.id = draft_id and d.user_id = auth.uid()));
grant select, insert, update, delete on public.shopping_purchase_drafts, public.shopping_purchase_draft_lines to authenticated;
revoke all on public.shopping_purchase_drafts, public.shopping_purchase_draft_lines from anon;

-- Revalida precios y selección al confirmar; bloquea el borrador para impedir doble gasto.
create or replace function public.confirm_shopping_purchase(
  p_draft_id uuid, p_occurred_at date, p_category_id uuid, p_account_id uuid,
  p_wallet_id uuid, p_description text, p_is_necessary boolean, p_submission_id uuid
) returns uuid language plpgsql security invoker as $$
declare
  v_draft public.shopping_purchase_drafts%rowtype;
  v_total numeric(14,2);
  v_transaction_id uuid;
begin
  select * into v_draft from public.shopping_purchase_drafts
    where id = p_draft_id and user_id = auth.uid() for update;
  if not found then raise exception 'Borrador de compra no encontrado'; end if;
  if v_draft.status = 'confirmado' then return v_draft.transaction_id; end if;
  if v_draft.status <> 'borrador' then raise exception 'El borrador no está disponible'; end if;
  if exists (
    select 1 from public.shopping_purchase_draft_lines l join public.shopping_list_items i on i.id = l.item_id
    where l.draft_id = p_draft_id and (i.user_id <> auth.uid() or not i.is_checked or i.actual_unit_price is null)
  ) then raise exception 'Uno o más artículos ya no tienen precio real o no están marcados'; end if;
  select coalesce(sum(actual_unit_price * quantity), 0) into v_total
    from public.shopping_purchase_draft_lines where draft_id = p_draft_id;
  if v_total <= 0 then raise exception 'El borrador no tiene artículos con precio real'; end if;
  insert into public.transactions (user_id, occurred_at, type, category_id, account_id, wallet_id, description, amount, is_necessary, source, status, submission_id)
  values (auth.uid(), p_occurred_at, 'Gasto', p_category_id, p_account_id, p_wallet_id,
    coalesce(nullif(p_description, ''), v_draft.description), v_total, p_is_necessary, 'manual', 'confirmada', p_submission_id)
  returning id into v_transaction_id;
  update public.shopping_purchase_drafts set status = 'confirmado', transaction_id = v_transaction_id, confirmed_at = now() where id = p_draft_id;
  return v_transaction_id;
exception when unique_violation then
  select id into v_transaction_id from public.transactions where user_id = auth.uid() and submission_id = p_submission_id;
  if v_transaction_id is null then raise; end if;
  update public.shopping_purchase_drafts set status = 'confirmado', transaction_id = v_transaction_id, confirmed_at = now() where id = p_draft_id and status = 'borrador';
  return v_transaction_id;
end;
$$;
revoke all on function public.confirm_shopping_purchase(uuid, date, uuid, uuid, uuid, text, boolean, uuid) from public, anon;
grant execute on function public.confirm_shopping_purchase(uuid, date, uuid, uuid, uuid, text, boolean, uuid) to authenticated;
