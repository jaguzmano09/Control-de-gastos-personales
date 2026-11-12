# Public-readiness roadmap

Status: Working v3 — P0 deliverables prepared for review; first P1 foundation fixes locally verified.
Prepared from the 2026-11-11 repository assessment.
Execution began after the owner's instruction to start development. This document records scope and evidence; it does not by itself authorize deployments, destructive migration execution, or changes to real financial data.

## Purpose and source documents

Turn the critical review into an actionable sequence for updating, repairing, redesigning, and operating the platform as a public product.

This document is the execution-planning reference. PROJECT_CONTEXT.md records the current implementation; PLATFORM_REVIEW_2026-11-11.md contains evidence and findings F01–F13; PUBLIC_RELEASE_PLAN.md explains the proposed product direction. Update these together when decisions or verified behavior change.

Governing principle: **every figure explainable, every automation reviewable, and every screen clear about the next decision**.

The target is a coherent, trustworthy first public version. Completion means meeting explicit release gates, not promising a permanently perfect product.

## Owner-confirmed requirements

The owner accepted the overall roadmap direction and added these requirements:

1. The public homepage must attract prospective customers immediately, explain what the platform does, and provide a compelling route into the product.
2. Identity must be distinctive and deeply connected to an experience that works well and is enjoyable to use. Naming and decoration alone do not meet this requirement.
3. The owner's account must retain all ordinary personal-account capabilities and also have an administrative area for product and operational metrics.
4. Privacy is a first-class priority because the platform handles personal financial information. Apply it throughout discovery, architecture, design, analytics, support, and release.

These are accepted planning requirements, not evidence of implemented features. The owner's account has not been promoted or otherwise changed by this document update. Public positioning, final identity, metric definitions, and administrative provisioning details still need specification.

The administrative boundary is deliberate: an elevated product role does not grant routine access to another person's transactions, balances, receipts, email contents, or integration credentials. The owner's personal financial workspace remains isolated under the same ownership rules as any ordinary account.

## How to read and track the roadmap

- Checkboxes record completion only after acceptance evidence is attached. Current task status and implementation scope are recorded below; no overall phase is complete merely because some tasks are checked.
- Dependencies govern implementation order. Discovery, documentation, and design exploration can overlap with technical work.
- An existing implementation is not automatically a completed roadmap task: verification is part of the work.
- Record owner decisions separately from implementation recommendations.
- Do not schedule dates until scope, available capacity, and unknowns are resolved. No duration or budget commitment is implied.
- Use task IDs when giving feedback, for example: P4.2 or P6.3.
- Each implementation task should eventually link its issue/PR, evidence, and any remaining limitation. Do not fabricate those links now.

| Phase | Main outcome | Depends on | Initial status |
|---|---|---|---|
| P0. Product definition | Agreed audience, core job, scope, and financial vocabulary | Remaining detailed owner decisions | In review |
| P1. Technical and privacy foundation | Reproducible setup, verifiable isolation, dependable checks | P0 scope; inspection can start independently | In progress: scoped initial fixes verified |
| P2. Financial correctness | One consistent model for balances, budgets, transfers, and closing | P1 test environment; P0 financial decisions | Draft |
| P3. Access and first use | A new user completes the core journey unaided | P1, P2 core rules | Draft |
| P4. Brand and design system | Distinctive identity, public-homepage concept, information architecture, and reusable patterns | P0; informed by P2/P3 | Draft |
| P5. Core experience redesign | Compelling public homepage and complete, accessible desktop/mobile financial workflows | P2, P3, P4 | Draft |
| P6. Reliable optional features | Safe, measured Gmail/OCR and coherent shopping/yield workflows | P1, P2; P4/P5 patterns | Draft |
| P7. Public operations | Private product administration, aggregate metrics, user controls, support, recovery, and PWA verification | P1 and implemented release scope | Draft |
| P8. Limited beta and public expansion | Evidence-based decision to open and expand access | Release gate below | Draft |

P6 may run as separate feature work. Gmail/OCR can remain outside the initial beta if their gates are unmet, provided unavailable functions are clearly withheld and the core product works without them. Existing personal-use data and workflows require an explicit compatibility plan.

