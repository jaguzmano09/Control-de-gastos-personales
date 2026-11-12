# Supabase Migration Reconciliation

Status: inventory in progress. No schema baseline has been generated and no legacy migration has been replayed. Four new finance migrations have since been applied and recorded in the hosted ledger.

## Current evidence

- The initial linked-project inspection found an empty migration ledger. Since then, `20261112035814_add_transfer_destinations`, `20261112035909_account_category_defaults`, `20261112042500_inherit_categories_from_income_and_transfer`, and `20261112043243_wallets_own_categories` were applied through the connected Supabase migration tool and verified in the hosted ledger.
- The November 2026 backfill used only confirmed income with one distinct category per location. Both Dale pockets retain their established categories (`Otros` and `Mercado`). The follow-up correction clears category values from accounts that have pockets; accounts without pockets alone can own an account category. A pocketed account with no assigned pocket category remains incomplete until its owner assigns one or records its first confirmed income/transfer. Conflicting or absent evidence stays unassigned.
- Hosted category integrity check: zero pocketed accounts have an account category; four accounts without pockets remain unassigned; six pockets remain unassigned. The transaction trigger now requires a pocket endpoint for confirmed account transactions whenever an account has pockets and keeps each pocket's category independent.
- The hosted `public` schema has 23 tables with RLS enabled, 22 policies, 17 functions, and 29 triggers, while repository migrations do not define the initial core financial schema.
- The repository currently contains 21 migration files. They are mostly feature changes dated September through November 2026; they do not form a complete fresh-install history for the hosted database.
- `20261108000000_add_public_beta_foundations.sql` creates profiles, consent records, and product telemetry, but assumes the existing application schema.
- These migrations are data-specific and must not be replayed as generic setup: `20261025040000_apply_dale_wallet_split.sql`, `20261025050000_reset_dale_wallet_yield.sql`, and `20261002000002_backfill_existing_rollover_reviews.sql`. The savings migration also updates existing transaction rows. Review every data-changing file before classifying it.
- Earlier privacy repairs were applied directly to the hosted database and are represented by local migrations: anonymous-grant revocations, trigger-function execution revocation, Gmail token column grants, and historical OCR payload minimization. Those repairs remain absent from the hosted ledger; the recent finance migrations do not reconcile that history.

## Required safe path

1. Freeze migration-history repair on production. Do not run `supabase db push`, `migration repair`, a reset, or historical SQL against the live project as a shortcut.
2. Create a complete schema-only snapshot from the current hosted database, including tables, types, constraints, indexes, sequences, RLS policies, grants, functions, and triggers. Keep all user rows and secrets out of the artifact.
3. Review the snapshot against the generated TypeScript contract and repository migrations. Classify each migration as schema-only, repeatable/idempotent data work, user-specific repair, or obsolete/unverified.
4. Apply the reviewed baseline to a separate non-production Supabase project. Compare its catalogs with the production catalog and test auth, RLS, RPCs, triggers, and the application using synthetic users only.
5. Write and rehearse a production adoption plan that preserves all current rows and accurately records the live schema without replaying already-applied data changes. Back up and verify recovery before any ledger operation.

## Release gate

P1.2 remains open. A clean, comparable non-production Supabase project and a schema dump mechanism are required before producing or adopting the baseline. The source project remains the reference only until catalog and migration review confirms the intended state. Existing manual privacy changes must stay represented in source control and be reconciled into the eventual baseline.
