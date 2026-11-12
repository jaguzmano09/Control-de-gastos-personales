# Security Threat Model

Status: source and hosted-configuration review, 2026-11-11. This is an engineering assessment, not a penetration-test certification. Findings distinguish controls verified in source/hosted metadata from work that needs an isolated environment.

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
- Gmail token table grants expose only status columns to authenticated users; the access and refresh token columns are excluded. The Gmail sync response is aggregated and does not include per-user identifiers or provider error details.
- Cron routes fail closed when `CRON_SECRET` is missing, compare bearer credentials with a timing-safe helper, and return generic failure responses. Rollover success returns counts, not account IDs or financial amounts.
- Admin page and database RPC both check the server-managed role. The RPC runs as `SECURITY DEFINER` with an empty `search_path`; hosted metadata confirms authenticated execute, no anon execute, and profile RLS enabled. It reads product events only, not financial tables.
- Gemini API keys are sent in the `x-goog-api-key` header rather than the URL query, following Google's REST authentication guidance. This keeps the key out of URL-based request logs. [Gemini API reference](https://ai.google.dev/api)
- New OCR transactions persist only the extraction engine in `raw_data`; raw OCR text, duplicate extracted fields, and provider diagnostics are no longer retained. Five historical OCR rows were scrubbed using the idempotent migration in `20261112020000_minimize_historical_ocr_raw_data.sql`; an aggregate query confirmed zero matching rows remain in the live table. Transaction columns were preserved.
- The service worker caches only `/offline.html`; navigations are fetched from the network and use that static offline page only after failure. No transaction pages or financial API responses are intentionally cached by the worker.

## Open risks before public launch

| Priority | Risk | Required work |
|---|---|---|
| Critical | Hosted migration history is empty while production contains schema and manual privacy corrections. A baseline or replay can drift or alter access unexpectedly. | Reconcile a schema-only baseline and migration ledger in a separate project first; never replay historical data migrations against the current project without a reviewed plan. |
| High | Backups may retain OCR text removed from current transaction rows, and the migration ledger is still unreconciled. | Verify backup expiry/restore handling for removed payloads and reconcile the cleanup migration with the hosted ledger under the P1.2 baseline plan. |
| High | OCR/Gemini and optional PaddleOCR can receive receipts, extracted text, or email bodies. PaddleOCR endpoint ownership, provider retention/region controls, and the exact user disclosure are not verified. | Verify provider configuration and terms; disclose each transfer, provide an understandable opt-out, and avoid enabling providers until reviewed. |
| High | Gmail requests the `gmail.readonly` OAuth scope even though allowed-sender matching narrows messages processed only after authorization. | Review whether narrower Google scopes meet the sync design; document mailbox access and provide disconnect/revocation with token cleanup before public beta. |
| High | No non-production Supabase project with synthetic user A/B/admin exists in this workspace. | Provision an isolated project and verify ownership across tables, RPCs, foreign references, admin, anonymous, and service-role paths before launch. |
| Medium | Product-event metrics can return exact counts for one-person cohorts, which can reveal that an individual used an integration. | Set and enforce a minimum cohort size and resistant reporting windows before adding segmentation; do not describe identified event rows as anonymous. |
| Medium | OCR request size is capped, but no per-user/IP/provider rate limit or cost ceiling is implemented. | Add abuse controls and provider budgets before enabling OCR broadly. |
| Medium | No self-service export/deletion lifecycle or rehearsed backup restore is implemented. | Define and test user export/deletion, provider-token revocation, and backup expiry/restore behavior. |
| Medium | No explicit application-wide `Cache-Control: private, no-store` policy was found in source; authenticated pages use request cookies and the service worker does not cache them, but deployed CDN behavior remains unverified. | Verify preview/production response headers and CDN cache behavior for authenticated HTML, route handlers, and redirects. |
| Low | `next lint` is deprecated and emits existing lint warnings. | Move to the ESLint CLI before adopting Next.js 16; resolve the five existing warnings. |

## Deferred scope

This review did not test production user journeys, upload abuse/rate limits, OAuth consent screens, provider retention settings, backups, CDN behavior, or cross-user access with multiple real accounts. The earlier deferral of OCR rate limiting remains visible above. P1.3/P1.4 and release operations must close the applicable gaps before public access.