Privacy is a gate in every phase, not work postponed until P7. Homepage and brand discovery can begin alongside P1/P2; final public claims and implementation must match verified product capabilities.

## P0. Define the product and agree on scope

Objective: decide who this is for and what success looks like before fixing the final brand or expanding features.

### Tasks

- [x] P0.1 — Owner confirmed personal finances in Colombia, COP, and America/Bogota. Evidence: PRODUCT_BRIEF.md decision D01.
- [x] P0.2 — Owner selected recording and organizing movements as the primary benefit. Evidence: PRODUCT_BRIEF.md decision D02.
- [ ] P0.3 — Decide the first-beta feature set: essential, optional, deferred. Review manual entry, budgets, wallets, review, savings/yield, shopping, OCR, and Gmail individually.
- [ ] P0.4 — Agree on financial definitions: opening balance, actual balance, budget allocation, available budget, transfer, savings inflow/withdrawal, investment, estimated yield, and paid interest.
- [ ] P0.5 — Decide what to preserve from the current identity and workflow. Capture naming constraints and the owner's preferred tone.
- [ ] P0.6 — Identify operating constraints: maintenance capacity, support ownership, acceptable provider costs, and whether beta access is invited or open. Monetization remains a separate decision, not an assumed implementation requirement.
- [ ] P0.7 — Define three connected journeys: a visitor discovering the public homepage, a member managing personal finances, and the owner inspecting product metrics. Specify the value and next action for each without mixing private and public surfaces.
- [ ] P0.8 — Record privacy commitments and an initial data inventory: collection purpose, minimum necessary fields, provider access, retention, deletion, and permitted administrative visibility. Define the product questions metrics should answer before collecting events.

### Deliverables and exit criteria

An owner-reviewed product brief, financial glossary, scope matrix, and decision log. The first successful user journey is explicit. Record unresolved decisions rather than silently choosing them.

Primary inputs: F03, F08, F09 and the experience/identity assessment.

Prepared deliverables: [product brief and decision log](product/PRODUCT_BRIEF.md), [financial glossary/model proposal](product/FINANCIAL_MODEL_PROPOSAL.md), and [privacy data inventory](product/PRIVACY_DATA_MAP.md). D03 confirms progressive Gmail/OCR availability; remaining scope classifications, financial semantics, brand constraints, and operating limits remain in review.

## P1. Make the foundation reproducible and private

Objective: establish a safe environment in which fixes can be implemented and demonstrated.

### Tasks

