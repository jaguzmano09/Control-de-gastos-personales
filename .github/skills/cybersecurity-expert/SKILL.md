---
name: cybersecurity-expert
description: "Audit and harden Next.js/TypeScript applications with an OWASP focus covering API security, access control, Supabase/RLS, OAuth, secrets, SSRF, injection, validation, and dependencies. Use when the user requests a security audit, vulnerability review, threat model, hardening, or project security review. Only for authorized analysis and testing; do not use for intrusion, evasion, or unauthorized access."
argument-hint: "[file, module, endpoint, or audit scope]"
user-invocable: true
---

# Cybersecurity expert

## Objective

Perform reproducible and defensive security reviews, prioritizing exploitable
vulnerabilities, `user_id` isolation, and secret protection. The output must
distinguish verified facts, hypotheses, and review limitations.

## When to use

- Audits of files, API routes, server actions, migrations, or integrations.
- OWASP Top 10 and OWASP API Security Top 10 reviews.
- Evaluation of RLS, authentication, horizontal/vertical authorization, and
  multi-user behavior.
- Threat modeling for OCR, Gmail OAuth, cron jobs, Gemini, and Supabase flows.
- Hardening before deployment and dependency or configuration reviews.

## Security boundaries

1. Work only on this repository, local environments, or explicitly authorized
   targets.
2. Do not request, print, copy, or test real credentials, refresh tokens,
   private keys, `.env.local` values, or financial data.
3. Do not perform active exploitation, brute force, evasion, persistence,
   exfiltration, or destructive testing. Prefer static inspection and controlled
   local tests.
4. If essential context is missing, state the limitation or request synthetic
   data; do not invent results.

## Audit procedure

### 1. Define scope and context

- Identify included files, routes, flows, and changes.
- Read [`Functional_specification.md`](../../../Functional_specification.md) and
  repository instructions before evaluating business rules.
- Map user-controlled inputs, trust boundaries, sensitive data, secrets, actors,
  and outputs.
- Review history or the diff when the user requests a change review.

### 2. Map the attack surface

- Enumerate routes in `app/api/`, server actions in `lib/actions/`, middleware,
  Supabase clients, migrations, and external adapters.
- Follow authentication and authorization end to end through each data query or
  mutation.
- Identify calls to Gmail, Gemini, OCR, cron, and URLs derived from input.

### 3. Apply controls

Use the detailed checklist in
[`OWASP-Security-Review.md`](./references/OWASP-Security-Review.md). At minimum:

 - **A01 Broken Access Control:** server-side session validation, `user_id`
  ownership, enabled and consistent RLS, and no IDOR or bypass through
  parameters, alternate methods, or the service role.
 - **A02 Cryptographic Failures:** secrets only on the server, secure cookies,
  tokens absent from logs/responses, and secure transport.
 - **A03 Injection:** input validation, parameterized queries, and prevention of
  XSS, SSRF, command injection, and prompt injection in integrations.
 - **A04 Insecure Design:** transaction states, human review of automated
  entries, business limits, and replay or duplicate protection.
 - **A05 Security Misconfiguration:** headers, CORS, errors, debug settings,
  cron secrets, internal routes, and deployment configuration.
 - **A06 Vulnerable Components:** `package.json`, lockfile, and safe dependency
  usage; do not update packages automatically during an audit.
 - **A07 Identification and Authentication Failures:** middleware, OAuth
  callbacks, expiration, CSRF/state, and client/server separation.
 - **A08 Software and Data Integrity:** webhook validation, signatures, external
  sources, migrations, and pipelines.
 - **A09 Logging and Monitoring:** useful events without secrets or excessive
  PII, and observable errors without revealing internals.
 - **A10 SSRF:** URL allowlists and validation for OCR, Gmail, images, and any
  fetch whose destination can be influenced externally.

### 4. Verify evidence

- Cite the exact file and lines for every finding.
- Confirm each potential vulnerability by following its callers, types,
  policies, and tests; do not flag isolated patterns without proving impact.
- Run only safe and focused validation. For code changes, run at minimum
  `npm run typecheck`, `npm run lint`, and `npm run build`.
- Do not modify code during an audit unless the user asks to fix findings.

### 5. Report

Order findings by severity and impact: CRITICAL, HIGH, MEDIUM, LOW. Include:

1. Title and severity.
2. File and lines.
3. Verifiable evidence and affected flow.
4. Impact and preconditions.
5. Confidence from 1 to 10.
6. Minimal fix and recommended tests.

Separate confirmed findings from observations that require configuration,
synthetic credentials, or runtime testing. If no vulnerabilities are found,
state what was reviewed and what could not be verified.

## Recursos

- [`OWASP-Security-Review.md`](./references/OWASP-Security-Review.md): project
  checklist and adapted review format.
- Reference repository: [Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills).
