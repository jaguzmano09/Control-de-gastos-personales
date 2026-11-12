# Project memory

Exploration date: 2026-11-11. Findings concern local source. No financial records or secret values were inspected. Subsequent authorized remote privacy remediations are recorded in the relevant migration notes and roadmap.

## Product and owner intent

The owner accepted the roadmap and instructed development to begin. Priorities remain a compelling public homepage, distinctive useful/enjoyable experience, owner administration alongside personal use, and privacy. See [ROADMAP.md](ROADMAP.md), now Working v3. P0 deliverables are in review; scoped P1 fixes are locally verified. No remote data/schema change or owner role promotion has been performed.

Control de Gastos Personales began as a replacement for a personal spreadsheet. The owner wants public-use readiness, a critical assessment, coherent identity, and durable development context. Two independent assessment agents were authorized. The business model and final name remain unconfirmed.

Owner preferences, explicitly requested on 2026-11-11: communicate in Spanglish; write code comments and documentation in English. Product UI remains Spanish unless separately changed.

Confirmed audience: individuals in Colombia, COP, America/Bogota. The owner chose recording/organizing movements as the primary benefit and progressive Gmail/OCR availability after reliability checks. See [the P0 product brief](product/PRODUCT_BRIEF.md) for decisions D01-D08. Do not assume international or business-accounting support.

## Effective stack

- Next.js App Router: package.json declares ^15.5.21; the installed build identifies 15.5.28. Older documents still say 14.
- React 18.3, strict TypeScript, Tailwind 3.4.
- Supabase Auth/Postgres/RLS with JS and SSR SDKs. Browser, session server, and service-role clients use generated `Database` types. `@supabase/ssr` is pinned to 0.12.7 after 0.5.2 caused `never`-typed query results against the current SDK. Middleware remains untyped because it uses Auth and consent queries only; type inference through this middleware adapter produced query-builder errors with the generated database definition.
- The CI workflow has passed all checks on the typed-client commit. Scoped npm overrides now address the reviewed development-tool advisories; `npm audit` reports zero vulnerabilities. `next lint` still warns that the command is deprecated and needs migration before Next.js 16.
- Both privileged cron routes fail closed if `CRON_SECRET` is missing and compare bearer credentials with a timing-safe helper. Their error responses no longer return database details; rollover responses expose aggregate counts rather than private account IDs or financial amounts. Gmail OAuth logs contain no raw provider or database errors.
- Admin role enforcement is server-side in `/admin` and `admin_product_event_metrics`; profile RLS permits users to read their own role, with no client role update path. The sole verified Auth user has been promoted through the privileged database process; the account UUID is not stored here. Non-production admin-isolation checks remain pending.
- `docs/SECURITY_THREAT_MODEL.md` records the reviewed boundaries, current controls, and launch blockers. OCR raw text/provider diagnostics are no longer written to new transaction `raw_data`; historical row cleanup remains to be planned.
- Vercel: rollover cron on day 1 at 05:00 UTC; Gmail daily at 06:00 UTC.
- Gemini extraction through REST; Tesseract.js shared worker/queue; Sharp preprocessing; optional PaddleOCR service.
- PWA manifest, icons, service worker, and offline page. This does not provide offline financial editing: the worker only implements a navigation fallback.
- Original verification found public PWA assets redirecting to login (F13). The first P1 delivery corrected exact-path access before session/database work; GET/HEAD and private-path boundaries pass locally. Full installation/offline lifecycle remains unverified.

## Route map