- [ ] P1.1 — Inventory the actual schema, RLS policies, grants, functions, triggers, and deployment configuration through authorized inspection. Separate facts from unavailable configuration.
- [ ] P1.2 — Produce a schema-only installation baseline and a safe upgrade path. Isolate historical personal repairs; preserve applied migration history and existing user data.
- [ ] P1.3 — Create an isolated test environment with synthetic users A/B and nonfinancial production-independent data.
- [ ] P1.4 — Verify ownership across reads, writes, foreign references, RPCs, normal/admin/anonymous actors, and service-role operations.
- [x] P1.5 — Align the cookie-backed session client with generated `Database` types and retain the intentional compatibility reexport. Pin `@supabase/ssr` 0.12.7: the previous 0.5.2 wrapper failed to infer the current generated schema and produced `never` query results. Strict typing exposed and resolved stale form/query/RPC assumptions; the middleware keeps an untyped client because its auth and consent queries fail type inference through the middleware adapter. Verification: `npm run typecheck` and production build pass.
- [x] P1.6 — Configure noninteractive lint and CI for typecheck, appropriate tests, and production build. Review dependency/security configuration without automatic unscoped upgrades. GitHub Actions runs 5 and 6 passed lint, typecheck, unit tests, production build, and foundation scenarios. A scoped override fixes the affected `minimatch` and `postcss-selector-parser` branches; `npm audit` now reports zero vulnerabilities. `next lint` still emits its Next.js 16 deprecation warning and should be migrated before upgrading Next.js.
- [x] P1.7 — Make cron authentication fail closed when configuration is absent and review privileged-route errors. Both cron endpoints reject missing configuration with 503 and invalid credentials with 401; bearer comparison uses a shared timing-safe helper. Rollover and Gmail sync return generic server errors, and rollover success returns aggregate counts without account IDs or amounts. Gmail OAuth callback logs only a fixed message; OCR provider failures remain generic. Verification: typecheck, lint, and production build pass.
- [x] P1.8 — Correct public routing for manifest, service-worker script, and offline document. GET/HEAD access, content types, and protection of private/asset-prefix routes verified against the local production build. Evidence: FOUNDATION_PROGRESS.md and 19 HTTP scenarios.
- [ ] P1.9 — Specify and verify server-managed administrative permissions and a trusted provisioning/revocation process. The owner account was verified as the sole Auth user and promoted through the privileged database process. Hosted metadata confirms the admin RPC is `SECURITY DEFINER` with an empty `search_path`, callable by authenticated users only, and profile RLS is enabled. `docs/ADMIN_ACCESS.md` defines provisioning and revocation. Non-production cross-role checks remain pending under P1.3/P1.4.
- [ ] P1.10 — Threat-model the personal workspace, admin area, telemetry, logs, caches, exports, and provider connections. Initial source/hosted review is recorded in [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md); new OCR rows no longer retain full OCR text or provider diagnostics, Gemini keys no longer appear in URLs, and privileged cron output is minimized. Remaining blockers include historical OCR `raw_data`, provider privacy/retention review, telemetry cohort suppression, OCR rate limits, deletion/export, and deployed cache headers. Administrative access to financial records is not present in the reviewed page or aggregate RPC.

### Deliverables and exit criteria

A clean isolated installation and safe upgrade rehearsal; negative A/B ownership tests including admin-to-user financial access; documented service-role boundaries; verified role grant/revocation and self-promotion rejection; passing noninteractive checks; missing-secret rejection; public PWA asset requests no longer redirect to login.

Primary findings: F01, F06, F07, F13. Supporting work: F10, F12.

## P2. Establish financial correctness

Objective: make every displayed amount follow the same agreed rules.

### Tasks

- [ ] P2.1 — Translate the P0 glossary into a table of effects for each transaction type, state, and savings operation. Define rounding and date boundaries.
- [ ] P2.2 — Implement transfer source/destination or explicitly linked counterpart semantics, with atomic persistence and retry safety.
- [ ] P2.3 — Reconcile savings, opening balances, investments, estimated yield, and actual interest without unintended duplicate money.
- [ ] P2.4 — Correct the rollover yield query so account selection and null-wallet selection are conjunctive.
- [ ] P2.5 — Make rollover assignment transactional and retry-safe; derive totals from assignments, support multiple sources, and define reassignment/recalculation behavior.
- [ ] P2.6 — Consolidate shared financial rules across overview, budgets, yield, and month closing. Keep estimated and recorded values distinguishable.
- [ ] P2.7 — Guarantee complete aggregation at supported volumes; avoid silently calculating from capped result sets.
- [ ] P2.8 — Prepare a compatibility/reconciliation plan for existing personal records before changing accounting semantics.

### Deliverables and exit criteria

A business test matrix with exact expected amounts covering transfers, savings, multiple accounts, pending/duplicate/discarded exclusion, overspending, month boundaries, rate changes, repeated closing, failed writes, and concurrent assignment. The same scenario produces matching figures across all relevant views. Existing records have a reviewed migration or compatibility strategy.

Primary findings: F02, F03, F04. Supporting work: F08, F10, F12.

## P3. Complete account access and the first-use journey

Objective: remove dependence on creator knowledge or direct database edits.

### Tasks

