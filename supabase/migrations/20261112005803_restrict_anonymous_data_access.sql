-- Keep unauthenticated access to the active legal documents only.
revoke all privileges on table
  public.budget_rollover_reviews,
  public.product_events,
  public.user_document_acceptances,
  public.user_profiles
from anon;

revoke execute on function public.accept_current_documents() from anon;
revoke execute on function public.record_product_event(text) from anon;
revoke execute on function public.admin_product_event_metrics(timestamptz) from anon;

-- This trigger function is invoked by the auth.users trigger and is not an RPC.
revoke execute on function public.handle_new_public_user() from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon;
