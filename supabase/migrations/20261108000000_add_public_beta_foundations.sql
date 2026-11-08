-- Public-beta foundations: application roles, versioned document acceptance, and
-- privacy-preserving product telemetry. This migration deliberately keeps product
-- events separate from financial records and does not grant administrators access
-- to another user's financial data.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_key text not null check (document_key in ('terms', 'privacy')),
  version text not null,
  public_path text not null,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (document_key, version)
);

create unique index if not exists document_versions_one_active_per_key
  on public.document_versions (document_key)
  where is_active;

insert into public.document_versions (document_key, version, public_path, is_active)
values
  ('terms', '2026-11-08', '/terminos', true),
  ('privacy', '2026-11-08', '/privacidad', true)
on conflict (document_key, version) do update
  set public_path = excluded.public_path,
      is_active = excluded.is_active;

create table if not exists public.user_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  acceptance_source text not null default 'registration' check (acceptance_source in ('registration', 'renewal')),
  created_at timestamptz not null default now(),
  unique (user_id, document_version_id)
);

create index if not exists user_document_acceptances_user_id_idx
  on public.user_document_acceptances (user_id, accepted_at desc);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in (
    'account_created',
    'first_transaction_confirmed',
    'onboarding_completed',
    'ocr_started',
    'ocr_completed',
    'ocr_failed',
    'gmail_connection_started',
    'gmail_connection_completed',
    'gmail_connection_failed'
  )),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists product_events_name_occurred_at_idx
  on public.product_events (event_name, occurred_at desc);

create index if not exists product_events_user_id_occurred_at_idx
  on public.product_events (user_id, occurred_at desc);

alter table public.user_profiles enable row level security;
alter table public.document_versions enable row level security;
alter table public.user_document_acceptances enable row level security;
alter table public.product_events enable row level security;

-- A user can inspect only their own profile and acceptance history. Application
-- roles are intentionally not editable through the client.
create policy "users read own profile"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "users read active document versions"
  on public.document_versions for select
  to anon, authenticated
  using (is_active);

create policy "users read own document acceptances"
  on public.user_document_acceptances for select
  to authenticated
  using (user_id = auth.uid());

-- No direct policy is created for product_events: product metrics are exposed only
-- through a server-side, role-checked aggregate RPC.

create or replace function public.handle_new_public_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_document_acceptances (user_id, document_version_id, accepted_at, acceptance_source)
  select
    new.id,
    document_version.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz, now()),
    'registration'
  from public.document_versions as document_version
  where document_version.is_active
    and (
      (document_version.document_key = 'terms' and document_version.version = new.raw_user_meta_data ->> 'terms_version')
      or
      (document_version.document_key = 'privacy' and document_version.version = new.raw_user_meta_data ->> 'privacy_version')
    )
  on conflict (user_id, document_version_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_public_beta on auth.users;
create trigger on_auth_user_created_public_beta
  after insert on auth.users
  for each row execute procedure public.handle_new_public_user();

-- Add profiles for people who already exist. Existing people are deliberately not
-- marked as having accepted the new public-beta documents; the app can request a
-- renewal before enabling functions that require the current versions.
insert into public.user_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.accept_current_documents()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  insert into public.user_document_acceptances (user_id, document_version_id, acceptance_source)
  select auth.uid(), document_version.id, 'renewal'
  from public.document_versions as document_version
  where document_version.is_active
  on conflict (user_id, document_version_id) do nothing;
end;
$$;

create or replace function public.record_product_event(p_event_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_event_name not in (
    'account_created',
    'first_transaction_confirmed',
    'onboarding_completed',
    'ocr_started',
    'ocr_completed',
    'ocr_failed',
    'gmail_connection_started',
    'gmail_connection_completed',
    'gmail_connection_failed'
  ) then
    raise exception 'Unsupported product event';
  end if;

  insert into public.product_events (user_id, event_name)
  values (auth.uid(), p_event_name);
end;
$$;

create or replace function public.admin_product_event_metrics(p_since timestamptz default now() - interval '30 days')
returns table (event_name text, event_count bigint, unique_users bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Administrator access is required';
  end if;

  return query
  select
    product_event.event_name,
    count(*)::bigint as event_count,
    count(distinct product_event.user_id)::bigint as unique_users
  from public.product_events as product_event
  where product_event.occurred_at >= p_since
  group by product_event.event_name
  order by event_count desc, product_event.event_name;
end;
$$;

revoke all on function public.accept_current_documents() from public;
revoke all on function public.record_product_event(text) from public;
revoke all on function public.admin_product_event_metrics(timestamptz) from public;
grant execute on function public.accept_current_documents() to authenticated;
grant execute on function public.record_product_event(text) to authenticated;
grant execute on function public.admin_product_event_metrics(timestamptz) to authenticated;
