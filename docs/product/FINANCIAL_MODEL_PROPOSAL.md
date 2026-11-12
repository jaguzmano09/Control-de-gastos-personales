# Financial glossary and proposed model

Status: Proposed for review under P0.4. This is a product accounting design, not financial advice or a migration. Existing calculation behavior remains unchanged by this document.

The current code/specification contain ambiguities around savings, transfers, rollover, and estimated yield. P2 must reconcile this proposal with existing personal records before modifying calculations.

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
| Savings allocation | Earmarking existing money for a purpose | Does not create income; moving it to another tracked location is a transfer |
| Savings withdrawal | Releasing earmarked money or moving it back | Release alone is not an expense; actual spending is recorded separately |
| Investment allocation | Movement into a tracked investment location, if that location is in scope | Contribution differs from consumption and market valuation; scope must be agreed |
| Budget allocation | A spending plan for a category/month | Editing an allocation does not change financial balance |
| Budget remaining | Allocated amount plus applicable rollover minus confirmed eligible spending | Can be negative; display the exact excess |
| Rollover | A derived carryover of an agreed remaining budget amount | Not new money, not income, and not a synthetic transaction |
| Estimated yield | A calculated projection using configured rates and recorded principal | Informational; do not silently present it as received cash |
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

1. Adopt savings as allocation/internal movement, or retain another explicitly defined model. Existing Ahorro ingreso/retiro records require interpretation and compatibility mapping; do not blindly reclassify them.
2. Agree on investment scope: contribution tracking only versus tracked investment assets/valuation. Do not invent market value from contributions.
3. Agree on estimated-yield display and carryover treatment. The recommendation is to separate estimates from recorded cash; current code includes estimates in balances/rollover, so this would change behavior.
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
