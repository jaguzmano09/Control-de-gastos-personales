# Product direction and public-release plan

Proposed on 2026-11-11. This is not a schedule commitment or an owner-approved identity. It follows PLATFORM_REVIEW_2026-11-11.md.

## One governing principle

**Verifiable clarity about everyday money.** Every figure explainable, every automation reviewable, and every screen clear about the next decision.

Use the same standard for design, backend, and brand. A feature, animation, or sentence should help someone understand, record, or decide confidently. Prioritize correctness and complete tasks before expanding integrations.

Audience hypothesis: people in Colombia managing multiple accounts/wallets who want monthly spending control without a complicated spreadsheet. Validate with the owner and real users before defining the final identity. Do not assume all countries or business accounting are in scope.

## Proposed identity, pending validation

- Personality: calm, precise, approachable, respectful.
- Candidate promise: help people understand what they can spend and why. Publish it only when calculation and explanation support it.
- Defensible distinction: assisted capture, retained human review, and an explanation of financial impact. Avoid promising fully autonomous AI bookkeeping.
- Operational copy should describe actionable states: movements awaiting review, amounts excluded until confirmation, exact overspending, and recoverable failures. Promise draft preservation only once implemented.
- Establish one name, one short form, and one consistent symbol across web, installed app, email, and support. The current name describes a category; develop alternatives after segment/positioning and verify availability when selecting.
- Forest green/ivory can remain candidates. Consolidate tokens, reduce decorative shadows/gradients in task screens, use tabular figures and stable monetary hierarchy. Do not approve final palette/fonts without rendered and contrast checks.

## Work sequence and exit gates

| Stage | Work | Evidence required to advance |
|---|---|---|
| 1. Reproducible private foundation | Schema/RLS baseline without personal data; isolate repairs; align schema/types | Clean isolated installation and A/B isolation, cross-reference, admin, and service-role checks |
| 2. Financial core | Define effects by type, transfer endpoints, savings, opening balance, estimates; fix cron OR and rollover assignment | Exact business examples, agreement across summary/closing, safe retries and concurrency |
| 3. Complete first task | Access recovery, first account/category, transaction entry, budget allocation | A new user completes the flow without SQL or creator instructions; recoverable errors |
| 4. Identity and experience | Audience/message/name, tokens/patterns, navigation, overview hierarchy, accessible forms | Desktop/mobile views, keyboard/screen reader/zoom checks, empty/error states, target-user sessions |
| 5. Reliable automation | Paginated/recoverable Gmail, durable cursor/persistence, disconnection, measured OCR and quotas | Provider failure, expired cursor, repeat, volume, per-user budget and cost measurements |
| 6. Beta operations | Private support, export/deletion, accurate privacy information, backups/restore, logs/events/CI, accessible PWA assets | Rehearsed restore, useful alerts, working support, activation/retention measurement, verified installation/offline behavior |
| 7. Limited beta | Small cohort, explicit scope, error tracking/interviews | No unresolved integrity/privacy blockers, complete core tasks, repeated-use evidence |

Documentation and design can overlap, but opening access depends on integrity, privacy, and operations gates. Avoid a complete rewrite for appearance; isolate and test shared domain rules first.

## Recommended initial experience

Make a short sequence excellent: create workspace → first account → income or explicitly defined opening balance → expense → budget → explained available amount. Show review when there is something to review. OCR, Gmail, yield, and shopping can be progressively introduced with honest beta states instead of burdening first use.

Organize navigation around overview, transactions, and budgets; group capture/review and account/integration management. Study usage before removing existing functions. Mobile entry should be reachable and survive interruptions.

## Metrics tied to real questions

- Activation: share of new users completing a first transaction and useful budget; agree on the time window/target later.
- Comprehension: can the person explain available money and distinguish pending from confirmed?
- Retention: repeated recording/review/planning in later weeks, with consistent cohorts and definitions.
- Capture quality: usable extraction, corrected fields, abandonment, processing duration/cost.
- Integrity: detectable omitted messages, duplicates, closing failures, and discrepancies between views. Resolve known discrepancies before opening.
- Support: recurring causes and successful recovery. Never send amounts, transaction descriptions, emails, or receipts to product telemetry.

Do not treat arbitrary commercial percentages as evidence. Establish a beta baseline and agree on targets before expanding.

## Recommended first implementation block

Address F01/F02/F04/F07 and define F03 financial semantics. Then complete budgeting and first use. This makes the future identity credible: calm promises supported by figures and tasks people can verify.
