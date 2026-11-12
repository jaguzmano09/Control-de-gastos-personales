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
| D09 | Do not describe the current product as a beta; its existing capabilities are considered part of the product and remain subject to continuous improvement | Owner feedback on P0.3 |
| D10 | The homepage, member, and admin journeys are accepted as proposed in this brief | Owner feedback on P0.7 |
| D11 | No external providers are currently selected; provider integrations need a privacy and operations policy before adoption | Owner feedback on P0.8 |
| D12 | Operate with free resources only for now; no paid provider or infrastructure is authorized | Owner feedback |
| D13 | Transfers move money between tracked accounts; savings contributions/withdrawals move existing money into/out of a purpose-based piggy bank; neither creates income or spending | Owner's COP 20,000/COP 15,000 transfer example and savings explanation |
| D14 | EA yield grows daily on the configured account/pocket; prior-month positive budget remainder is assigned to a budget and is not extra cash; monthly activity must be distinguished from current balance | Owner's yield, rollover, and monthly-view clarification |
| D15 | Budgets remain fixed plans; show exact negative remaining amount when overspent and make it reviewable instead of clamping to zero | Owner accepted displaying the negative and reviewing alternatives |

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

## Current product scope and public-readiness proposal

The owner does not consider the current product a beta and considers its existing capabilities part of the product, subject to improvement. This does not waive quality, security, privacy, or correctness gates for public access. Gmail and OCR availability remains progressive, as confirmed in D03. The table below is an implementation/readiness inventory, not a proposal to remove or silently defer existing features.

| Capability | Proposed classification | Delivery gate |
|---|---|---|
| Public homepage and clear access | Essential | Truthful positioning, synthetic preview, accessible desktop/mobile journey |
| Registration, confirmation, recovery, settings | Essential | End-to-end access and recovery without creator help |
| Account setup and optional wallets | Essential | Ownership, sensible first setup, no mandatory bank connection |
| Manual income/expense recording | Essential | Complete validation, clear result, correction path, no duplicate submissions |
| History, filtering, editing | Essential | Records remain discoverable beyond the current 300-row cap |
| Accurate balances and state explanations | Essential | P2 agreement across views; estimates distinguished from recorded money |
| Budget assignment | Existing core capability | A usable amount editor and precise budget terminology; never required before first recording |
| Review queue and categorization | Required when assisted capture is enabled | Unconfirmed imports do not affect calculations; corrections are recoverable |
| Transfers, savings, investments | Existing capabilities; semantics under financial-model review | P2 correctness and compatibility before changing calculations |
| Gmail/OCR | Progressive, owner-confirmed | Feature-specific correctness, privacy, recovery, and resource gates |
| Shopping and price memory | Existing capability subject to improvement | Existing personal records preserved; purchase handoff remains correct |
| Yield estimation | Existing capability subject to improvement | Assumptions/limits explicit; separate estimates from recorded cash if that rule is approved |
| Owner metrics area | Essential administration | Trusted role provisioning and aggregate visibility; never a financial-data browser |
| Billing, shared households, teams, multiple currencies | Deferred pending a product decision | No implementation implied by this brief |

This is a release-readiness inventory, not permission to delete features or data from the current personal workspace.

## Experience and identity requirements

The functional character should be precise, approachable, respectful, and easy to return to. The brand should be recognizable in task behavior as well as appearance.

Preserve as product principles: human control over automated capture, Spanish interface, user-owned organization, and clear transaction states. Existing colors/name/logo are incumbent evidence, not final approved brand choices.

Evaluate creative directions against audience relevance, recognition, comprehension, emotional appeal, task success, and consistency between the homepage promise and actual use. P4 owns naming, visual selection, and the design system.

Avoid moral judgment about spending, fabricated social proof, unsupported bank synchronization claims, and claims of full anonymity or guaranteed financial outcomes.

## Operating assumptions and open decisions

Proposed working approach: controlled public access, existing infrastructure, optional providers gated independently, and no payment integration in the first implementation block.

Still open: public access policy, support capacity/contact, exact retention schedules, final brand constraints, and financial-model choices identified in FINANCIAL_MODEL_PROPOSAL.md. The owner confirmed free-resource-only operation for now. Do not substitute arbitrary dates, budgets, or commercial targets for these decisions.

## P0 task evidence

| Task | Status | Artifact/evidence |
|---|---|---|
| P0.1 | Confirmed | D01 |
| P0.2 | Confirmed | D02 |
| P0.3 | Partially confirmed | D03, D09, and current scope table; feature-specific public-readiness gates remain |
| P0.4 | Partially confirmed | D13–D15 establish transfer, savings, yield, rollover, and overspend semantics; opening balance/history cutoff, savings-goal representation, product-specific yield terms, and rounding remain to specify. See FINANCIAL_MODEL_PROPOSAL.md. |
| P0.5 | In review | Identity requirements above; final constraints/name unconfirmed |
| P0.6 | In review | Operating assumptions above; budget/capacity not invented |
| P0.7 | Confirmed | D10 and three journey definitions above |
| P0.8 | Principle confirmed; policy pending | D11 and PRIVACY_DATA_MAP.md; no provider currently selected, policy required before adoption |

P0 is in review, not complete. D01–D08 do not approve all proposals by association.
