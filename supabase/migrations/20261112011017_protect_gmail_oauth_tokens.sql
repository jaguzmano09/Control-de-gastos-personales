-- The application only needs connection metadata; OAuth secrets stay server-side.
revoke all privileges on table public.gmail_connections from authenticated;
grant select (user_id, is_active, token_expires_at, gmail_history_id)
  on table public.gmail_connections to authenticated;
