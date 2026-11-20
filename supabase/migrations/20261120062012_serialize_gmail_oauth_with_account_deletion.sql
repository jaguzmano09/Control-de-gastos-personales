create or replace function public.reject_gmail_connection_during_deletion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if exists (
    select 1 from public.account_deletion_jobs
    where user_id = new.user_id
  ) then
    raise exception 'Account deletion is in progress';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_gmail_connection_during_deletion() from public, anon, authenticated;
grant execute on function public.reject_gmail_connection_during_deletion() to service_role;

drop trigger if exists reject_gmail_connection_during_deletion on public.gmail_connections;
create trigger reject_gmail_connection_during_deletion
before insert or update on public.gmail_connections
for each row execute function public.reject_gmail_connection_during_deletion();

