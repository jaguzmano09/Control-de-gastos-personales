create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('support', 'privacy', 'security')),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_response text check (admin_response is null or char_length(btrim(admin_response)) <= 3000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_requests_user_created_idx
  on public.support_requests(user_id, created_at desc);

create index support_requests_open_created_idx
  on public.support_requests(created_at desc)
  where status <> 'resolved';

alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;

update public.document_versions
set is_active = false
where document_key = 'privacy'
  and is_active;

insert into public.document_versions (document_key, version, public_path, is_active)
values ('privacy', '2026-11-20', '/privacidad', true);

create function public.submit_support_request(
  p_request_type text,
  p_subject text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_recent_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_request_type is null or p_request_type not in ('support', 'privacy', 'security') then
    raise exception 'Unsupported request type';
  end if;

  if p_subject is null or pg_catalog.char_length(pg_catalog.btrim(p_subject)) not between 3 and 120 then
    raise exception 'Invalid support request subject';
  end if;

  if p_message is null or pg_catalog.char_length(pg_catalog.btrim(p_message)) not between 10 and 3000 then
    raise exception 'Invalid support request message';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  select pg_catalog.count(*)::integer
  into v_recent_count
  from public.support_requests
  where user_id = v_user_id
    and created_at >= pg_catalog.now() - interval '24 hours';

  if v_recent_count >= 5 then
    raise exception 'Support request limit reached';
  end if;

  insert into public.support_requests (user_id, request_type, subject, message)
  values (v_user_id, p_request_type, pg_catalog.btrim(p_subject), pg_catalog.btrim(p_message))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create function public.list_my_support_requests()
returns table (
  id uuid,
  request_type text,
  subject text,
  message text,
  status text,
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  return query
  select r.id, r.request_type, r.subject, r.message, r.status,
         r.admin_response, r.responded_at, r.created_at, r.updated_at
  from public.support_requests as r
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit 50;
end;
$$;

create function public.admin_support_requests()
returns table (
  id uuid,
  user_id uuid,
  request_type text,
  subject text,
  message text,
  status text,
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = auth.uid()
      and profile.role = 'admin'
  ) then
    raise exception 'Administrator access is required';
  end if;

  return query
  select r.id, r.user_id, r.request_type, r.subject, r.message, r.status,
         r.admin_response, r.responded_at, r.created_at, r.updated_at
  from public.support_requests as r
  order by (r.status = 'resolved'), r.created_at desc
  limit 100;
end;
$$;

create function public.admin_reply_support_request(
  p_request_id uuid,
  p_response text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated boolean := false;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = auth.uid()
      and profile.role = 'admin'
  ) then
    raise exception 'Administrator access is required';
  end if;

  if p_request_id is null
    or p_status not in ('in_progress', 'resolved')
    or p_response is null
    or pg_catalog.char_length(pg_catalog.btrim(p_response)) not between 1 and 3000 then
    raise exception 'Invalid support response';
  end if;

  update public.support_requests as r
  set admin_response = pg_catalog.btrim(p_response),
      status = p_status,
      responded_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where r.id = p_request_id;

  v_updated := found;
  return v_updated;
end;
$$;

revoke all on function public.submit_support_request(text, text, text) from public, anon;
revoke all on function public.list_my_support_requests() from public, anon;
revoke all on function public.admin_support_requests() from public, anon;
revoke all on function public.admin_reply_support_request(uuid, text, text) from public, anon;

grant execute on function public.submit_support_request(text, text, text) to authenticated;
grant execute on function public.list_my_support_requests() to authenticated;
grant execute on function public.admin_support_requests() to authenticated;
grant execute on function public.admin_reply_support_request(uuid, text, text) to authenticated;
