# Project context for agents

## Purpose

**Control de Gastos Personales** is a personal finance PWA for recording income,
expenses, transfers, savings, and investments. The application currently targets
one user, but the data model and RLS policies must preserve complete isolation
by `user_id` to support multiple users in the future.

The detailed functional specification is in
[`Functional_specification.md`](../Functional_specification.md). Read it before
changing the data model, transaction states, or budget workflows.

## Stack and structure

- Next.js 14 with App Router, React 18, and TypeScript.
- Tailwind CSS for the interface.
- Supabase for PostgreSQL, authentication, and Row Level Security.
- Vercel for deployment and cron jobs.
- Gemini for assisted extraction and classification.
- Tesseract.js and an optional PaddleOCR service for OCR.
- The UI lives in `app/` and reusable components live in `components/`.
- Server actions and adapters live in `lib/`.
- Migrations live in `supabase/migrations/`.
- Generated Supabase definitions live in `src/types/database.types.ts`; do not
  edit this file manually when the change should come from the schema.

## Important functional workflows

- Only transactions with `confirmada` status may affect balances, dashboards,
  and budgets.
- OCR and Gmail entries normally arrive with `pendiente_revision` status.
- Duplicates remain with `duplicado` status for review; a discarded entry uses
  `descartada`.
- Confirmation and dismissal go through `lib/actions/review.ts`; do not add
  direct updates that bypass the existing validations.
- Category and wallet budgets are calculated monthly. Wallet budgets separate
  `assigned_amount` from `rollover_amount`.
- Rollover is reviewed from the review queue and must not create phantom
  transactions.
- Yield is calculated with the logic in `lib/yield-calculation.ts` and the
  `yield_configs`/`yield_rates` settings.
- Email integration uses Gmail OAuth. Refresh tokens and private keys may only
  be used on the server.

## Implementation conventions

- Use the existing Supabase clients: `lib/supabase/client.ts` for client code
  and `lib/supabase/server.ts` for server code.
- Protected pages live under `app/(dashboard)/`; middleware maintains the
  session.
- Data-changing operations must reuse server actions from `lib/actions/`,
  validate the session, and revalidate affected routes.
- Keep interface messages and labels in Spanish while following the existing
  Tailwind visual patterns.
- For database changes, create a new migration, update generated types when
  applicable, and verify RLS policies.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets, or `GEMINI_API_KEY`
  to the client. Never include `.env.local` values in commits or documentation.

## Environment variables

The application uses these variables:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PADDLEOCR_URL`,
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REDIRECT_URI`, `NEXT_PUBLIC_SITE_URL`, and `CRON_SECRET`.

Use `.env.local` for development. Private variables must also be configured in
Vercel for deployment.

## Validation

After code changes, run at minimum:

```bash
npm run typecheck
npm run lint
npm run build
```

For calculation changes, also prioritize existing tests such as
`lib/yield-calculation.test.ts`. Do not run destructive migrations or change
real data without explicit confirmation.

## Documentation

When adding a user-visible capability, update `readme.md`. When changing
functional, security, schema, or business-flow decisions, update
`Functional_specification.md` or link the relevant specific documentation.
