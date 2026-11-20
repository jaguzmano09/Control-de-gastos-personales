create or replace function public.admin_reply_support_request(
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
    select 1 from public.user_profiles as profile
    where profile.user_id = auth.uid() and profile.role = 'admin'
  ) then
    raise exception 'Administrator access is required';
  end if;

  if p_request_id is null
    or p_status is null
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

revoke all on function public.admin_reply_support_request(uuid, text, text) from public, anon;
grant execute on function public.admin_reply_support_request(uuid, text, text) to authenticated;
