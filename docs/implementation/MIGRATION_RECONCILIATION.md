# Supabase Migration Reconciliation

Status: inventory only. No schema baseline has been generated, no migration history has been repaired, and no legacy migration has been replayed.

## Current evidence

- The linked Supabase project's migration ledger is empty (`supabase_migrations.schema_migrations` reports no rows).
- The hosted `public` schema has 23 tables with RLS enabled, 22 policies, 17 functions, and 29 triggers, while repository migrations do not define the initial core financial schema.
- The repository currently contains 17 migration files. They are mostly feature changes dated September through November 2026; they do not form a complete fresh-install history for the hosted database.
- `20261108000000_add_public_beta_foundations.sql` creates profiles, consent records, and product telemetry, but assumes the existing application schema.
- These migrations are data-specific and must not be replayed as generic setup: `20261025040000_apply_dale_wallet_split.sql`, `20261025050000_reset_dale_wallet_yield.sql`, and `20261002000002_backfill_existing_rollover_reviews.sql`. The savings migration also updates existing transaction rows. Review every data-changing file before classifying it.
- The following privacy repairs have been applied directly to the hosted database and are also represented by local migrations: anonymous-grant revocations, trigger-function execution revocation, Gmail token column grants, and historical OCR payload minimization. The hosted ledger does not record those direct changes.

## Required safe path

1. Freeze migration-history repair on production. Do not run `supabase db push`, `migration repair`, a reset, or historical SQL against the live project as a shortcut.
2. Create a complete schema-only snapshot from the current hosted database, including tables, types, constraints, indexes, sequences, RLS policies, grants, functions, and triggers. Keep all user rows and secrets out of the artifact.
3. Review the snapshot against the generated TypeScript contract and repository migrations. Classify each migration as schema-only, repeatable/idempotent data work, user-specific repair, or obsolete/unverified.
4. Apply the reviewed baseline to a separate non-production Supabase project. Compare its catalogs with the production catalog and test auth, RLS, RPCs, triggers, and the application using synthetic users only.
5. Write and rehearse a production adoption plan that preserves all current rows and accurately records the live schema without replaying already-applied data changes. Back up and verify recovery before any ledger operation.

## Release gate

P1.2 remains open. A clean, comparable non-production Supabase project and a schema dump mechanism are required before producing or adopting the baseline. The source project remains the reference only until catalog and migration review confirms the intended state. Existing manual privacy changes must stay represented in source control and be reconciled into the eventual baseline.
