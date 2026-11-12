# Working context

This project was explored on 2026-11-11. Before changing it, read:

1. `docs/PROJECT_CONTEXT.md`: architecture, modules, invariants, and evidence limits.
2. `Functional_specification.md`: intended business rules; reconcile with implementation and actual schema.
3. `docs/PLATFORM_REVIEW_2026-11-11.md`: critical assessment and known risks.
4. `docs/PUBLIC_RELEASE_PLAN.md`: proposed product direction and release gates.

These files provide durable repository context, not guaranteed automatic memory across sessions. Update them when decisions, flows, or risks change. Distinguish implemented behavior, verified behavior, and proposals. Recommendations are not owner-approved decisions.

## Owner preferences

- Communicate with the owner in Spanglish, as requested on 2026-11-11.
- Write code comments and all new or updated documentation in English.
- Keep product interface messages in Spanish unless the owner requests otherwise.
- The owner wants a critical assessment and coherent identity before public release. Initial audience, business model, and final brand name remain unconfirmed.

## Invariants

- Only `confirmada` transactions affect calculations. OCR/Gmail entries require review; duplicates and discarded entries stay excluded.
- Preserve user isolation in reads, writes, relationships, and RPCs. UI filtering does not replace RLS.
- Reuse `lib/supabase/client.ts` and `lib/supabase/server.ts`; the latter reexports `src/lib/supabase/server.ts`.
- Canonical database types: `src/types/database.types.ts`; `lib/types/database.types.ts` is a compatibility reexport.
- Never publish secrets or copy `.env.local` values into documentation or logs.
- Do not replay historical migrations wholesale against a fresh or public database: the baseline schema is missing, and personal DALE repairs include deletions. Prepare a safe baseline first.
- Preserve preexisting user changes. `lib/supabase/middleware.ts` was already modified when this review started.
- Distinguish financial balances, budget allocations, and estimated yield.

## Validation

On Windows PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.

```text
npm.cmd run typecheck
node --experimental-strip-types --test lib/yield-calculation.test.ts
npm.cmd run lint
npm.cmd run build
```

Lint still needs configuration: it opened an interactive setup prompt during this review; do not report it as passing. Do not run build and dev simultaneously against `.next`. Financial changes need meaningful transfer, rollover, concurrency, and isolation cases in addition to existing yield tests.
