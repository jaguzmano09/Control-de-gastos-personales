# Financial glossary and proposed model

Status: Core semantics below are owner-confirmed for P2. This document is a product accounting design, not financial advice or a migration. Existing calculation behavior remains unchanged until a compatible implementation and reconciliation plan are ready.

The current calculations conflict with the owner-confirmed semantics below. P2 must reconcile the implementation with those rules and existing personal records before changing calculations.

## Owner-confirmed accounting semantics

| Concept | Confirmed meaning |
|---|---|
| Transfer | Move a specified amount from one tracked account to another (and, where applicable, between pockets). Source decreases and destination increases by the same amount; consolidated money does not change. Example: COP 20,000 + COP 15,000 becomes COP 15,000 + COP 20,000; total remains COP 35,000. |
| Savings / piggy bank | A purpose-based place to accumulate money already owned, such as a trip fund. Contributions move/allocate existing funds into the goal; withdrawals release/move funds back for use. Neither is new income or spending. A later purchase is recorded as an expense. |
| Effective annual yield | The configured EA rate represents daily growth for the configured account/pocket. Show accrued yield separately from confirmed cash unless the user has recorded an actual credit. Use the product's actual rate and terms; a market average is not the user's rate. |
| Monthly budget rollover | Positive unspent budget from the previous month, assigned to a selected budget target. It increases that target's available budget, not financial-account cash or income. |
| Over-budget result | Show the exact negative remaining amount and make it reviewable. Do not silently clamp it to zero. Let the user record real expenses even when they exceed a plan; surface options to review or adjust the plan. |
| Monthly balance language | Monthly movement totals and actual account balances are different measures. Label a period's net separately from the balance at a date to avoid implying that one selected month's activity is a cumulative balance. |

Still to specify for implementation: whether savings goals are represented by existing wallets or a dedicated goal object; how legacy savings rows map to a source and destination; opening-balance date/history cutoff; product-specific yield day-count, posting and rounding details; and whether an overspend should affect the following month's plan. Do not infer these from old data.

Recommended first implementation: represent a piggy bank as a purpose-named wallet inside the account holding the money. Contribute/withdraw using the same internal movement model as transfers, so wallet-level balances change while the account's consolidated cash remains unchanged. If the money is actually held at another institution/account, model that as a separate financial account and transfer it there. Dedicated goal targets, deadlines, or progress tracking can be added later without redefining the ledger.

## Observed implementation issues

Read-only source review of `lib/data/dashboard.ts`, `lib/yield-calculation.ts`, `app/(dashboard)/page.tsx`, `lib/actions/transactions.ts`, and `app/api/cron/rollover/route.ts` found the following concrete mismatches with the confirmed semantics. No calculation or stored personal data was changed during this review.

| Area | Current implementation | Why it conflicts with the confirmed semantics |
|---|---|---|
| Transfers | A `Transferencia` affects a statistic but has no destination and does not debit/credit either account or wallet. | The core transfer example cannot be represented. |
| Savings | `Ahorro / ingreso` currently increases account, wallet, and consolidated balances; `retiro` decreases them and is grouped with category spending. | This treats an internal contribution as income and a release as spending, contrary to the piggy-bank semantics. |
| Yield principal | Dashboard and rollover calculations use `wallet_budgets.rollover_amount` as the yield opening balance rather than the actual balance of the configured account/pocket. | Yield can be calculated from a budget remainder rather than the money earning interest. |
| EA compounding | `calculateDailyYield` adds daily interest to `total` but does not add it to the balance used for the next day's interest. | The daily equivalent of EA is not compounded by this calculation; for a constant positive balance, it produces less than the configured EA over a year. |
| Estimated yield | Calculated yield is added to displayed balances and included in budget rollover. | An estimate is mixed with confirmed money and budget carryover. |
| Rollover | The rollover cron clamps leftover budget with `Math.max(..., 0)`. Dashboard balance adds rollover amounts to financial balances. | The exact overspend is hidden and budget carryover is treated like cash. |
| Balance period | `getMonthSummary` loads confirmed transactions for the selected month (and only through today for the current month); the overview also derives account figures from this period summary. | A period net can be mistaken for the current cumulative account balance. |
| Budget display | Wallet-budget remaining values are clamped at zero; category movement also mixes savings operations with spending. | The UI hides how far spending exceeded the fixed plan and applies the wrong savings semantics. |

These findings show the current calculations are **not consistent with the confirmed rules**. P2 should implement the agreed semantics while preserving a safe interpretation path for existing records.

## Effective annual yield research

The Superintendencia Financiera de Colombia provides an EA-to-daily conversion tool for estimating interest over periods shorter than a year, and the Banco de la República explains effective annual rates as equivalent to periodic compounding. For an EA rate `r` expressed as a decimal and a 365-day basis, the equivalent daily rate is:

`dailyRate = (1 + r)^(1/365) - 1`

At 10% EA, this is approximately 0.0261158% per day. If daily interest is capitalized, COP 1,000,000 grows by COP 100,000 over 365 days before product-specific taxes, fees, rounding, and posting rules. The current implementation's simple daily sum would add only about COP 95,323 for a constant balance, and its opening principal currently comes from budget rollover rather than the account/pocket balance.

