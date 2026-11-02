# OWASP Project Review

This checklist adapts OWASP and API Security review practices to the local
stack. It is a defensive analysis guide, not authorization to test external
systems.

## Project-specific context

Always review:

- `app/api/**`, `middleware.ts`, and `lib/actions/**`.
- `lib/supabase/client.ts` and `lib/supabase/server.ts`.
- `supabase/migrations/**`, especially RLS policies and SQL functions.
- `review.ts`, Gmail OAuth, OCR, Gemini, and cron flows.
- Private variables: `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets,
  `GEMINI_API_KEY`, and `CRON_SECRET`.

## Checklist

### Identity and access

- Every endpoint and server action validates the server-side session.
- Queries filter by the authenticated user or rely on verifiable RLS.
- `account_id`, `wallet_id`, `category_id`, `transaction_id`, and other IDs are
  validated as belonging to the same `user_id`.
- The service-role client is not used in client code or to bypass controls.
- Cron and webhook routes require a secret or signature and do not trust only a
  client-controlled header.
- OAuth validates `state`, redirect URI, expiration, and user association.

### Inputs and outputs

- Schemas validate type, length, ranges, enumerations, and payload size.
- Supabase queries do not interpolate SQL or build unsafe filters.
- OCR, Gmail, and Gemini data is treated as untrusted.
- Text displayed in the UI is escaped for its context; raw HTML is not used
  without sanitization.
- External URLs use an allowlist, permitted protocols, and redirect limits to
  prevent SSRF.
- Responses do not include tokens, secrets, traces, other users' data, or
  unnecessary internal fields.

### Financial logic

- Only `confirmada` affects balances, dashboards, and budgets.
- Automated entries remain reviewable and are not confirmed by default.
- Confirmation and dismissal go through `lib/actions/review.ts`.
- Transfers, savings, duplicates, rollover, and invalid states cannot create
  phantom balances or transactions.
- Review replay, duplication, concurrency, monetary limits, and account/wallet
  consistency.

### Configuration and dependencies

- Secrets are absent from code, logs, responses, commits, and documentation.
- Cookies have appropriate `HttpOnly`, `Secure`, `SameSite`, and scope settings.
- Production errors do not reveal internals; logs do not contain unnecessary
  PII.
- CORS, headers, HTTP methods, and caching do not allow improper cross-origin
  access.
- Review `package.json` and the lockfile with the available package manager
  without applying unrequested updates.

## Severity criteria

- **CRITICAL:** likely compromise of accounts, secrets, or multiple users' data,
  or remote execution with broad impact.
- **HIGH:** unauthorized access to sensitive data/actions, RLS bypass,
  compromisable OAuth, or injection with material impact.
- **MEDIUM:** limited exposure, incomplete controls, or exploitation requiring
  meaningful preconditions.
- **LOW:** defense in depth, minor information exposure, or observability
  improvement.

## Output format

```text
## [SEVERITY] Title
- File: path:line
- Confidence: n/10
- Evidence: concrete behavior observed
- Impact: what an authorized tester could achieve
- Fix: minimal recommended change
- Validation: safe test that would demonstrate the fix
```

## Limitations

Document areas that require deployment configuration, synthetic credentials, or
integration tests. Never infer production behavior from static code alone when
runtime configuration is unavailable.

## Source and adaptation

The procedure structure was inspired by the
[OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
and its API security, access-control, and serverless guidance. The content is
condensed and adapted to this repository.