| Area | Routes | Responsibility |
|---|---|---|
| Access/presentation | /login | Landing plus client-side sign-in/sign-up |
| Public information | /terminos, /privacidad, /seguridad, /soporte | Information and support channel |
| Overview | / | Period, metrics, shortcuts, budgets, balances |
| Transactions | /transacciones, /transacciones/nueva, /transacciones/[id] | List, create, edit, delete |
| Capture | /transacciones/ocr | Photo/file extraction producing pending entries |
| Review | /revision | Pending entries, possible duplicates, rollover assignment |
| Planning | /presupuestos/categorias, /presupuestos/bolsillos | Budget views and alert thresholds; no allocation amount editor found |
| Organization | /cuentas, /reglas, /correo | Accounts, wallets, yield, categorization, Gmail, senders |
| Shopping | /mercado | Stores, lists, items, price memory, purchase drafts |
| Account | /configuracion, /consentimiento | Settings placeholder and document renewal |
| Administration | /admin | Roles and aggregate metrics, without intended access to others' finances |

## Data flow and trust boundaries

Interface → session server actions → Supabase/RLS.
Photo/file → preprocessing and extraction → pending transaction → human review → confirmed transaction → financial calculations.
Gmail OAuth/sync → pending transaction → human review.
Service-role cron → global database operations with explicit user filters.

Middleware refreshes sessions and redirects to /login or /consentimiento; APIs are excluded from redirects and must authenticate individually. Protected navigation queries active document versions and acceptances. This file already contained owner changes before the review.

Service role bypasses RLS: check explicit ownership constraints in callbacks and global jobs. A user_id in generated types does not prove deployed policies. Initial account/transaction schema and policies are absent from repository migrations.

## Data model

Generated types describe 23 tables and six RPCs. They represent the expected contract, not an inspection of the current server.

| Family | Tables | Relationships/use |
|---|---|---|
| Organization | accounts, wallets, categories | Wallets belong to accounts; user ownership |
| Transaction records | transactions, duplicate_review_log | Type, source, status, date, amount, account, wallet, category, review |
| Planning | category_budgets, wallet_budgets, budget_rollover_reviews | Month, allocation, rollover, assignment review |
| Automation | categorization_rules, email_sources, gmail_connections | Rules, monitored senders, server-side OAuth credentials |
| Yield | yield_configs, yield_rates | Account XOR wallet target, activation, E.A. rate history |
| Shopping | stores, shopping_lists, shopping_list_items, price_history, shopping_purchase_drafts, shopping_purchase_draft_lines | Estimates, actual prices, history, consolidation |
| Public-beta foundations | user_profiles, document_versions, user_document_acceptances, product_events | Role, versioned acceptance, aggregate telemetry |

RPCs: accept_current_documents, admin_product_event_metrics, record_product_event, complete_shopping_list, reopen_shopping_list, confirm_shopping_purchase.

## Invariants and workflows

- Actual types: Ingreso, Gasto, Transferencia, Ahorro, Inversion. English labels in older documentation are descriptions, not enum values.
- Actual statuses: pendiente_revision, confirmada, duplicado, descartada.
- Sources: manual, ocr, email_webhook, migration.
- Manual entries are confirmed; a submission UUID and unique per-user index reduce duplicate submissions. This is not universal import idempotency.
- Savings uses savings_operation ingreso/retiro only for Ahorro; a versioned constraint enforces this.
- OCR: primary action lib/actions/ocr.ts authenticates, validates declared image type/10 MB size/account, preprocesses, and tries providers with fallback; processing budget is 180 s. It creates a pending entry and now stores only the extraction engine in `raw_data`. `/api/ocr` is a separate shorter Gemini path that does not persist a transaction.
- Categorization: lib/categorization/match.ts matches rules; review learns from corrected categories. lib/gemini/classify.ts is a stub, but the working adapter is lib/gemini/client.ts. Do not infer that the whole integration is unimplemented from the stub.
- Gmail: OAuth random state/httpOnly cookie and timing-safe comparison; callback uses service role and stores the current cursor. Daily sync processes connections, senders, history, and extraction. Pagination, expired-cursor recovery, in-app revocation/disconnection, and rule application during sync were not found.
- Shopping: estimates never become expenses; checked items with actual prices form a draft. The confirmation RPC locks the draft, totals lines, and creates a confirmed expense transactionally. Application-level draft and line creation is still a multiwrite flow.
- Yield: calculateDailyYield uses opening balance, dated movements, effective annual rates, activation, and rate validity. Distinguish estimates from paid interest.
- Rollover: cron processes targets and updates next-period budgets/reviews. Manual assignment currently overwrites category rollover and updates review status separately.
- Consent: login hardcodes document versions; DB owns active versions, a trigger creates profiles/registration acceptances, and an RPC renews acceptance. UI consent routing alone does not enforce acceptance at every API/database mutation.
- Events: migration/RPC/admin view exist; no product-flow instrumentation calls were found.
- Owner administration is an accepted future requirement: the same identity should retain its complete personal workspace and access a server-authorized metrics area. Existing role/aggregate-RPC foundations do not establish that the owner's account is provisioned or that the required metrics exist. Define aggregate visibility and small-cohort safeguards before implementing analytics; admin status does not authorize routine access to others' private financial data.

