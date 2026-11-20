create or replace function public.clean_gmail_connection_after_deletion_start()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  delete from public.gmail_connections where user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.clean_gmail_connection_after_deletion_start() from public, anon, authenticated;
grant execute on function public.clean_gmail_connection_after_deletion_start() to service_role;

create trigger clean_gmail_connection_after_deletion_start
after insert on public.account_deletion_jobs
for each row execute function public.clean_gmail_connection_after_deletion_start();
