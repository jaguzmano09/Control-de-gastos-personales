-- One counter per user; no receipt content or IP address is stored.
create table public.ocr_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count integer not null default 1 check (request_count between 1 and 10)
);

alter table public.ocr_rate_limits enable row level security;
revoke all on public.ocr_rate_limits from public, anon, authenticated;

create function public.consume_ocr_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  insert into public.ocr_rate_limits as limits (user_id, window_start, request_count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update
    set window_start = case when limits.window_start <= now() - interval '1 hour' then now() else limits.window_start end,
        request_count = case when limits.window_start <= now() - interval '1 hour' then 1 else limits.request_count + 1 end
    where limits.window_start <= now() - interval '1 hour' or limits.request_count < 10
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_ocr_quota() from public, anon;
grant execute on function public.consume_ocr_quota() to authenticated;
