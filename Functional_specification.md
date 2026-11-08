# Functional and Data Specification — Personal Finance PWA

> Living reference document for platform development. Applied migrations in
> `supabase/migrations/` are the definitive source for the database schema.
> This document describes the business rules and workflows that must be
> preserved when modifying the application.

---

## 1. Scope and stack

**Control de Gastos Personales** is a personal finance PWA. It currently serves
one user, but the entire model must preserve `user_id` isolation to support
multiple users in the future.

Current stack:

- Next.js 14 with App Router, React 18, and TypeScript.
- Tailwind CSS for the interface.
- Supabase PostgreSQL, Auth, and Row Level Security (RLS).
- Vercel for deployment and scheduled tasks.
- Gemini for assisted extraction and classification.
- Tesseract.js and optional PaddleOCR for OCR extraction.

Transaction input channels:

1. Manual entry.
2. OCR for receipts or invoices.
3. Gmail OAuth synchronization of bank notifications.
4. Historical migration from the original Google Sheet.

Automation must always be reviewable. No automated entry may affect financial
calculations before it has been confirmed.

---

## 2. Accounts and wallets

| Account | Initial wallets |
|---|---|
| Nequi | Market, Services, Other Expenses |
| Ualá | None |
| Bancolombia | None |
| DaviPlata | None |
| Cash | None |
| Dale | Defined by the active migrations |

- `accounts` contains one row per account and user.
- `wallets` are children of an account and also belong to a user.
- Every transaction requires `account_id`; `wallet_id` is optional.
- An account with wallets must not receive a direct yield configuration; yield
  must be configured per wallet.
- Ownership constraints must be validated in server actions as well as
  Supabase policies and triggers.

---

## 3. Categories

The current functional catalog contains:

`Market, Services, Subscriptions, Entertainment, Other, Stock Funds`

Each category belongs to a user. Historical categories `Dining Out`,
`Transportation`, and `Education` are remapped to `Other` during historical
migration.

Categorization combines:

1. Known rules from `categorization_rules`.
2. Gemini for descriptions without an applicable rule.
3. Human review before confirming an automated transaction.

Users may create or adjust rules. Rules must preserve usage information
(`times_used`, `last_used_at`) whenever those fields exist in the schema.

---

## 4. Transactions and lifecycle

### 4.1 Types and sources

Supported types:

`Income`, `Expense`, `Transfer`, `Savings`, `Investment`

Sources:

`manual`, `ocr`, `email_webhook`, `migration`

A `Savings` transaction must specify `savings_operation`:

- `ingreso`: money entering savings.
- `retiro`: money leaving or being withdrawn from savings.

For other types, `savings_operation` must be `null`.

### 4.2 Statuses

Functional statuses:

- `pendiente_revision`: automated entry that needs validation.
- `confirmada`: valid entry that may affect calculations.
- `duplicado`: possible duplicate awaiting a decision.
- `descartada`: entry the user chose to exclude.

| Channel | Initial status | Affects calculations? |
|---|---|---|
| Manual | `confirmada` | Yes |
| Historical migration | `confirmada` | Yes |
| OCR | `pendiente_revision` | No |
| Gmail | `pendiente_revision` | No |
| Gmail with repeated reference | `duplicado` | No |

Only `confirmada` transactions participate in dashboards, budgets, balances,
and summaries. A `descartada` or `duplicado` transaction must never be silently
included in those calculations.

### 4.3 Relevant fields

- `occurred_at`: date when the movement occurred; confirmation must validate it.
- `external_reference`: provider identifier used to detect duplicates.
- `submission_id`: idempotency identifier that prevents duplicate form
  submissions.
- `raw_data`: raw and structured extraction data. Receipt images are not stored
  as part of the transaction.
- `ai_confidence`: extraction/classification confidence when available; the
  queue may sort lower-confidence results first.
- `is_necessary`: optional indicator of whether the expense was necessary.

Mutations must go through `lib/actions/transactions.ts`,
`lib/actions/ocr.ts`, and `lib/actions/review.ts`, according to the workflow.

---

## 5. Receipt OCR

The OCR workflow is:

```text
Image
  ↓
Session, type, and size validation (maximum 10 MB)
  ↓
Preprocessing
  ↓
Configured PaddleOCR or Tesseract.js
  ↓
Text parsing and/or Gemini Vision
  ↓
Structured classification and extraction
  ↓
Transaction pending review
```

The system attempts to use the available time efficiently and stores the
engine used and extraction errors in `raw_data` when applicable. Gemini may use
OCR text as its primary source and correct obvious errors.

The image must not be persisted as an unnecessary secret or financial record.
The resulting transaction must always be editable before confirmation.

---

## 6. Gmail and bank notifications

### 6.1 Monitored addresses

`email_sources` maps senders to accounts:

- `user_id`
- `account_id`
- `email_address`
- `is_active`
- `created_at`, `updated_at`

An account may have several addresses. Logical uniqueness is
`(user_id, email_address)`.

### 6.2 OAuth connection

`gmail_connections` represents one Gmail connection per user and includes
synchronization state such as `gmail_history_id`, tokens, and expiration dates.

- The `refresh_token` and OAuth credentials are server-only.
- Tokens are never exposed to the client.
- Incremental synchronization uses Gmail history when available.
- The email Message-ID may be used as `external_reference`.

The synchronization workflow is:

```text
Gmail OAuth
  ↓
New history/messages
  ↓
Filter by active senders
  ↓
Transaction extraction
  ↓
Duplicate detection
  ↓
pendiente_revision or duplicado
```

