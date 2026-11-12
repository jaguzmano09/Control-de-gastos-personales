# Anonymous database grant remediation

Date: 2026-11-11 (America/Bogota; 2026-11-12 UTC).
Project: Control_de_gastos (ffhxaemkcogrblivpgtt).
Scope: Remove unnecessary anonymous access from private data and privileged routines.

The live project had RLS enabled on all 23 public tables, but the `anon` role also held table privileges on budget rollover reviews, product events, user document acceptances, and user profiles. `product_events` had no policies. RLS blocked row access there, but the broad grants were unnecessary and left the privacy boundary dependent on policy configuration.

The live project also granted `anon` execution on three security-definer RPCs. Their definitions check for an authenticated user or admin role, so this review did not establish anonymous disclosure. The grants were removed as defense in depth. The auth user trigger function is not a client RPC; execution was revoked from `PUBLIC`, `anon`, and `authenticated`.

## Applied changes

- Revoked all `anon` table privileges on `budget_rollover_reviews`, `product_events`, `user_document_acceptances`, and `user_profiles`.
- Revoked `anon` execution on `accept_current_documents`, `record_product_event`, and `admin_product_event_metrics`.
- Revoked client execution on `handle_new_public_user`.
- Revoked default `anon` privileges on future tables created by the current schema owner in `public`.
- Preserved anonymous `SELECT` on `document_versions`, whose RLS policy exposes active legal documents only.

The SQL was applied through the connected Supabase SQL tool and then checked against PostgreSQL privilege catalogs. Verification returned zero remaining anonymous grants for the four private tables, zero anonymous or PUBLIC grants for the four named routines, and the expected anonymous `SELECT` grant for `document_versions`.

Follow-up review found that `public.rls_auto_enable()` was also executable by anonymous and authenticated roles. Execution was revoked from `PUBLIC`, `anon`, and `authenticated`; PostgreSQL event triggers continue to invoke it as configured. The routine privilege catalog returned no client-role grants afterward.

The authenticated role could also read every column of `gmail_connections`, including the OAuth refresh and access tokens, despite the UI selecting only status fields. The live grant was narrowed to `user_id`, `is_active`, `token_expires_at`, and `gmail_history_id`; privilege inspection confirms both token columns are unreadable to authenticated clients. Server-side service-role code retains the access required for synchronization. The corresponding migration is `20261112011017_protect_gmail_oauth_tokens.sql`.

The SQL is recorded in `supabase/migrations/20261112005803_restrict_anonymous_data_access.sql` and `supabase/migrations/20261112010634_revoke_public_rls_trigger_execution.sql`. Those earlier direct production corrections are still absent from the hosted ledger. Two later finance migrations are now recorded; see [migration reconciliation](MIGRATION_RECONCILIATION.md). Migration reconciliation and a baseline remain open P1.2 work. The change does not prove cross-user isolation for authenticated users; that needs synthetic user A/B tests. Twelve mutable-search-path advisories apply to invoker functions, not security-definer functions; review their bodies and set safe paths where compatible. `product_events` has no direct policies by design; direct grants are removed and aggregate access requires an authenticated admin RPC.
