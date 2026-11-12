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

The same SQL is committed in `supabase/migrations/20261112005803_restrict_anonymous_data_access.sql`. The hosted project currently reports no migration history, so this direct production correction is not recorded in its Supabase migration ledger. Migration reconciliation and a baseline remain open P1.2 work. The change does not prove cross-user isolation for authenticated users; that needs synthetic user A/B tests. Twelve mutable-search-path function advisories and the missing `product_events` policy are separate review items.