This is a mathematical estimate, not a promise that a particular bank product credits interest daily. The product's own rate terms may use a different day-count basis, balance cutoff, rounding, withholding, or interest-posting schedule. Use rates entered for the user's product, label unposted yield as estimated, and never imply that the Superfinanciera's reported market average is the user's personal rate. Sources: [Superfinanciera rate-conversion guidance](https://www.superfinanciera.gov.co/preguntas-frecuentes/12/12-tasas-de-interes/), [Superfinanciera EA conversion simulator](https://www.superfinanciera.gov.co/publicaciones/61554/consumidor-financieroinformacion-generalsimulador-de-conversion-de-tasas-de-interes-61554/), [Banco de la República, Finanzas para no financieros](https://repositorio.banrep.gov.co/bitstream/handle/20.500.12134/10292/Finanzasparanofinancieros.pdf?isAllowed=y&sequence=1).

## Glossary

| Term | Proposed meaning | Boundary |
|---|---|---|
| Financial account | A user-owned location containing money, such as a bank account or cash | Never implies a live connection or verified bank balance |
| Wallet | A subdivision of one financial account | Parent balance must not count the same money again |
| Category | A purpose/classification for a movement | Does not create money or act as a financial account |
| Opening balance | An explicit starting amount at an agreed effective date | A baseline, not new recurring income; imported history must not count it twice |
| Recorded balance | Opening balance plus confirmed inflows minus confirmed outflows | Based on recorded data; do not label it bank-verified |
| External income | Money entering the tracked system from outside it | Increases recorded total once |
| Expense | Money leaving the tracked system for consumption/payment | Decreases recorded total and applicable expense totals once |
| Transfer | A linked movement between tracked accounts/wallets | Source decreases, destination increases; consolidated money is unchanged |
| Savings allocation | Moving or earmarking existing money into a purpose-based goal | Does not create income; a later purchase is a separate expense |
| Savings withdrawal | Releasing or moving earmarked money back for use | Release alone is not an expense; actual spending is recorded separately |
| Investment allocation | Movement into a tracked investment location, if that location is in scope | Contribution differs from consumption and market valuation; scope must be agreed |
| Budget allocation | A spending plan for a category/month | Editing an allocation does not change financial balance |
| Budget remaining | Allocated amount plus applicable rollover minus confirmed eligible spending | Can be negative; display the exact excess |
| Rollover | Positive unspent budget carried from the prior month to an assigned target | Increases available plan only; not new money, income, or account cash |
| Estimated yield | Daily accrued projection using the configured EA rate and actual tracked principal | Keep distinct from posted/confirmed interest and explain as an estimate |
| Paid interest | Actual money received and recorded/confirmed once | Reconcile with any estimate so it is not counted twice |
| Pending import | Unverified extracted movement | Excluded from financial totals until confirmation |
| Possible duplicate | Entry requiring a duplicate decision | Excluded until deliberately resolved |
| Discarded entry | An entry intentionally excluded | Does not affect totals |

## Proposed accounting examples

These are synthetic examples and proposed acceptance cases, not assertions that the current application already behaves this way.

| Scenario | Expected result |
|---|---|
| Start cash at COP 100,000, then spend COP 20,000 | Recorded cash COP 80,000; spending COP 20,000; baseline is not period income |
| Move COP 30,000 from account A to tracked account B | A decreases 30,000, B increases 30,000; consolidated balance unchanged; spending unchanged |
| Mark COP 10,000 as savings without moving it | Purpose allocation changes; consolidated money unchanged |
| Move that savings amount into a tracked savings wallet | Linked internal movement, not another external income |
| Add a COP 50,000 category budget | Spending plan increases; financial balance unchanged |
| Spend COP 60,000 against that budget | Remaining budget is negative COP 10,000, not zero |
| Assign rollover sources of COP 100 and COP 200 to one category | Carryover COP 300; a retried assignment does not add it again |
| Extract a COP 20,000 receipt as pending | Recorded totals unchanged until confirmation |
| Calculate COP 300 estimated interest, then record its actual payment | Actual balance includes the paid amount once; estimate remains separately identified/reconciled |

## Decisions required before P2 changes

1. Use purpose-named wallets as piggy banks for the first implementation unless product review identifies a need for a separate goals entity. Existing Ahorro ingreso/retiro records require interpretation and compatibility mapping; do not blindly reclassify them.
2. Agree on investment scope: contribution tracking only versus tracked investment assets/valuation. Do not invent market value from contributions.
3. Implement owner-confirmed separation of estimated daily yield from confirmed cash and budget rollover; resolve product-specific day-count/posting details before claiming bank-level precision.
4. Define opening-balance storage/effective date and history import cutoff.
5. Define budget funding/rollover rules across category and wallet views. They describe the same underlying money and must not become independently additive funds.
6. Confirm decimal storage, rounding stage, and date-boundary rules. COP presentation may use whole pesos while existing amounts retain decimals; preserve precision until a policy is agreed.

## Calculation invariants for P2

- Only confirmed records change recorded balances.
- All money movements balance across tracked source/destination when internal.
- Wallet totals reconcile with their account without duplicated parent sums.
- Budget changes and rollover assignment never manufacture financial income.
- Replaying a submission, import, assignment, or closing does not duplicate its effects.
- Partial failures do not leave half a transfer or a budget assignment without its review state.
- Calculations read complete supported datasets; pagination limits cannot silently truncate totals.
- Business-day/month boundaries use the confirmed America/Bogota policy consistently.
- User ownership applies to every referenced account, wallet, category, and operation.
- Corrections and deletion have defined effects on downstream summaries and closing; preserve a safe compatibility path for old records.

P2 should turn the agreed examples into exact business tests. This glossary does not itself authorize schema changes or reinterpretation of real records.
