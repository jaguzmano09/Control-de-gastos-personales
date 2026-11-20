# Privacy commitments and initial data inventory

Status: Initial P0.8 design inventory. Source and selected hosted grants/RPC metadata have been reviewed; provider settings, retention, and backup policies remain to be verified before release. Gemini and configurable PaddleOCR integrations exist in source, but no production provider configuration is approved or verified for personal financial data.

## Confirmed privacy boundary

Members control their own financial workspace. The owner has ordinary personal-account capabilities plus a planned administrative area for product/operational metrics. An admin role does not grant routine access to other members' finances.

Use synthetic examples in public previews, design files, tests, and screenshots. Never use the owner's real financial data as a demonstration dataset.

## Data inventory

| Data group | Purpose and local evidence | Intended visibility | Lifecycle and open work |
|---|---|---|---|
| Authentication identity/session | Supabase Auth; credentials/session and account contact | Member's own access; trusted authentication service | Self-service deletion requires current-password reauthentication, Turnstile, and explicit confirmation; only the server calls the privileged Auth deletion API. Never log passwords/session tokens |
| Role/profile | user_profiles stores user/admin | Own role where needed; trusted server authorization | Provision/revoke through trusted flow; no client self-promotion |
| Financial organization | accounts, wallets, categories | Owning member; not admin analytics | Define deletion dependencies and retention; names/categories can themselves be sensitive |
| Financial movements/review | transactions, duplicate_review_log, including raw_data | Owning member; authorized processing only | New OCR rows retain only the extraction engine in `raw_data`; five historical OCR payloads were scrubbed while preserving transaction columns. Verify backup expiry and define retention; do not copy payloads into logs |
| Budgets/rollover/yield | category_budgets, wallet_budgets, budget_rollover_reviews, yield_configs/rates | Owning member | Distinguish financial records from derived estimates; define deletion/recalculation lifecycle |
| Shopping/price history | stores, lists/items, price_history, purchase drafts/lines | Owning member | Purchases and locations can reveal habits; define incomplete-draft/history lifecycle |
| Receipt input | Browser resizing, then image processing on PlaENC application servers with Sharp/Tesseract; optional approved Paddle/Gemini path | Requesting member; an external provider receives the image only after explicit per-upload consent and a server-side provider gate | Upload cap is 4 MB and 20 MP. User-defined category names are not sent for OCR. Images, OCR text, and provider diagnostics are not persisted; a pending review record is created before processing. Verify provider retention/region and backup expiry before external processing is enabled |
| Gmail connection/messages | Gmail OAuth and sync; tokens in gmail_connections, extraction through Gemini | Server-only tokens; member's own connection status; only allowlisted sender bodies are downloaded/processed after header inspection | OAuth scope remains mailbox-wide `gmail.readonly`; verify provider retention, explain header access, implement disconnection/revocation and token cleanup |
| Document acceptance | document_versions and user_document_acceptances | Public active documents, own acceptance, narrowly authorized operations | Define necessary retention and update handling; do not promise immediate removal where a justified record must be retained |
| Private support requests | support_requests: account ID, request type, subject, message, status, admin response and timestamps | Request owner can view their own requests; server-authorized administrators can process only submitted requests | Direct table access is revoked; authenticated RPCs enforce owner/admin checks and a per-account limit of five requests per 24 hours. Self-service deletion explicitly purges requests; backup expiry remains undefined |
| Personal data export | Authenticated JSON download of member-owned finance/product records and safe connection status | Requesting member only; direct queries filter by the authenticated user ID and RPCs use `auth.uid()` | Gmail OAuth tokens and abuse-control counters are excluded. Export is `private, no-store`; tables are read independently rather than from one atomic snapshot. Validate completeness and isolation with synthetic accounts |
| Account deletion | Authenticated server action, service-role deletion RPC, and Supabase Auth Admin API | The signed-in member can initiate deletion only for their own account after password, Turnstile, and exact confirmation | Ordered purge includes finance, support, events, OAuth credentials, and profile privileges. Google grant revocation is required before purge. Auth closure can be retried while routes are blocked. Provider backup expiry is not verified; do not claim immediate physical erasure from backups |
| Product events | Allowlisted product_events with user_id/occurrence time; aggregate RPC | Role-checked, suitably grouped metrics; the member can export own event names and times | Current rows contain identifiers: do not call them anonymous. Deletion explicitly removes event rows and the FK uses `ON DELETE CASCADE` as a second safeguard. Define deduplication, retention and minimum reporting groups before segmentation |
| Logs/support | Errors and diagnostics | Restricted operational access | No financial payloads, receipt/email content, credentials, or query-string dumps; review hosting log retention |
| Backups | Hosting/database recovery | Restricted operational access, not an admin UI data browser | Verify restore, access, retention, and how deletion propagates through backup expiry |