- [ ] P3.1 — Complete and verify registration, confirmation, login, logout, forgotten-password recovery, and expired/error states.
- [ ] P3.2 — Keep active document versions and acceptance flows consistent; define which operations require current acceptance and enforce it at the appropriate boundary.
- [ ] P3.3 — Guide the creation of a first account and categories from an empty workspace, using defaults only where approved.
- [ ] P3.4 — Implement monthly budget amount creation/editing, including clear distinction between allocation and alert thresholds.
- [ ] P3.5 — Complete the journey from first account through income/opening balance, expense, budget, and explained available amount.
- [ ] P3.6 — Replace the settings placeholder with the account controls approved for the initial scope.
- [ ] P3.7 — Preserve progress where appropriate and provide actionable recovery when initial setup fails.

### Deliverables and exit criteria

A new synthetic user completes the agreed first journey without SQL, hidden setup, or instructions from the creator. Recovery works end to end, and empty states distinguish no data from loading/error conditions.

Primary findings: F08, F09, F10. Supporting work: F07.

## P4. Define identity and the design system

Objective: establish a recognizable, consistent product whose promises match implemented behavior.

### Tasks

- [ ] P4.1 — Agree on positioning, personality, product promise, and evidence supporting each public claim.
- [ ] P4.2 — Develop and review naming options; verify availability/conflicts when choosing a candidate. Define the long name and short form.
- [ ] P4.3 — Define the visual direction: symbol/logo, palette, typography, numerical presentation, icon usage, spacing, and density.
- [ ] P4.4 — Unify tokens and reusable patterns for inputs, buttons, financial figures, tables, alerts, review states, empty states, errors, and confirmations.
- [ ] P4.5 — Redesign information architecture around frequent tasks; group advanced settings/integrations and reconcile duplicated navigation catalogs.
- [ ] P4.6 — Define voice and terminology for product UI, transactional messages, public pages, support, and financial explanations. Product copy remains Spanish; working documentation/comments remain English.
- [ ] P4.7 — Produce reference designs for the overview, manual entry, budget, review, and first use at desktop/mobile sizes.
- [ ] P4.8 — Explore and compare distinct brand directions grounded in the agreed audience and product behavior. Explain why the selected direction belongs to this platform, and validate recognition, clarity, emotional fit, and enjoyment with intended users. Avoid choosing solely from visual novelty.
- [ ] P4.9 — Design the public homepage as a dedicated acquisition experience: clear audience/problem/outcome, memorable first viewport, representative product preview with synthetic data, concise how-it-works, truthful trust/privacy information, and a primary call to action. Keep returning-user access easy to find. Define routing separately from the signed-in overview; do not assume a route migration yet.
- [ ] P4.10 — Design the owner's administrative view and entry point alongside the ordinary personal workspace. Establish visual context, aggregate metric hierarchy, date/cohort filters, empty states, and restricted-access behavior without adding financial-data browsing.

### Deliverables and exit criteria

An owner-reviewed brand brief and design system, documented product context, proposed tokens/components, navigation map, and representative public, personal, and administrative screens with synthetic content and error/empty states. Compare proposed brand directions against explicit reasons for distinctiveness and usefulness. In a brief first-impression check, intended visitors can explain the product's purpose, relevant benefit, and next action. Direction is approved before broad visual implementation. Typography/contrast are assessed on rendered output, not detector preference alone.

Primary input: experience/identity assessment. Supporting findings: F08, F09, F10.

## P5. Redesign and harden the core experience

Objective: apply the approved system to complete financial tasks efficiently and accessibly.

### Tasks

- [ ] P5.1 — Rebuild overview hierarchy around recorded money, budget capacity, and required attention. Make every headline figure explainable.
- [ ] P5.2 — Refine transaction creation/editing with associated labels, complete step/server validation, field-level errors, appropriate defaults, and recoverable drafts.
- [ ] P5.3 — Redesign budgets to show allocation, spent, remaining, carryover, and exact overspending. Show allocated budgets even before activity.
- [ ] P5.4 — Improve review and duplicate decisions with source context, correction controls, confirmation impact, and consistent state transitions.
- [ ] P5.5 — Provide searchable/filterable transaction history with pagination and clear scope; evaluate batch operations only if supported by the primary job.
- [ ] P5.6 — Implement accessible navigation: keyboard operation, Escape behavior, focus management, visible focus, and appropriate overlay semantics.
- [ ] P5.7 — Apply responsive behavior and consistent loading, empty, success, error, long-content, and interruption states across core routes.
- [ ] P5.8 — Build and verify the approved public homepage and its transition into registration/first use. Demonstrate the actual product with synthetic examples, preserve fast sign-in access, and keep claims aligned with released functionality. Verify mobile first impressions, accessibility, loading behavior, and understandable calls to action; avoid invented testimonials, usage counts, or unsupported promises.
- [ ] P5.9 — Validate that the identity works through real tasks: consistent tone, responsive feedback, readable financial hierarchy, comfortable interactions, and useful completion states. Assess both task success and perceived appeal; visual polish cannot compensate for incomplete workflows.

