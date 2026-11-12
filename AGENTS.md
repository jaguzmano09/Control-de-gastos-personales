# Working context

This project was explored on 2026-11-11. Before changing it, read:

1. `docs/PROJECT_CONTEXT.md`: architecture, modules, invariants, and evidence limits.
2. `Functional_specification.md`: intended business rules; reconcile with implementation and actual schema.
3. `docs/PLATFORM_REVIEW_2026-11-11.md`: critical assessment and known risks.
4. `docs/PUBLIC_RELEASE_PLAN.md`: proposed product direction and release gates.
5. `docs/ROADMAP.md`: phased execution draft, task IDs, dependencies, acceptance criteria, and owner decisions. The owner accepted its overall direction and added requirements; detailed decisions remain open. Listed tasks are not automatically implemented or completed.
6. `docs/product/PRODUCT_BRIEF.md`, `docs/product/FINANCIAL_MODEL_PROPOSAL.md`, and `docs/product/PRIVACY_DATA_MAP.md`: P0 decisions, proposed financial semantics, and privacy boundaries. Only explicitly confirmed decisions are approved; proposals do not rewrite existing data.
7. `docs/implementation/FOUNDATION_PROGRESS.md`: first local fixes and reproducible HTTP evidence.

These files provide durable repository context, not guaranteed automatic memory across sessions. Update them when decisions, flows, or risks change. Distinguish implemented behavior, verified behavior, and proposals. Recommendations are not owner-approved decisions.

## Owner preferences

- Communicate with the owner in Spanglish, as requested on 2026-11-11.
- Write code comments and all new or updated documentation in English.
- Create meaningful, scoped Git commits as work progresses and push completed commits when appropriate, as explicitly requested by the owner. Use English Conventional Commit subjects and explanatory bodies with relevant validation/limitations. Inspect the branch, remote, and diff; stage explicit paths, preserve unrelated changes, and never include secrets, generated build output, or real financial data. Do not rewrite shared history or force-push without explicit authorization.
- Keep product interface messages in Spanish unless the owner requests otherwise.
- The owner wants a critical assessment and coherent identity before public release. Initial audience is confirmed: personal finances in Colombia, COP, America/Bogota. The primary benefit is recording/organizing movements; Gmail/OCR become available progressively after reliability checks. Business model and final brand name remain unconfirmed.
- The public homepage must attract prospective customers immediately and clearly explain the platform's value. Brand identity must be distinctive and expressed through an effective, enjoyable product experience.
- The owner's account must retain ordinary personal-account functionality and also provide a protected administrative area for product/operational metrics. This is a planned requirement, not evidence that privileges were changed.
- Privacy is a cross-phase release requirement. Administrative analytics must preserve personal financial isolation and avoid routine access to other users' transactions, balances, receipts, emails, or credentials; use appropriately aggregated product metrics.

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

Lint is now configured and runs noninteractively; it currently reports six warnings. The CI workflow is awaiting its first remote run. Do not run build and dev simultaneously against `.next`. Financial changes need meaningful transfer, rollover, concurrency, and isolation cases in addition to existing yield tests.
