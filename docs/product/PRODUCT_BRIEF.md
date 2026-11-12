# Product brief — P0

Status: In review. Owner-confirmed decisions and proposed details are separated below.
Source: owner feedback, roadmap v2, and repository assessment. This brief does not describe every capability as already implemented.

## Confirmed decisions

| ID | Decision | Evidence |
|---|---|---|
| D01 | Initial audience: individuals in Colombia managing personal finances; COP; America/Bogota | Owner explicitly confirmed the proposed audience/currency/timezone in the P0 questions |
| D02 | Primary benefit: record and organize personal financial movements | Owner selected recording/organization over planning or reconciliation |
| D03 | Gmail and OCR are enabled progressively after individual reliability checks | Owner explicitly selected progressive availability |
| D04 | Public homepage must attract attention and explain the product immediately | Owner roadmap feedback |
| D05 | Distinctive identity must support a functional, enjoyable experience | Owner roadmap feedback |
| D06 | Owner retains ordinary account capabilities plus protected product administration | Owner roadmap feedback |
| D07 | Privacy is a cross-phase priority | Owner roadmap feedback |
| D08 | Documentation/comments and Git commit messages in English; owner communication in Spanglish | Owner communication and Git feedback |

## Product definition

For people in Colombia whose movements are scattered across accounts, wallets, cash, and manual records, the platform provides one private place to record, organize, find, and correct their personal movements.

The initial job is: after money moves, record it with little effort and later understand what happened, where, and when. Budget planning and spending capacity build on trustworthy records; neither is a prerequisite for making the first useful entry.

Proposed core outcome: a new member can create a financial account, record an expense, find it in history, and correct it without database setup or creator instructions.

A public promise can describe that outcome only once the journey is implemented and verified.

## Three journeys

| Surface | Person and need | Next meaningful action | Success evidence |
|---|---|---|---|
| Public homepage | Visitor asks what it does, who it is for, and whether to trust it | Understand a synthetic example, then create an account or sign in | First-impression explanation and a working entry path |
| Personal workspace | Member wants to record and retrieve movements | Add a movement, inspect its account/date/status, then find or edit it | Successful task from empty setup; accurate history and financial effects |
| Owner administration | Owner wants to understand adoption and reliability | Review aggregate usage/outcome metrics and investigate operational failures through sanitized evidence | Defined, current metrics without exposing another member's finances |

Returning members should reach sign-in and recording quickly. Public acquisition content should not obstruct their routine work. The homepage concept and route layout will be designed in P4/P5, not silently changed here.

## First-beta scope proposal

Only progressive integration availability is owner-confirmed; the remaining classifications below are proposals for review.

| Capability | Proposed classification | Delivery gate |
|---|---|---|
| Public homepage and clear access | Essential | Truthful positioning, synthetic preview, accessible desktop/mobile journey |
| Registration, confirmation, recovery, settings | Essential | End-to-end access and recovery without creator help |
| Account setup and optional wallets | Essential | Ownership, sensible first setup, no mandatory bank connection |
| Manual income/expense recording | Essential | Complete validation, clear result, correction path, no duplicate submissions |
| History, filtering, editing | Essential | Records remain discoverable beyond the current 300-row cap |
| Accurate balances and state explanations | Essential | P2 agreement across views; estimates distinguished from recorded money |
| Budget assignment | Supporting core | A usable amount editor and precise budget terminology; never required before first recording |
| Review queue and categorization | Required when assisted capture is enabled | Unconfirmed imports do not affect calculations; corrections are recoverable |
| Transfers, savings, investments | Existing capability under financial-model review | P2 semantics and compatibility before public exposure or changes |
| Gmail/OCR | Progressive, owner-confirmed | Feature-specific correctness, privacy, recovery, and resource gates |
| Shopping and price memory | Advanced, proposed later introduction | Existing personal records preserved; purchase handoff remains correct |
| Yield estimation | Advanced, proposed later introduction | Assumptions/limits explicit; no invented actual interest |
| Owner metrics area | Essential administration | Trusted role provisioning and aggregate visibility; never a financial-data browser |
| Billing, shared households, teams, multiple currencies | Deferred pending a product decision | No implementation implied by this brief |

This is a release-availability proposal, not permission to delete features or data from the current personal workspace.

## Experience and identity requirements

The functional character should be precise, approachable, respectful, and easy to return to. The brand should be recognizable in task behavior as well as appearance.

Preserve as product principles: human control over automated capture, Spanish interface, user-owned organization, and clear transaction states. Existing colors/name/logo are incumbent evidence, not final approved brand choices.

Evaluate creative directions against audience relevance, recognition, comprehension, emotional appeal, task success, and consistency between the homepage promise and actual use. P4 owns naming, visual selection, and the design system.

Avoid moral judgment about spending, fabricated social proof, unsupported bank synchronization claims, and claims of full anonymity or guaranteed financial outcomes.

## Operating assumptions and open decisions

Proposed working approach: invitation-based beta, existing infrastructure, optional providers gated independently, and no payment integration in the first implementation block.

Still open: beta cohort/access policy, acceptable provider spend, support capacity/contact, exact retention schedules, final brand constraints, and financial-model choices identified in FINANCIAL_MODEL_PROPOSAL.md. Do not substitute arbitrary dates, budgets, or commercial targets for these decisions.

## P0 task evidence

| Task | Status | Artifact/evidence |
|---|---|---|
| P0.1 | Confirmed | D01 |
| P0.2 | Confirmed | D02 |
| P0.3 | In review | D03 plus scope table; full classifications need review |
| P0.4 | In review | FINANCIAL_MODEL_PROPOSAL.md |
| P0.5 | In review | Identity requirements above; final constraints/name unconfirmed |
| P0.6 | In review | Operating assumptions above; budget/capacity not invented |
| P0.7 | Ready for review | Three journey definitions above |
| P0.8 | Ready for review | PRIVACY_DATA_MAP.md and explicit admin boundary |

P0 is in review, not complete. D01–D08 do not approve all proposals by association.