### Deliverables and exit criteria

Verified desktop/mobile journeys, keyboard and screen-reader checks, zoom/contrast checks, synthetic empty/error/high-volume cases, and task-based feedback from intended users. Public-homepage comprehension and the transition to first use are evaluated separately from returning-member efficiency. No known misleading balance labels or blocked core task remains. Capture before/after evidence against the same scenarios and record both usability and perceived-appeal feedback.

Primary findings: F08, F10, F12 and the experience assessment. Depends on P2 truth and P4 patterns.

## P6. Make optional features reliable and economically bounded

Objective: release automation and advanced features only with observable, recoverable behavior.

### Tasks

- [ ] P6.1 — Repair Gmail persistence/cursor ordering, provider-message idempotency, pagination, expired-history recovery, and per-message retry handling.
- [ ] P6.2 — Parse exact sender addresses, handle supported movement types, define import windows, and reconcile categorization-rule behavior.
- [ ] P6.3 — Provide real Gmail disconnection/revocation, intelligible connection health, and applicable Google verification readiness.
- [ ] P6.4 — Measure OCR usability, duration, memory, correction frequency, and cost. Align actual upload/runtime limits with published claims.
- [ ] P6.5 — Add per-user quotas/resource limits, bounded retries, provider-failure handling, and recoverable processing states. Keep extracted data untrusted and pending human review.
- [ ] P6.6 — Review shopping draft/line atomicity, actual-price confirmation, duplicate purchase prevention, and usable price-history scope.
- [ ] P6.7 — Present yield assumptions and estimates honestly; validate advanced account/wallet configuration and its effect on closing.
- [ ] P6.8 — Decide independently whether each optional feature is ready, remains restricted, or is deferred.

### Deliverables and exit criteria

Synthetic provider-failure, expired-cursor, repeated-message, partial-write, repeated-purchase, and volume scenarios pass. Cost/resource measurements exist. Users can recover or disconnect. Verification/provider requirements are resolved for the released scope. Each feature has an explicit availability decision.

Primary findings: F05, F11. Supporting work: F03, F06, F09, F10, F12.

## P7. Prepare public operations and user control

Objective: support real users and recover from failures without relying on ad hoc access to their finances.

### Tasks

- [ ] P7.1 — Establish a private support and security-reporting channel; separate personal-data requests from public GitHub issues.
- [ ] P7.2 — Implement the approved data-export and deletion/request flows, including integration tokens, retained data, and operational responsibilities.
- [ ] P7.3 — Align privacy/terms/security content with actual providers, data flows, retention, user controls, and released functionality; obtain applicable qualified review.
- [ ] P7.4 — Instrument real activation and feature events without financial amounts, descriptions, email content, receipts, or secrets.
- [ ] P7.5 — Add actionable error/latency/job monitoring, cost visibility, and an operational response procedure.
- [ ] P7.6 — Document and rehearse backups, restoration, safe deployment, rollback, and incident recovery.
- [ ] P7.7 — Verify PWA installation, first visit, sign-in/out, update lifecycle, offline fallback, and private-response caching behavior.
- [ ] P7.8 — Document release configuration, required checks, known limitations, and ownership for support/operations.
- [ ] P7.9 — Specify and implement an administrative metric dictionary: registrations, activation, active-user windows, retention cohorts, feature adoption, automation outcomes, reliability, and operating cost where measurable. Define event sources, timezone, denominators, deduplication, freshness, and unavailable metrics. Do not present uninstrumented values as zero or assume commercial revenue metrics before monetization exists.
- [ ] P7.10 — Provide the owner an administrative area through the same identity while retaining the complete ordinary-account experience and personal data. Authorize every admin read on the server, verify role revocation, and test that ordinary users cannot reach protected data by direct request.
- [ ] P7.11 — Keep administration privacy-preserving: aggregate product metrics by default, minimize identifiers, avoid granular filters that reveal individual activity in small cohorts, and define minimum reporting groups before enabling segmentation. Audit privileged access without logging financial payloads or secrets. No routine user impersonation or private financial browsing is included.
- [ ] P7.12 — Complete a privacy review across homepage previews, tracking, admin responses, logs, providers, backups, retention, exports, and deletion. Document what the owner can see and what remains private, and verify those boundaries with synthetic accounts.