This inventory records categories and field names, not actual records or secret values.

## Processing boundaries

- Supabase provides authentication/database processing; actual deployed access policies must be inspected rather than inferred from types.
- Gemini integration can receive receipt images, extracted OCR text, or allowlisted bank-message bodies. For receipt OCR, `GEMINI_PRIVATE_DATA_PROCESSING_APPROVED=true` and a separate per-upload opt-in are both required; OCR does not include member-specific category names. Gmail connect and sync are also disabled by the Gemini gate.
- PaddleOCR can receive receipt images when configured and explicitly allowed for that upload. It requires both `PADDLEOCR_URL` and `PADDLEOCR_PRIVATE_DATA_PROCESSING_APPROVED=true`; no category names are sent for OCR. Its hosting, access, and retention are not established by source.
- These gates default to off, but production environment state was not inspected; do not claim the deployed state is verified. Do not enable Gemini Free for personal financial data: Google's terms/pricing describe use of unpaid-service content to improve products and possible human review, and advise against submitting sensitive, confidential, or personal information. See [Gemini API terms](https://ai.google.dev/gemini-api/terms) and [pricing](https://ai.google.dev/gemini-api/docs/pricing).
- Tesseract runs on PlaENC's application servers; the image still reaches the hosting provider even when no external OCR provider is used. When provider gates are off or the member leaves the consent box unchecked, configured PaddleOCR and Gemini are skipped and Tesseract/text parsing remains available where extraction succeeds.
- Gmail access is optional; history responses are field-masked to message IDs, then the app reads only `From` headers before sender filtering. Message bodies are fetched and sent to Gemini only for allowlisted senders. The OAuth grant itself remains mailbox-wide `gmail.readonly`.
- Hosting logs, network failures, URL parameters, caches, and backups can carry data even when the UI hides it.

List the processors and purposes accurately before exposing integrations publicly. Provider terms/settings and applicable obligations require verification; this is not a compliance certification.

## Product questions before events

| Question | Minimum proposed signal | Excluded data |
|---|---|---|
| Do new members complete a first useful record? | Deduplicated setup/first-confirmed-entry event and cohort | Amount, account/category names, description |
| Do people return? | Defined active-user period and sufficiently grouped cohort | Individual transaction timelines or financial values |
| Does optional capture work? | Started/completed/failed outcome and sanitized duration/cost measures | Receipt image, OCR text, email body |
| Does the product fail operationally? | Sanitized error code, route/job class, timing | Secrets, financial payloads, user-entered descriptions |

No events are enabled merely by documenting them. Existing instrumented sources must be verified before metrics are displayed.

## Administrative visibility proposal

Allowed: aggregate registrations, activation, sufficiently grouped activity/retention, feature outcomes, latency/failure measures, and measurable operating costs.

Not included: per-user spending, balances, transaction drilldown, receipt/email browsing, integration-token viewing, user impersonation, or exports of another member's financial history.

Metric filters must not reveal a single person's activity through very small cohorts or differencing of overlapping groups. Agree on reporting granularity and minimum group sizes before implementation. A hidden identifier does not guarantee anonymity.

## P1/P7 acceptance evidence

- Synthetic A/B/admin/anonymous tests verify private reads/writes and foreign references.
- Role changes are trusted, reversible, and checked at every privileged request.
- Public previews, telemetry, logs, and support examples contain no personal financial content.
- Users can understand, disconnect, and request removal of optional-provider data through the implemented controls.
- Retention/deletion/export and backup schedules are specified, implemented, and tested.
- Administrative aggregate endpoints enforce the agreed reporting boundaries.
- Documentation accurately distinguishes source-level default-off gates from deployed environment state and approved providers.

Exact retention periods, support contact, provider policy settings, and reporting-group thresholds remain open. Resolve them before affected public features launch.
