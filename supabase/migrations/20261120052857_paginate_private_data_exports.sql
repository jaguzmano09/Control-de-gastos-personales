drop function public.list_my_support_requests();

create function public.list_my_support_requests(
  p_offset integer default 0,
  p_limit integer default 50
)
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

  if p_offset is null or p_offset < 0 or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Invalid support request page';
  end if;

  return query
  select r.id, r.request_type, r.subject, r.message, r.status,
         r.admin_response, r.responded_at, r.created_at, r.updated_at
  from public.support_requests as r
  where r.user_id = auth.uid()
  order by r.created_at desc, r.id desc
  offset p_offset
  limit p_limit;
end;
$$;

create function public.export_my_product_events(
  p_offset integer default 0,
  p_limit integer default 500
)
returns table (
  event_name text,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_offset is null or p_offset < 0 or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Invalid product event page';
  end if;

  return query
  select e.event_name, e.occurred_at
  from public.product_events as e
  where e.user_id = auth.uid()
  order by e.occurred_at desc, e.id desc
  offset p_offset
  limit p_limit;
end;
$$;

revoke all on function public.list_my_support_requests(integer, integer) from public, anon;
grant execute on function public.list_my_support_requests(integer, integer) to authenticated;
revoke all on function public.export_my_product_events(integer, integer) from public, anon;
grant execute on function public.export_my_product_events(integer, integer) to authenticated;
