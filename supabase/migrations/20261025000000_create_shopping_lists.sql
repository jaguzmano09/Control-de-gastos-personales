-- Lista de mercado e historial propio de precios.
-- name_key lo calcula la aplicación: minúsculas, sin tildes y con espacios normalizados.

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_user_name_key_unique unique (user_id, name_key)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  store_id uuid references public.stores(id) on delete set null,
  status text not null default 'activa'
    check (status in ('activa', 'completada')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  name_key text not null,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  unit text not null default 'und'
    check (unit in ('und', 'kg', 'g', 'lb', 'l', 'ml')),
  estimated_unit_price numeric(14, 2) check (estimated_unit_price >= 0),
  actual_unit_price numeric(14, 2) check (actual_unit_price >= 0),
  is_checked boolean not null default false,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_key text not null,
  store_id uuid references public.stores(id) on delete set null,
  unit text not null check (unit in ('und', 'kg', 'g', 'lb', 'l', 'ml')),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  observed_on date not null,
  source text not null default 'lista'
    check (source in ('lista', 'factura', 'manual')),
  list_id uuid references public.shopping_lists(id) on delete set null,
  list_item_id uuid references public.shopping_list_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index shopping_lists_user_status_idx
  on public.shopping_lists(user_id, status, created_at desc);
create index shopping_list_items_list_position_idx
  on public.shopping_list_items(list_id, position);
create index shopping_list_items_user_name_idx
  on public.shopping_list_items(user_id, name_key);
create index price_history_product_idx
  on public.price_history(user_id, name_key, unit, observed_on desc);
create index price_history_store_idx
  on public.price_history(user_id, store_id, name_key, unit, observed_on desc);

-- Un ítem de una lista solo puede aportar una vez al historial de esa lista.
create unique index price_history_list_item_idx
  on public.price_history(list_item_id)
  where source = 'lista' and list_item_id is not null;

-- Se crea aquí para que la migración sea independiente de una función previa.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_stores_updated
before update on public.stores
for each row execute function public.set_updated_at();

create trigger trg_shopping_lists_updated
before update on public.shopping_lists
for each row execute function public.set_updated_at();

create trigger trg_shopping_list_items_updated
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

create or replace function public.validate_shopping_list_store_owner()
returns trigger
language plpgsql
as $$
begin
  if new.store_id is not null and not exists (
    select 1
    from public.stores s
    where s.id = new.store_id
      and s.user_id = new.user_id
  ) then
    raise exception 'La cadena no pertenece al usuario';
  end if;
  return new;
end;
$$;

create trigger trg_shopping_lists_validate_store
before insert or update on public.shopping_lists
for each row execute function public.validate_shopping_list_store_owner();

create or replace function public.validate_shopping_item_owner()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.shopping_lists l
    where l.id = new.list_id
      and l.user_id = new.user_id
  ) then
    raise exception 'La lista no pertenece al usuario';
  end if;
  return new;
end;
$$;

create trigger trg_shopping_list_items_validate_owner
before insert or update on public.shopping_list_items
for each row execute function public.validate_shopping_item_owner();

create or replace function public.complete_shopping_list(
  p_list_id uuid,
  p_observed_on date default current_date
)
returns void
language plpgsql
as $$
declare
  v_list public.shopping_lists%rowtype;
begin
  select *
  into v_list
  from public.shopping_lists
  where id = p_list_id
  for update;

  if not found then
    raise exception 'Lista no encontrada';
  end if;
  if v_list.status = 'completada' then
    raise exception 'La lista ya está completada';
  end if;

  insert into public.price_history (
    user_id,
    name,
    name_key,
    store_id,
    unit,
    unit_price,
    observed_on,
    source,
    list_id,
    list_item_id
  )
  select
    i.user_id,
    i.name,
    i.name_key,
    v_list.store_id,
    i.unit,
    i.actual_unit_price,
    p_observed_on,
    'lista',
    v_list.id,
    i.id
  from public.shopping_list_items i
  where i.list_id = p_list_id
    and i.is_checked
    and i.actual_unit_price is not null;

  update public.shopping_lists
  set status = 'completada', completed_at = now()
  where id = p_list_id;
end;
$$;

create or replace function public.reopen_shopping_list(p_list_id uuid)
returns void
language plpgsql
as $$
declare
  v_list public.shopping_lists%rowtype;
begin
  select *
  into v_list
  from public.shopping_lists
  where id = p_list_id
  for update;

  if not found then
    raise exception 'Lista no encontrada';
  end if;
  if v_list.status <> 'completada' then
    raise exception 'La lista no está completada';
  end if;

  delete from public.price_history
  where list_id = p_list_id
    and source = 'lista';

  update public.shopping_lists
  set status = 'activa', completed_at = null
  where id = p_list_id;
end;
$$;

alter table public.stores enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.price_history enable row level security;

create policy "stores_owner"
on public.stores
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "shopping_lists_owner"
on public.shopping_lists
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "shopping_list_items_owner"
on public.shopping_list_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "price_history_owner"
on public.price_history
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete
on public.stores,
   public.shopping_lists,
   public.shopping_list_items,
   public.price_history
to authenticated;

revoke all
on public.stores,
   public.shopping_lists,
   public.shopping_list_items,
   public.price_history
from anon;

revoke execute
on function public.complete_shopping_list(uuid, date),
   public.reopen_shopping_list(uuid)
from public, anon;

grant execute
on function public.complete_shopping_list(uuid, date),
   public.reopen_shopping_list(uuid)
to authenticated;
