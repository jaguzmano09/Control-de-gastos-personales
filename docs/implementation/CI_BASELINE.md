# CI and lint baseline

Status: Local checks passed; first GitHub Actions run not yet observed.
Business date: 2026-11-11 (America/Bogota).
Scope: P1.6 reproducible checks and dependency inventory.

The repository now includes a checked-in Next.js/TypeScript ESLint configuration,
explicit lint dependencies, unit and foundation verification scripts, and a
read-only GitHub Actions workflow for pull requests and pushes to main. CI uses
Node 24 and placeholder public Supabase configuration; it receives no production
secret or service-role key. The foundation script tests rejected requests only.

Initial lint errors were corrected by using Next.js Link for internal navigation,
escaping JSX quotation marks, and replacing explicit any types in Gmail message
parsing and Supabase cookie callbacks. No financial calculation or authorization
behavior was changed.

| Local check | Result |
|---|---|
| Lint | Passed with six existing warnings |
| Typecheck | Passed |
| Unit tests | 6/6 passed |
| Production build | Passed with placeholder public values, 27 pages |
| Foundation HTTP | 19/19 passed |
| Production dependency audit | Zero vulnerabilities reported by npm audit --omit=dev |
| Full dependency audit | Seven moderate advisories in development tooling |

The remaining development advisories involve minimatch through TypeScript ESLint
packages and postcss-selector-parser. Review and update these dependencies in a
scoped follow-up. Do not run an unreviewed blanket upgrade. Lint warnings concern
unused variables and one unused expression; the latter deserves review for
possible intended behavior. The workflow itself still needs remote execution
evidence before P1.6 can be marked complete.

The initial foundation delivery record remains historical; its lint limitation
describes the state at that time. Current check status is tracked here.
