-- Event-trigger handlers are invoked by PostgreSQL, not by REST clients.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- Event-trigger handlers are invoked by PostgreSQL, not by REST clients.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
