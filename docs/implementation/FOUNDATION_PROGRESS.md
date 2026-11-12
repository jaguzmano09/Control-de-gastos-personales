# First foundation delivery

Status: Local implementation verified; not deployed by this document.
Business date: 2026-11-11 (America/Bogota).
Scope: P1.7 missing-secret guard and P1.8 public asset routing, advanced while P0 decisions are documented.

## Changes

- lib/supabase/middleware.ts now bypasses session/database work only for the exact public paths /manifest.webmanifest, /sw.js, and /offline.html.
- Existing cookie refresh, public information pages, private routes, and document acceptance behavior are preserved outside that exact allowlist.
- app/api/gmail/sync/route.ts rejects missing CRON_SECRET before authorization comparison or privileged client creation, matching rollover behavior.
- A missing secret returns 500; invalid/missing authorization with a configured secret returns 401.
- scripts/verify-foundation.cjs verifies the production build through actual HTTP responses with synthetic cron configuration and no service-role write key.
- No successful authorized cron request is sent. No remote data/schema/role change is part of verification.

## Evidence

| Check | Result |
|---|---|
| TypeScript | Passed |
| Production build | Passed, Next.js 15.5.28 |
| Existing yield tests | 6/6 passed |
| Foundation HTTP scenarios | 19/19 passed; foundation-verification.json |
| Lint | Incomplete: existing interactive ESLint setup prompt; P1.6 remains open |
| Owned server cleanup | Both verification servers exited |

HTTP checks cover GET and HEAD response status/type and GET contents for each public asset; unauthorized private/admin and asset-prefix paths; missing-secret rejection for both crons; invalid authorization with a synthetic configured secret.

The script uses temporary local ports, a readiness check, bounded request timeouts, and finally-block server cleanup.

## Roadmap and finding status

- P1.8: verified for its scoped asset-access/routing criteria.
- P1.7: missing-secret behavior implemented and verified; broader privileged-error review remains open.
- F06: local missing-secret issue corrected; production configuration and deployed behavior are not independently verified.
- F13: local unauthenticated asset redirect corrected; complete installation/update/offline/sign-out lifecycle remains P7.7.
- P1 as a whole remains in progress; baseline, isolation, CI, role provisioning, and privacy threat-model gates are not complete.

Historical assessment files remain unchanged so the original findings stay traceable. This document records remediation status instead of rewriting past evidence.

## Documentation and sources

The functional specification and README describe the new behavior and reproducible checks. Next.js documents middleware early continuation in its [version 15 reference](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware). Scheduled endpoint authentication is described in [Vercel's cron management documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

No financial calculation semantics, visual identity, or administrative privileges changed in this delivery.
