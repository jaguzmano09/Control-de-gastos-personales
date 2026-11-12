# Critical platform assessment

Date: 2026-11-11. Scope: architecture, financial rules, security inspection, user experience, identity, and public readiness. Two independent design assessments were authorized: A reviewed design and flows; B reviewed detector/browser evidence. A finished before B findings entered the synthesis. Technical domain analysis was performed by the coordinating agent.

## Verdict

Do not open registration to the public yet. The application contains valuable domain work and a defensible promise: assisted capture, human review, and control over financial impact. However, essential self-service paths are incomplete, and inconsistencies can produce misleading figures or incomplete imports.

Proposed governing principle: **every figure explainable, every automation reviewable, and every screen clear about the next decision**. This is a proposed direction, not an owner-approved identity.

This is not security certification, legal advice, or verification of actual account balances. No financial records or remote database were inspected; no users were created and no real integrations or scheduled jobs were executed. The review changed documentation only, preserving the preexisting middleware edit.

Owner preferences: communicate in Spanglish; write code comments and documentation in English. Existing UI language remains Spanish.

## Strengths worth preserving

- Explicit pending/confirmed separation gives users a chance to correct OCR/AI.
- Rich domain coverage: wallets, budgets, review, actual purchase prices, and dated yield rates.
- Manual submission UUIDs and a purchase-confirmation RPC that locks its draft.
- Public-beta foundations separate administrative roles from private finances and role-check aggregate metric access.
- Ownership checks in yield/shopping triggers, plus authentication and image-size checks in OCR.
- A calm visual direction, some shared components, and reduced-motion support.

## Prioritized findings

P0 denotes a release gate due to potential data/trust impact, not a proven exploit. P1 should be resolved before public self-service. P2 can follow core stabilization. Findings distinguish confirmed implementation from consequences requiring runtime verification.

### F01 · P0 · No reproducible, generic installation baseline

Confirmed in repository files. The earliest migration alters an existing enum. Initial DDL and base RLS policies for accounts, wallets, categories, transactions, and basic budgets were not found. Generated types cannot substitute for deployed DDL/policies.

Migrations 20261025040000_apply_dale_wallet_split.sql and 20261025050000_reset_dale_wallet_yield.sql locate the first account named DALE, depend on personal wallet/data arrangements, and modify amounts. The second deletes transactions and rate history. A clean installation would fail; a multiuser installation must not select personal repair targets globally by name.

Closure: produce a verified schema-only baseline, preserve applied-history traceability, isolate one-time data repairs, and demonstrate fresh installation and upgrade in isolated environments. Do not blindly remove/reorder applied migrations.

### F02 · P0 · Rollover yield query can mix a user's accounts

Confirmed in app/api/cron/rollover/route.ts:166. For an account target, the filter is account_id equals target OR wallet_id is null. It therefore admits walletless movements from other accounts belonging to the same user. The user_id filter remains; this is not evidence of cross-user disclosure.

Closure: account target AND null wallet, with two accounts, a wallet, income/expense cases, and agreement between cron and overview. No actual affected balance was observed.

### F03 · P1 · Transfers and savings lack sufficiently explicit accounting semantics

NuevaTransaccionForm.tsx:7 offers transfers but captures one account and an optional wallet. The transaction contract has no explicit destination or linked counterpart. lib/data/dashboard.ts:139 records transfer totals without changing balance, while its yield movement mapping at :195 treats anything other than income/savings inflow as an outflow. One transfer can be neutral for balance and negative for yield principal.

Savings inflows increase account and aggregate balances. Whether this double counts money depends on whether the entry represents external money or an internal allocation; that business decision is unresolved.

Closure: define opening balance, transfer source/destination, savings purpose versus movement, and invested money. Establish an effect table per type and one shared calculation model across overview, budgets, closing, and yield. Separate financial balance, budget capacity, estimated yield, and paid interest.

### F04 · P1 · Manual rollover assignment can overwrite earlier allocations

lib/actions/rollover.ts:34 writes rollover_amount equal to the current review amount rather than deriving the sum assigned to the category. Assignments of 100 and 200 can leave 200 instead of 300. Budget and review status are separate writes, with no pending-status guard. Retries, multiple tabs, and partial failure need explicit handling. Cron recomputation also overwrites values, so preservation of manual decisions must be specified.

