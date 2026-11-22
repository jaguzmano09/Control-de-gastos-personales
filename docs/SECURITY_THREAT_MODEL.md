# Security Threat Model

Status: source and hosted-configuration review, 2026-11-11. This is an engineering assessment, not a penetration-test certification. Findings distinguish controls verified in source/hosted metadata from work that needs an isolated environment.

Follow-up 2026-11-19: a bounded scan of patches reachable from all local Git refs (446 commits; package-lock.json excluded) found no matches for Google API key, GitHub token, Supabase `sb_secret_`, or PEM private-key signatures. A filename search found no tracked `.env`, `.pem`, `.key`, `.p12`, or `.pfx` files in those refs. This does not cover every credential format, binary content, excluded files, or remote-only refs, and does not establish that all credentials are safe. Docker's daemon was unavailable; authenticated isolated testing remains open. CAPTCHA was configured by the owner and subsequently checked in the deployed login flow, as recorded below.

Follow-up 2026-11-20: the owner confirmed CAPTCHA operation and automatic challenge refresh. Supabase Security Advisor identified twelve public functions with mutable `search_path`; migration `20261120034701_harden_public_function_search_paths` set an empty path on each, and a live catalog query verified all twelve settings. The warning is no longer present in the follow-up advisor result. Two no-policy RLS findings are intentional: direct table access is withheld for `ocr_rate_limits` and `product_events`. Four authenticated `SECURITY DEFINER` RPC warnings remain; each requires continued function-level authorization review and is not treated as an automatic defect. Supabase also reports leaked-password protection disabled. Its current documentation limits that feature to Pro and above, which conflicts with the owner's free-only constraint; do not upgrade the project for it. CAPTCHA and Supabase Auth rate limits are compensating controls, but the project's exact rate-limit settings have not been inspected. The empty-search-path migration was applied to production; no transaction records were read or changed by this migration.