### Deliverables and exit criteria

A working private contact route, verified data-control procedures, a successful restore rehearsal, useful monitoring, sanitized telemetry, documented rollback, and PWA behavior matching claims. The owner's ordinary workspace and role-protected admin area both work; metric definitions and source instrumentation are verified, private financial records remain inaccessible through admin analytics, and reporting granularity meets the agreed privacy rules. Legal/provider obligations are resolved for the actual launch scope rather than assumed satisfied.

Primary findings: F09, F12, F13. Supporting work: F01, F07, F11.

## P8. Run a limited beta, then decide on expansion

Objective: replace assumptions about usefulness and reliability with observed evidence.

### Tasks

- [ ] P8.1 — Assemble the release evidence and review every required gate.
- [ ] P8.2 — Invite a small agreed cohort with explicit feature scope and a private feedback channel.
- [ ] P8.3 — Observe first-use completion and whether people can explain their available amount and pending/confirmed distinction.
- [ ] P8.4 — Track repeat use, correction needs, support causes, integration failures, and operating cost.
- [ ] P8.5 — Fix discovered blockers and repeat only the affected checks plus required regression checks.
- [ ] P8.6 — Review the evidence with the owner and record a decision: expand, extend beta, narrow scope, or defer release.
- [ ] P8.7 — Evaluate homepage comprehension, brand recognition/appeal, onboarding conversion, and return use as separate questions. Inspect the owner's aggregate dashboard for usefulness and privacy before expanding access; distinguish measured results from qualitative feedback.

### Deliverables and exit criteria

A beta report with real findings, unresolved risks, core-task outcomes, cohort definitions, and agreed next targets. Expansion is an explicit owner decision based on evidence; neither a passing build nor visual approval alone authorizes it.

## Release gate

A limited external beta requires:

- P0 scope and financial definitions agreed.
- P1 foundation and isolation evidence complete.
- P2 financial correctness demonstrated for the release scope.
- P3 first-use and recovery journey complete.
- P4 identity direction reviewed and P5 core experience verified.
- Public homepage demonstrates the product's value with verified claims and synthetic previews; the approved identity is consistent across discovery, personal use, and administration.
- P7 support, privacy controls, recovery, and operations ready.
- The owner's normal-account capabilities are preserved, administrative access is server-authorized, and analytics expose only the agreed privacy-preserving metrics.
- Privacy boundaries are verified across all released surfaces, providers, telemetry, support, and data lifecycle; they are not waived by visual approval or the administrator role.
- Every included P6 feature individually passes its gate; excluded features cannot appear available.
- No unresolved known integrity, privacy, or task-blocking issue in the released scope.
- Existing personal data compatibility reviewed.
- Evidence and known limitations recorded, followed by explicit release authorization.

## Finding-to-phase traceability