The scheduled `/api/gmail/sync` task runs daily through Vercel.

---

## 7. Budgets and rollover

### 7.1 Category budget

`category_budgets` defines an amount per category and month. Spending and
available balance are calculated from `confirmada` transactions; they must not
be treated as independent manually stored balances.

Relevant fields:

- `amount`
- `rollover_amount`
- `alert_threshold_percent`
- `period_month`

### 7.2 Wallet budget

`wallet_budgets` separates:

- `assigned_amount`: manual allocation for the month.
- `rollover_amount`: amount carried over from the previous month.
- `total_budget`: calculated available amount.
- `alert_threshold_percent`.

Spending is calculated from `confirmada` `Gasto` transactions associated with
the wallet.

### 7.3 Rollover process

The `/api/cron/rollover` job runs on the first day of each month. It calculates
the previous period's leftover, including movements and yield when applicable,
and writes it to the current period.

- It does not create artificial transactions.
- It keeps assigned and carried-over amounts separate.
- It is idempotent: running it twice must not duplicate leftover amounts.
- Reviews are created only for amounts greater than zero; zero leftovers do not
  appear in the review queue.
- Every budgeted destination is processed, including accounts without wallets
  such as Cash or Dale and every active wallet.
- Confirmed savings movements are included: savings income increases the
  leftover and savings withdrawals reduce it.
- Each category's leftover is calculated from its budget and confirmed
  movements from the previous month, including savings movements; it does not
  depend on a single expense being associated with the account.
- Category and wallet rollovers are recorded in
  `budget_rollover_reviews`.
- The category is identified from confirmed movements for the destination; the
  leftover still belongs to the account or wallet and is assigned from that
  review.
- The review queue allows pending rollovers to be assigned and existing
  rollovers to be reviewed.

---

## 8. Account and wallet yield

The `yield_configs` and `yield_rates` tables configure yield for an account
without wallets or for a specific wallet.

Rules:

- A configuration points to an account or a wallet, never both.
- An account with wallets must configure yield on its wallets.
- `start_date` defines when the configuration becomes effective.
- `ea_percent` is an effective annual rate between 0 and 100.
- Rates are versioned by `valid_from`.
- The active rate is used to calculate daily yield.

Shared calculation logic lives in `lib/yield-calculation.ts`. Yield is included
in the dashboard and rollover calculation, but must not be converted into a
fictional ledger transaction.

---

## 9. Shopping lists and price history

The `/mercado` module includes:

- `stores`: user-owned stores.
- `shopping_lists`: active or completed lists.
- `shopping_list_items`: products, quantities, units, estimated prices, and
  actual prices.
- `price_history`: observed price history by product, unit, and store.

When a list is completed, checked items with an actual price may create history
records. Reopening a list removes history records created exclusively by that
list.

Operations must use `lib/actions/shopping-lists.ts` and respect ownership
validation for the list, item, and store. Suggestions use only the latest own
observed actual price for the exact normalized product, unit, and store; they
remain editable and never use external price APIs. Real checked totals are the
primary summary and estimates are secondary.

Lists support name/status/store search and date semantics: active lists use
`created_at`, completed lists use `completed_at`. Frequent-product suggestions
come only from completed-list items. Price memory displays product/store/unit
trends against the previous observation.

A purchase handoff creates durable `shopping_purchase_drafts` and line records
from checked items that have actual prices, including items from multiple lists.
The atomic confirmation function rechecks ownership, checked state, and actual
prices before writing one confirmed expense transaction. It never completes a
list automatically; estimates and unpriced lines are excluded from financial
amounts.

---

## 10. Multi-user support and security

Financial entities and auxiliary modules must be linked to `user_id` and
protected with RLS. A user must never be able to read or modify another user's
data.

Mandatory rules:

- Validate authentication in every route handler and server action.
- Use the server client for protected operations.
- Use `SUPABASE_SERVICE_ROLE_KEY` only on the backend, never in client
  components.
- Never expose `refresh_token`, OAuth keys, `GEMINI_API_KEY`, or cron secrets.
- Add migrations for schema changes; do not edit production data from a page.
- Verify RLS policies and cross-ownership checks when relating accounts,
  wallets, lists, budgets, and transactions.

---

## 11. Environment variables

Variables used by the application:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
PADDLEOCR_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
NEXT_PUBLIC_SITE_URL
CRON_SECRET
```

`PADDLEOCR_URL` is optional when Tesseract.js is used as the fallback.
`.env.local` must not be committed or copied into shared documentation or
snapshots.

---

## 12. Development conventions

- Protected pages: `app/(dashboard)/`.
- Reusable components: `components/`.
- Server actions and integrations: `lib/`.
- Migrations: `supabase/migrations/`.
- Generated Supabase types: `src/types/database.types.ts`.
- Browser Supabase client: `lib/supabase/client.ts`.
- Server Supabase client: `lib/supabase/server.ts`.
- Session middleware: `middleware.ts` and `lib/supabase/middleware.ts`.

Keep interface text in Spanish, reuse existing Tailwind patterns, and avoid
duplicating domain logic in pages.

---

## 13. Validation before integrating changes

Run at minimum:

```bash
npm run typecheck
npm run lint
npm run build
```

For calculation changes, also run existing tests, including
`lib/yield-calculation.test.ts`.

Every user-visible change must be reflected in [`readme.md`](./readme.md).
Every schema or business-rule change must update this specification and add the
corresponding migration.