The login and registration form renders a Turnstile widget using `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and passes its token to Supabase Auth. The owner configured the secret in Supabase Auth; the production widget was observed on the login page and a direct password login request without a token returned HTTP 400 with `captcha_failed`. The owner confirmed a successful login and automatic challenge refresh. Registration and server-side rejection of an expired token remain unverified end to end.

## Assets and trust boundaries

| Asset | Trust boundary | Main concern |
|---|---|---|
| Transactions, budgets, account names, purchase history | Browser/server actions to Supabase RLS | Cross-user reads, writes, or foreign-key substitution |
| Receipt images, OCR text, derived descriptions | User device to app server and configured OCR/AI providers | Personal/financial content sent to third parties or retained longer than needed |
| Gmail OAuth tokens and message content | Google OAuth to service-role sync and Gemini | Token exposure, broad mailbox access, message-body transmission |
| Admin role and product telemetry | Auth identity to profile policy and aggregate RPC | Self-promotion or alternate access to individual activity/finances |
| Service-role credential and cron secret | Vercel environment to privileged routes | Complete RLS bypass or unauthorized global operations |
| Sessions and browser cache | Supabase cookies, Next.js responses, service worker | Session theft or private content surviving logout/offline use |

## Verified controls and changes

- Session identity is checked with Supabase Auth; financial reads/writes use the session client and depend on RLS. Global cron and Gmail sync use the service-role key and apply explicit user filters where processing user data.
- Duplicate review now verifies the authenticated member, requires an unresolved duplicate owned by that member, and verifies any matched confirmed transaction belongs to the same member. Hosted policy metadata confirms owner predicates on `transactions` and `duplicate_review_log`; cross-user runtime testing with synthetic accounts remains open.
- Gmail token table grants expose only status columns to authenticated users; the access and refresh token columns are excluded. The Gmail sync response is aggregated and does not include per-user identifiers or provider error details.
- Gmail history requests are field-masked to message IDs only. Sync fetches only the `From` header for candidate messages and downloads a full body only after an exact normalized match against that member's sender allowlist.
- Cron routes fail closed when `CRON_SECRET` is missing, compare bearer credentials with a timing-safe helper, and return generic failure responses. Rollover success returns counts, not account IDs or financial amounts.
- Admin page and database RPC both check the server-managed role. The RPC runs as `SECURITY DEFINER` with an empty `search_path`; hosted metadata confirms authenticated execute, no anon execute, and profile RLS enabled. It reads product events only, not financial tables.
- Gemini API keys are sent in the `x-goog-api-key` header rather than the URL query, following Google's REST authentication guidance. This keeps the key out of URL-based request logs. [Gemini API reference](https://ai.google.dev/api)
- Source-level privacy gates now block Gemini private-data requests unless `GEMINI_PRIVATE_DATA_PROCESSING_APPROVED=true`; Gmail connect and sync are disabled by the same gate. Configured PaddleOCR is skipped unless `PADDLEOCR_PRIVATE_DATA_PROCESSING_APPROVED=true` and an endpoint exists. Both gates default to off. Production environment values were not inspected, so this is not evidence of deployed configuration.
- New OCR transactions persist only the extraction engine in `raw_data`; raw OCR text, duplicate extracted fields, and provider diagnostics are no longer retained. Five historical OCR rows were scrubbed using the idempotent migration in `20261112020000_minimize_historical_ocr_raw_data.sql`; an aggregate query confirmed zero matching rows remain in the live table. Transaction columns were preserved.
- OCR now caps files at 4 MB and decoded images at 20 megapixels, creates an idempotent pending transaction before processing, and leaves that draft available if processing times out. External receipt processing requires per-upload member consent plus the existing server-side provider gate; member-defined categories are not sent to OCR providers. These are source-level controls; production provider flags and provider retention are not verified.
- The service worker caches only `/offline.html`; navigations are fetched from the network and use that static offline page only after failure. No transaction pages or financial API responses are intentionally cached by the worker.

## Open risks before public launch

### Private support channel

- `support_requests` is RLS-enabled with no policies and no direct table privileges for `anon` or `authenticated`; access is function-only. Four `SECURITY DEFINER` functions use an empty `search_path`, revoke execution from `PUBLIC`/`anon`, and grant authenticated execution only. Submission binds `user_id` to `auth.uid()` and enforces five requests per account per rolling 24 hours. Member history filters by `auth.uid()`; inbox and replies check the current profile's trusted `admin` role in the database. Admin replies validate request status, response length, and request ID. Catalog checks confirmed these properties after deployment.
- The form requires sign-in, labels GitHub as public, and cautions against including financial account details. The admin inbox exposes only messages intentionally submitted to support; it is not a financial-data access path.
- Remaining evidence: verify owner A, owner B, and admin browser flows, role revocation, and response isolation in a synthetic environment. No such multi-user test project is available on the free plan yet. Support data is explicitly purged during self-service account deletion; backup expiry/restore remains undefined.

### Personal data export

- `/api/privacy/export` uses the cookie-authenticated Supabase client, explicit per-member filters, RLS, and owner-checked RPCs for product events and support messages. It does not use the service-role client. Purchase-draft lines are additionally restricted to IDs returned from the member's own draft, list, and item queries.
- Gmail export selects only `is_active`; current column grants block access to OAuth tokens. The JSON download returns `private, no-store`, `noindex`, `nosniff`, CSP sandbox, and no-referrer headers. It excludes token values and internal abuse counters.
- Data is read independently per table, not in one database snapshot. Export completeness, simultaneous-update behavior, rate/resource limits, and two-account isolation still need synthetic verification. The route intentionally returns a generic error rather than a partial export if any required read fails.
- Account deletion now explicitly purges event rows and orders transactional deletes before dependent financial records. It revokes the saved Google OAuth grant before deleting credentials, and advisory-lock triggers prevent an OAuth callback from restoring Gmail credentials during deletion. Auth closure is retryable after the data purge. Provider backup expiry is still unverified, and the end-to-end flow has not been run against synthetic accounts.

| Priority | Risk | Required work |
|---|---|---|
| Critical | Hosted migration history is empty while production contains schema and manual privacy corrections. A baseline or replay can drift or alter access unexpectedly. | Reconcile a schema-only baseline and migration ledger in a separate project first; never replay historical data migrations against the current project without a reviewed plan. |
| High | Backups may retain OCR text removed from current transaction rows, and the migration ledger is still unreconciled. | Verify backup expiry/restore handling for removed payloads and reconcile the cleanup migration with the hosted ledger under the P1.2 baseline plan. |
| High | Approved OCR/Gemini/PaddleOCR services can receive receipt images or OCR text only after explicit per-upload consent and server-side gates. Provider ownership, retention/region controls, and production flag state remain unverified. Gemini Free terms conflict with sensitive personal financial processing. | Keep gates off unless the provider has been reviewed. Never enable Gemini Free for personal financial data. Verify provider configuration and terms before launch; current privacy notice describes the per-upload choice. |
| High | Gmail still requests the broad `gmail.readonly` OAuth scope. The application now reads only message IDs and sender headers before filtering, and downloads bodies only for allowlisted senders, but the OAuth grant itself still permits mailbox-wide read access. | Review whether narrower Google scopes meet the sync design; document mailbox access and provide disconnect/revocation with token cleanup before public beta. |
| High | No non-production Supabase project with synthetic user A/B/admin exists in this workspace. | Provision an isolated project and verify ownership across tables, RPCs, foreign references, admin, anonymous, and service-role paths before launch. |
| Medium | Product-event metrics can return exact counts for one-person cohorts, which can reveal that an individual used an integration. | Set and enforce a minimum cohort size and resistant reporting windows before adding segmentation; do not describe identified event rows as anonymous. |
| Medium | OCR has a persistent per-user limit of 10 processing attempts per hour shared by the API and form. The database counter denies direct client access; prior rollback checks verified the eleventh request is rejected and an expired window resets. | Verify concurrent and multiuser behavior in isolation; add provider-wide abuse controls and budgets before enabling OCR broadly. |
| Medium | Export and self-service deletion are implemented but not verified for multi-user isolation; provider backups may retain data under an unknown schedule. | Verify export/deletion with synthetic users and confirm backup expiry/restore behavior before public release. |
| Medium | No explicit application-wide `Cache-Control: private, no-store` policy was found in source; authenticated pages use request cookies and the service worker does not cache them, but deployed CDN behavior remains unverified. | Verify preview/production response headers and CDN cache behavior for authenticated HTML, route handlers, and redirects. |
| Low | `next lint` is deprecated and emits existing lint warnings. | Move to the ESLint CLI before adopting Next.js 16; resolve the five existing warnings. |

## Deferred scope

This review did not test production user journeys, OCR accuracy/correction rates, provider retention settings, backups, CDN behavior, or cross-user access with synthetic accounts. P1.3/P1.4 and release operations must close the applicable gaps before public access.