## Entry points by change

| Change | Read first |
|---|---|
| Financial balances | lib/data/dashboard.ts, lib/yield-calculation.ts, rollover cron, both budget views |
| Transactions | lib/actions/transactions.ts, review.ts, create/edit forms, ReviewCard |
| Automation | lib/actions/ocr.ts, lib/ocr/*, lib/gemini/client.ts, app/api/gmail/*, lib/gmail/client.ts |
| Shopping | lib/actions/shopping-lists.ts, app/(dashboard)/mercado/*, purchase handoff migration |
| Security | Middleware, Supabase clients, policies/RPCs; verify deployed schema before asserting isolation |
| Design | app/globals.css, tailwind.config.ts, components/ui, SidebarMenu, public/login views |

Compatibility exports are intentional: lib/types/database.types.ts reexports src/types/database.types.ts; lib/supabase/server.ts reexports src/lib/supabase/server.ts. The extra src directory does not itself mean there are two independent implementations.

## Existing design

Forest green, ivory, dark text, white, and clay accents; serif headings and an Inter/system body stack without explicit Inter loading. Rounded cards, shadows, gradients, drawer navigation. CSS variables and Tailwind colors partially overlap; local inputs differ, and metadata/manifest use several product names. This is an emerging visual system, not an approved brand. No PRODUCT.md or DESIGN.md existed before the review.

## Skills and supporting material

The review used Impeccable with two independent assessments, Supabase, webapp-testing, and local brand guidance at skill/brand/brand/SKILL.md. App Router patterns and the local cybersecurity guide were also explored. The repository catalog is skill/README.md; copies under skill/_installed/ should not be treated as distinct capabilities. Voice/messaging references live under skill/brand/brand/references/. No skills were installed or modified.

## Verification and unresolved areas

Current delivery: [FOUNDATION_PROGRESS.md](implementation/FOUNDATION_PROGRESS.md) records typecheck/build, six existing yield tests, and 19 foundation HTTP scenarios. Reproduce after a production build with node scripts/verify-foundation.cjs. Both cron endpoints reject missing/invalid configuration before work; authorized jobs were not executed. Lint still opens setup and is not passing. Original assessment results below remain historical context.

The owner requests scoped Git commits/pushes when appropriate, with English Conventional Commit messages and documented validation. Preserve unrelated changes and shared history.

Typecheck and all six existing yield tests passed. Lint opened an interactive setup prompt and did not complete. Production build passed with Next.js 15.5.28 and 27 generated pages. Browser/detector evidence and limitations are recorded in the assessment and docs/audit/.

The coordinating agent inspected login screenshots at desktop/mobile sizes: no horizontal overflow or captured page errors in those two cases. Public information routes responded successfully. Assessment B found one typography warning; it is not an accessibility verdict. Authenticated flows remain unverified.

Unverified: empty-user setup with accounts/categories, password recovery, two-user isolation, backup restore, actual OAuth/Gemini/Paddle operation, and load capacity. No versioned CI workflow was found. These limitations do not establish the absence of external deployment controls.

Keep this document current as evidence changes. Do not include personal account values, tokens, or email contents.
