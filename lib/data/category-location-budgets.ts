import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type MonthSummary = {
  accountById: Map<string, { gasto: number; transferIn: number; transferOut: number }>
  gastoByWallet: Map<string, number>
  transferByWallet: Map<string, number>
  yieldByWallet: Map<string, number>
  yieldByAccount: Map<string, number>
}

export type CategoryLocationBudget = {
  assigned: number
  rollover: number
  budget: number
  spent: number
  transferMovement: number
  yieldAmount: number
  available: number
  locations: number
}

/** Derives category totals from the account/pocket budgets that actually hold the allocation. */
export async function getCategoryLocationBudgets(
  supabase: SupabaseClient,
  periodMonth: string,
  summaryPromise: Promise<MonthSummary>,
) {
  const [{ data: accounts, error: accountsError }, { data: wallets, error: walletsError }, { data: budgets, error: budgetsError }, summary] = await Promise.all([
    supabase.from('accounts').select('id, category_id, has_wallets').eq('is_active', true),
    supabase.from('wallets').select('id, category_id').eq('is_active', true),
    supabase.from('wallet_budgets').select('wallet_id, account_id, assigned_amount, rollover_amount, total_budget').eq('period_month', periodMonth),
    summaryPromise,
  ])

  if (accountsError) throw accountsError
  if (walletsError) throw walletsError
  if (budgetsError) throw budgetsError

  const budgetByTarget = new Map((budgets ?? []).map((budget) => [
    `${budget.wallet_id ? 'wallet' : 'account'}:${budget.wallet_id ?? budget.account_id}`,
    budget,
  ]))
  const byCategory = new Map<string, CategoryLocationBudget>()
  const addLocation = (
    categoryId: string | null,
    key: string,
    spent: number,
    transferMovement: number,
    yieldAmount: number,
  ) => {
    if (!categoryId) return
    const budget = budgetByTarget.get(key)
    const assigned = Number(budget?.assigned_amount ?? 0)
    const rollover = Number(budget?.rollover_amount ?? 0)
    const total = Number(budget?.total_budget ?? assigned + rollover)
    const current = byCategory.get(categoryId) ?? {
      assigned: 0, rollover: 0, budget: 0, spent: 0, transferMovement: 0, yieldAmount: 0, available: 0, locations: 0,
    }
    current.assigned += assigned
    current.rollover += rollover
    current.budget += total
    current.spent += spent
    current.transferMovement += transferMovement
    current.yieldAmount += yieldAmount
    current.available += total - spent + transferMovement + yieldAmount
    current.locations += 1
    byCategory.set(categoryId, current)
  }

  for (const account of accounts ?? []) {
    if (account.has_wallets || !account.category_id) continue
    const accountSummary = summary.accountById.get(account.id)
    addLocation(
      account.category_id,
      `account:${account.id}`,
      accountSummary?.gasto ?? 0,
      (accountSummary?.transferIn ?? 0) - (accountSummary?.transferOut ?? 0),
      summary.yieldByAccount.get(account.id) ?? 0,
    )
  }

  for (const wallet of wallets ?? []) {
    addLocation(
      wallet.category_id,
      `wallet:${wallet.id}`,
      summary.gastoByWallet.get(wallet.id) ?? 0,
      summary.transferByWallet.get(wallet.id) ?? 0,
      summary.yieldByWallet.get(wallet.id) ?? 0,
    )
  }

  return byCategory
}
