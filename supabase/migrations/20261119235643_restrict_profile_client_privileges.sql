-- Profile roles are provisioned by trusted database code, never by clients.
revoke insert, update, delete, truncate, references, trigger
  on table public.user_profiles from public, anon, authenticated;