Closure: transactional, locked/idempotent assignment derived from review records; test multiple sources, reassignment, retries, and concurrent requests. Excess that is not carried forward should remain visible in the source period.

### F05 · P1 · Gmail may skip movements and cannot fully recover

app/api/gmail/sync/route.ts:100 increments its count only on a successful insert, but :103 advances the history cursor even after an insert error. A consumed message may therefore never become a stored transaction. lib/gmail/client.ts:56 performs one history request without nextPageToken handling or expired-history recovery. The callback starts from the current cursor, without importing earlier messages or explaining an import window.

Sync forces type Gasto even for income/transfer messages. Sender matching uses a substring of the raw From header instead of exact parsed mailbox equality. Categorization rules were not found in this path.

Closure: durable idempotency by user/provider/message, cursor advancement after persistence, recoverable per-message failures, pagination, bounded recovery, movement-type extraction, and exact sender parsing. Test repeated messages, DB errors, expired cursors, multiple pages, and bank formats. The [official Gmail sync guide](https://developers.google.com/workspace/gmail/api/guides/sync) documents full/partial synchronization and recovery when history is unavailable.

### F06 · P1 · Gmail cron does not fail closed on missing configuration

app/api/gmail/sync/route.ts:8 compares authorization against Bearer plus process.env.CRON_SECRET without first checking that the secret exists. If unset, a literal Bearer undefined header matches. Rollover cron already checks configuration. Production secret absence was not established.

Closure: reject missing configuration in both endpoints and test missing, invalid, and correct credentials. Avoid exposing raw provider/database errors.

### F07 · P0 release gate · Multiuser isolation has not been demonstrated

Recent migrations include useful policies and ownership checks, but base policies are missing from version control. Several actions update by id and rely on RLS. That can be safe with correct policies; it is not proof of a leak. A row's user_id also does not prove its referenced account/category/wallet belongs to that user.

The session server client in src/lib/supabase/server.ts:9 lacks the Database generic, weakening query type coverage. Service-role operations require separate review because they bypass RLS. Recent SECURITY DEFINER RPCs include meaningful checks; the attribute alone is not proof of vulnerability.

Closure: inspect deployed schema/grants/RLS; run negative SELECT/INSERT/UPDATE/DELETE/RPC tests with users A/B, foreign references, normal/admin/anonymous actors, and service-role paths. Verify admins receive only permitted aggregates. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

### F08 · P1 · Budget allocation cannot be completed through budget screens

Both budget views allow editing alert percentages but not assigning budget amounts. Their actions update thresholds or create zero-amount rows. This breaks a core task for a new user.

The overview filters budgets by activity/rollover at app/(dashboard)/page.tsx:94 and may claim no budget is assigned despite an inactive base allocation. Wallet budgeting mixes real-balance wording with budget capacity; Math.max clamps available amounts to zero and hides the size of overspending.

Closure: create/edit monthly allocations, guide the first budget, show allocations without activity, and display exact excess. A new user must create an account, record income/expense, and allocate a budget without SQL or creator assistance.

### F09 · P1 · Access, account management, and support are incomplete

Sign-in/sign-up UI exists, but visible password recovery and complete account management do not. /configuracion is a placeholder. No onboarding that creates/guides accounts/categories from an empty workspace was found. Login hardcodes document versions while the database controls active versions.

Support links to GitHub issues, including privacy requests. This requires a GitHub account and can encourage public disclosure of sensitive information. Privacy/security pages are a useful start, but future-process wording is not an operating mechanism. Disabling a sender does not disconnect or revoke Gmail access.

Closure: verified recovery/confirmation, account management, export and private deletion requests, operational private support, real disconnection, and clear provider/scope/retention information. Privacy disclosures must reflect that email/receipt data can be transmitted to Gemini/Paddle depending on configuration. Applicable legal obligations need a separate qualified review.

Google classifies gmail.readonly as restricted. Prepare the verification/security assessment applicable to actual processing before promising public availability; the project's current Google verification status was not inspected. See [official Gmail scope requirements](https://developers.google.com/workspace/gmail/api/auth/scopes).

### F10 · P1 · Inconsistent validation and weak recovery

The manual Continue button is type=button. Its checks cover date/account/amount but not the wallet marked required. Controls disappear on the confirmation step and hidden values are submitted. The server action does not explicitly validate account-wallet ownership, real calendar dates, or finite amounts as strictly as review. This does not establish that the unseen base schema accepts invalid values.

Many errors are thrown or placed in URL parameters as raw provider/database messages. Login has no try/finally for exceptional SDK/network failures. No route-specific error.tsx/loading.tsx boundaries were found. Several queries turn errors into empty arrays, obscuring the distinction between no data and failed loading. Categorization constructs RegExp directly without catching invalid patterns.

Closure: shared server validation, field errors, preserved drafts, understandable recovery, and internal traceability. Test nonfinite amount, invalid date, empty/foreign wallet, interrupted navigation, invalid regex, and unavailable providers. Choose confirmation based on reversibility rather than adding it everywhere.

### F11 · P1 · Automation cost and resource use lack visible application controls

OCR combines expensive processing with a 180 s budget. Tesseract queues work in one instance's memory; this is not durable scheduling or global per-user limiting. Application quotas/rate limits/cost caps and volume evidence were not found. External deployment controls may exist and were not inspected.

Closure: measure duration, memory, usable extraction, and cost per receipt; apply per-user limits, actual decoding/size checks, bounded retries, and recoverable job state. Verify Server Action/runtime/body limits against the UI's 10 MB/180 s promise. Upstream layers can reject a request before application validation runs.

### F12 · P1/P2 · Data scaling and observability remain incomplete

Transactions use limit(300) without pagination. Monthly overview queries do not page all results; if the configured Data API response maximum is exceeded, calculations can aggregate only a subset. This is a configuration/volume-dependent risk, not proof of currently truncated totals. Shopping limits price history to 200 records.

Product-event tables/RPCs exist, but no flow instrumentation calls were found. Admin acknowledges that events will appear when instrumentation is activated. No versioned CI or complete ESLint configuration was found, and tests cover six yield cases only.

Closure: complete server/database aggregates, visible pagination, volume tests, minimal real events without financial data, useful failure/latency monitoring, and noninteractive CI. Compilation is not lint or business validation.

### F13 · P1 · PWA assets redirect to login without a session

Confirmed against the local production build by the coordinating agent. Unauthenticated GET requests to /manifest.webmanifest, /sw.js, and /offline.html each returned HTTP 307 with Location /login. The middleware matcher includes these paths and its public allowlist does not include them. Public privacy/security/support pages returned 200.

This prevents unauthenticated clients from retrieving the manifest, service-worker script, and offline document at their advertised URLs. It does not establish failure in every authenticated or previously installed state.

Closure: expose intended public static assets through middleware, set appropriate response types/cache behavior, and test first visit, sign-in/out, installation, and offline navigation. Do not cache private financial responses as a shortcut.

## Experience and identity

The design communicates calm, order, and approachability, but still reflects the creator's mental model. Accounts, wallets, categories, rules, savings, investments, rollover, and multiple capture paths appear before a simple first task is assured. Nine ungrouped drawer destinations and a long overview obscure the immediate action.

Promotional headers and repeated shortcuts take space before financial decisions. The overview should first explain recorded money, spending capacity under the plan, and required review. Figures need period, confirmation state, components, and estimation status.

The generic wallet symbol and descriptive name identify a category but offer little brand ownership. Control de Gastos Personales, Control de gastos, Mis gastos, and Gastos vary across surfaces. Green/ivory/serif can remain a foundation, but should be precise and consistent rather than merely decorative.

Recommended direction: verifiable clarity. Use a calm, direct, respectful voice without judging spending. The optional is_necessary question needs context or a more useful purpose. Do not promise accuracy, savings, or banking automation beyond verified behavior.

### Independent assessment A: Nielsen heuristics

Provisional code-based scores, 0–4 each. These are not a visual benchmark or user-study result.

| Dimension | Score | Main reason |
|---|---:|---|
| State visibility | 2 | States exist; some empty messages can misrepresent data |
| Real-world match | 2 | Spanish/COP, but terminology and balance concepts mix |
| Control/freedom | 2 | Edit/review exist; recovery/navigation incomplete |
| Consistency | 2 | Shared base, duplicated styles/navigation catalogs |
| Error prevention | 1 | Confirmation exists, but step validation is incomplete |
| Recognition | 2 | Visible labels, insufficient guidance for financial concepts |
| Efficiency | 1 | Filters exist; frequent paths/bulk operations limited |
| Minimalism | 2 | Calm direction, repeated cards/blocks |
| Error recovery | 1 | Raw errors and silent validation |
| Help | 1 | Support exists; contextual guidance/first use incomplete |
| **Provisional total** | **16/40** | **Substantial experience gaps before release** |

### Personas and emotional journey

- First-time user: cannot discover how to prepare categories or assign money; needs a successful expense entry in an empty workspace.
- Keyboard/screen-reader user: manual labels lack programmatic associations; overlay lacks Escape/focus management. Verify the complete real journey as well as markup.
- Interrupted mobile user: local form state can be lost on reload/navigation; too many decisions per entry. Check virtual keyboard, reachability, and draft recovery.

The landing earns trust through human review. Incomplete tasks and technical errors spend that trust. Task completion should show the recorded amount, account, status, financial impact, and a clear next action.

Minor observations: CSS/Tailwind token overlap; inconsistent local inputs; unconfirmed Inter font loading; manifest/metadata names/colors differ. These are secondary to calculation and task-completion problems.

Questions to resolve: Which core job leads—recording, planning, or reconciliation? What should a first-time user complete in five minutes? What explanation makes an available balance trustworthy?

## Executed validation

| Check | Result |
|---|---|
| npm.cmd run typecheck | Passed |
| Native Node TypeScript yield tests | 6/6 passed |
| npm.cmd run lint | Incomplete: opened interactive ESLint setup; not configured during review |
| npm.cmd run build | Passed, Next.js 15.5.28, 27 pages generated |
| Two-user RLS/API isolation | Not executed |
| Actual OAuth/OCR providers/crons | Not executed |
| Dependency/CSP/headers/penetration audit | Not exhaustive |

Webpack cache-serialization warnings did not prevent the build. Its internal lint phase does not establish configured lint: the dedicated command prompted for setup.

### Detector and browser evidence

- Assessment B ran the deterministic detector and found exactly one warning: overused-font at app/globals.css:63, for the declared Inter stack. This is a subjective distinctiveness signal, not an accessibility defect or proof that Inter actually loaded. No ignore file was found.
- Assessment B's browser preparation was interrupted by a hanging file-creation tool. It started no server/browser. The coordinating agent then completed a bounded browser check using existing cached Playwright/Chromium and the successful production build. This supplements B; it was not a second independent visual review.
- Login screenshots at 1440×1000 and 390×844 show a coherent green/ivory presentation and stacked mobile layout. Both had matching viewport/document widths, no horizontal overflow, associated labels for login inputs, and no captured pageerror events. This does not measure WCAG contrast, prove keyboard usability, or establish absence of all console/network errors.
- Mobile places the access form after the promotional content; the access anchor helps, but returning-user efficiency should be tested. Repeated explanatory cards create a long public page. No authenticated dashboard screenshots were obtained.
- PWA asset redirects were confirmed as F13. Public privacy/security/support returned 200.
- Service workers were blocked in the screenshot browser context to avoid persistent local registration; their script/manifest URLs were checked separately by HTTP. No account creation or writes were attempted.
- No live detector overlay was injected. The deterministic result and ordinary browser checks are the evidence; do not claim an overlay or rendered contrast analysis.
- The temporary production server was terminated in the script's finally block. Browser contexts were closed.

Artifacts: docs/audit/impeccable-detector-2026-11-11.json, browser-evidence-2026-11-11.json, login-1440.png, login-390.png, and the reproducible browser-evidence.cjs script. Public screenshots must not be extrapolated to authenticated financial workflows.

## Unresolved product decisions

1. Initial audience and primary job.
2. Commercial name and whether to retain the existing visual direction.
3. Beta scope: manual/budgets first; Gmail/OCR only after reliability/cost gates.
4. Accounting semantics for savings/transfers/opening balance, estimated yield, and business timezone.
5. Support and operations ownership.

Questions skipped: audience/name questions were already presented to the owner; these remain open, and no redesign is executed without them.