| Finding | Primary phase | Supporting phases |
|---|---|---|
| F01 — Missing baseline/personal repair migrations | P1 | P2, P7 |
| F02 — Cross-account yield filter | P2 | P1 |
| F03 — Transfer/savings semantics | P2 | P0, P5, P6 |
| F04 — Rollover overwrites/concurrency | P2 | P5 |
| F05 — Gmail reliability | P6 | P1, P7 |
| F06 — Missing cron secret handling | P1 | P6 |
| F07 — Unproven multiuser isolation | P1 | P3, P7 |
| F08 — Incomplete budget workflow | P3 | P2, P5 |
| F09 — Access/settings/support gaps | P3 | P0, P6, P7 |
| F10 — Validation and recovery | P5 | P1, P3, P6 |
| F11 — Automation resource/cost controls | P6 | P0, P7 |
| F12 — Data scaling/observability | P7 | P1, P2, P5 |
| F13 — PWA asset redirects | P1 | P7 |

## Owner feedback worksheet

Use this section or reference task IDs in conversation. Confirmed requirements are recorded alongside decisions that remain open. The current decision log is in product/PRODUCT_BRIEF.md.

| Decision | Current proposal | Owner feedback/status |
|---|---|---|
| Initial audience | Personal finances in Colombia, COP, America/Bogota | Confirmed by owner: D01 |
| Leading job | Record and organize personal movements | Confirmed by owner: D02 |
| Initial feature scope | Recording first; Gmail/OCR progressively enabled after their checks | Progressive availability confirmed: D03; full scope table in review |
| Existing identity | Assess what to preserve before naming/visual changes | Open |
| Public homepage | Dedicated acquisition experience explaining value immediately and leading into first use | Required by owner; audience, content, concept, and routing details open |
| Identity quality | Distinctive identity expressed in useful, enjoyable product behavior as well as visuals | Required by owner; creative direction and final name open |
| Owner administration | Same identity retains full personal use plus a protected product-metrics area | Required by owner; metric scope and trusted provisioning details open |
| Privacy | First-class cross-phase requirement; aggregate administration without routine access to others' finances | Required by owner; detailed retention/reporting rules to specify |
| Financial semantics | Agree P0.4 before accounting changes | Open |
| Phase order | Keep integrity/privacy gates before external access; allow discovery/design overlap | Open |
| Commercial scope | Do not assume billing, subscriptions, teams, or internationalization | Open |
| Capacity and dates | Estimate after scope/dependencies are agreed | Open |

## Execution record

P0 started on the owner's development instruction. Product brief, proposed financial glossary, privacy inventory, three journeys, and a decision log are prepared. P0.1/P0.2 are confirmed; the overall phase remains in review.

P1 received bounded routing/cron fixes, reproducible CI, and live Supabase privacy remediation. The hosted project has 23 public tables with RLS enabled, 22 policies, 17 functions, 29 triggers, and no recorded migrations. Anonymous table grants were revoked from four private tables; client execution was removed from guarded functions and trigger handlers. Authenticated clients can no longer read Gmail OAuth tokens; only status columns remain available. OCR rejects oversized declared requests, accepts only JPEG/PNG/WebP, and returns generic provider errors. Gmail sender matching now requires an exact normalized address, and sync failures no longer expose per-user IDs/errors or advance the history cursor after failed inserts. A rollover yield query was narrowed to one account. `product_events` intentionally has no direct policy: its table grants are removed and aggregate access uses an authenticated admin RPC. Evidence: [CI baseline](implementation/CI_BASELINE.md), [foundation delivery](implementation/FOUNDATION_PROGRESS.md), and [grant remediation](implementation/PRIVACY_GRANT_REMEDIATION.md). P1.1 remains in progress: baseline/schema reconciliation, authenticated-user isolation tests, OCR rate limits, safe-path review of invoker functions, and an end-to-end OAuth permission test are open. Direct production corrections are not recorded in the hosted migration ledger.

For each task when execution begins, record: status, responsible person, linked change, acceptance evidence, unresolved limitations, and the next dependency. Suggested statuses: Draft, Ready, In progress, In review, Verified, Deferred. A task becomes Verified only when its acceptance evidence exists.

Revision history: v1 established tasks; v2 incorporated homepage, identity, owner administration, and privacy feedback; v3 records confirmed Colombia/recording/progressive-integration decisions and the first scoped implementation evidence. Detailed decisions remain open for further feedback.
