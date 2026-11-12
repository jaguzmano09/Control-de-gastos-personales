import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { calculateDailyYield } from '@/lib/yield-calculation'
import { hasValidCronAuthorization } from '@/lib/security/cron-auth'

const internalErrorResponse = () => NextResponse.json({ error: 'Internal server error' }, { status: 500 })

function currentMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function previousMonthOf(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron authentication unavailable' }, { status: 503 })
  }

  if (!hasValidCronAuthorization(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const currentMonth = currentMonthStart()
  const previousMonth = previousMonthOf(currentMonth)

  const [
    { data: previousBudgetsData, error: budgetsError },
    { data: accounts, error: accountsError },
    { data: wallets, error: walletsError },
  ] = await Promise.all([
    supabase
      .from('wallet_budgets')
      .select('id, user_id, wallet_id, account_id, total_budget, rollover_amount')
      .eq('period_month', previousMonth),
    supabase
      .from('accounts')
      .select('id, user_id, has_wallets')
      .eq('is_active', true),
    supabase
      .from('wallets')
      .select('id, user_id, account_id')
      .eq('is_active', true),
  ])

  if (budgetsError) {
    return internalErrorResponse()
  }
  if (accountsError) {
    return internalErrorResponse()
  }
  if (walletsError) {
    return internalErrorResponse()
  }

  type RolloverBudget = {
    id: string
    user_id: string
    wallet_id: string | null
    account_id: string | null
    total_budget: number | null
    rollover_amount: number
  }
  const previousBudgets = [...(previousBudgetsData ?? [])] as RolloverBudget[]
  const existingBudgetKeys = new Set(
    previousBudgets.map((budget) => `${budget.user_id}:${budget.wallet_id ?? `account:${budget.account_id}`}`),
  )
  const destinations = [
    ...(accounts ?? [])
      .filter((account) => !account.has_wallets)
      .map((account) => ({ user_id: account.user_id, wallet_id: null, account_id: account.id })),
    ...(wallets ?? []).map((wallet) => ({ user_id: wallet.user_id, wallet_id: wallet.id, account_id: null })),
  ]

  for (const destination of destinations) {
    const key = `${destination.user_id}:${destination.wallet_id ?? `account:${destination.account_id}`}`
    if (existingBudgetKeys.has(key)) continue

    const { data: createdBudget, error: createBudgetError } = await supabase
      .from('wallet_budgets')
      .insert({
        user_id: destination.user_id,
        wallet_id: destination.wallet_id,
        account_id: destination.account_id,
        period_month: previousMonth,
        assigned_amount: 0,
        rollover_amount: 0,
      })
      .select('id, user_id, wallet_id, account_id, total_budget, rollover_amount')
      .single()

    if (createBudgetError) {
      return internalErrorResponse()
    }
    previousBudgets.push(createdBudget as RolloverBudget)
    existingBudgetKeys.add(key)
  }

  const results: Array<{
    wallet_id: string | null
    account_id: string | null
    rollover_amount: number
    category_id: string | null
    category_name: string | null
    category_status: 'assigned' | 'manual_selection_required'
    yield_amount: number
  }> = []
  const categoryRollovers = new Map<string, number>()
  for (const budget of previousBudgets ?? []) {
    let spentQuery = supabase
      .from('transactions')
      .select('amount, category_id, type, savings_operation')
      .eq('user_id', budget.user_id)
      .eq('month', previousMonth)
      .eq('status', 'confirmada')

    spentQuery = budget.wallet_id
      ? spentQuery.eq('wallet_id', budget.wallet_id)
      : spentQuery.eq('account_id', budget.account_id!).is('wallet_id', null)

    const { data: spentRows, error: spentError } = await spentQuery
    if (spentError) {
      return internalErrorResponse()
    }

    const spent = (spentRows ?? [])
      .filter((row) => row.type === 'Gasto')
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const savingsNet = (spentRows ?? [])
      .filter((row) => row.type === 'Ahorro')
      .reduce((sum, row) => sum + (row.savings_operation === 'ingreso' ? Number(row.amount) : -Number(row.amount)), 0)
    const { data: yieldConfig, error: yieldConfigError } = await supabase
      .from('yield_configs')
      .select('id, start_date, is_active')
      .eq('user_id', budget.user_id)
      .eq('is_active', true)
      .match(budget.wallet_id ? { wallet_id: budget.wallet_id } : { account_id: budget.account_id })
      .maybeSingle()
    if (yieldConfigError) {
      return internalErrorResponse()
    }

    let yieldAmount = 0
    if (yieldConfig) {
      const { data: yieldRates, error: yieldRatesError } = await supabase
        .from('yield_rates')
        .select('ea_percent, valid_from')
        .eq('config_id', yieldConfig.id)
        .order('valid_from')
      if (yieldRatesError) {
        return internalErrorResponse()
      }

      let yieldTransactionsQuery = supabase
        .from('transactions')
        .select('occurred_at, amount, type, savings_operation, wallet_id, account_id')
        .eq('user_id', budget.user_id)
        .gte('occurred_at', previousMonth)
        .lt('occurred_at', currentMonth)
        .eq('status', 'confirmada')
      yieldTransactionsQuery = budget.wallet_id
        ? yieldTransactionsQuery.eq('wallet_id', budget.wallet_id)
        : yieldTransactionsQuery.eq('account_id', budget.account_id!).is('wallet_id', null)
      const { data: yieldTransactions, error: yieldTransactionsError } = await yieldTransactionsQuery
      if (yieldTransactionsError) {
        return internalErrorResponse()
      }

      yieldAmount = calculateDailyYield({
        openingBalance: Number(budget.rollover_amount),
        periodStart: previousMonth,
        periodEnd: currentMonth,
        activationDate: yieldConfig.start_date,
        movements: (yieldTransactions ?? []).map((transaction) => ({
          date: transaction.occurred_at.slice(0, 10),
          amount: transaction.type === 'Ingreso' || (transaction.type === 'Ahorro' && transaction.savings_operation === 'ingreso')
            ? Number(transaction.amount)
            : -Number(transaction.amount),
        })),
        rates: (yieldRates ?? []).map((rate) => ({
          eaPercent: Number(rate.ea_percent),
          validFrom: rate.valid_from,
        })),
      })
    }

    const leftover = Math.max(Number(budget.total_budget) - spent + savingsNet + yieldAmount, 0)
    const categoryIdsInSpent = Array.from(new Set(
      (spentRows ?? [])
        .filter((row) => (row.type === 'Gasto' || row.type === 'Ahorro') && row.category_id)
        .map((row) => row.category_id as string)
    ))

    const { data: previousCategoryBudgets, error: categoryBudgetsError } = await supabase
      .from('category_budgets')
      .select('category_id')
      .eq('user_id', budget.user_id)
      .eq('period_month', previousMonth)
      .in('category_id', categoryIdsInSpent.length > 0 ? categoryIdsInSpent : ['00000000-0000-0000-0000-000000000000'])

    if (categoryBudgetsError) {
      return internalErrorResponse()
    }
    const matchingCategoryIds = Array.from(new Set((previousCategoryBudgets ?? []).map((row) => row.category_id)))
    const categoryId = matchingCategoryIds.length === 1 ? matchingCategoryIds[0] : null

    let currentQuery = supabase
      .from('wallet_budgets')
      .select('id')
      .eq('user_id', budget.user_id)
      .eq('period_month', currentMonth)

    currentQuery = budget.wallet_id
      ? currentQuery.eq('wallet_id', budget.wallet_id)
      : currentQuery.eq('account_id', budget.account_id!).is('wallet_id', null)

    const { data: existingCurrent, error: currentError } = await currentQuery.maybeSingle()
    if (currentError) {
      return internalErrorResponse()
    }

    const budgetQuery = existingCurrent
      ? supabase.from('wallet_budgets').update({ rollover_amount: leftover }).eq('id', existingCurrent.id)
      : supabase.from('wallet_budgets').insert({
          user_id: budget.user_id,
          wallet_id: budget.wallet_id,
          account_id: budget.account_id,
          period_month: currentMonth,
          assigned_amount: 0,
          rollover_amount: leftover,
        })

    const { error: budgetError } = await budgetQuery
    if (budgetError) {
      return internalErrorResponse()
    }

    if (leftover > 0) {
      const { error: reviewError } = await supabase
        .from('budget_rollover_reviews')
        .upsert({
          user_id: budget.user_id,
          source_budget_id: budget.id,
          source_period_month: previousMonth,
          target_period_month: currentMonth,
          wallet_id: budget.wallet_id,
          account_id: budget.account_id,
          amount: leftover,
          category_id: categoryId,
          status: categoryId ? 'assigned' : 'pending',
        }, { onConflict: 'source_budget_id,target_period_month' })

      if (reviewError) {
        return internalErrorResponse()
      }
      if (categoryId) {
        const key = `${budget.user_id}:${categoryId}`
        categoryRollovers.set(key, (categoryRollovers.get(key) ?? 0) + leftover)
      }
    } else {
      const { error: zeroReviewError } = await supabase
        .from('budget_rollover_reviews')
        .delete()
        .eq('source_budget_id', budget.id)
        .eq('target_period_month', currentMonth)
        .eq('status', 'pending')

      if (zeroReviewError) {
        return internalErrorResponse()
      }
    }

    results.push({
      wallet_id: budget.wallet_id,
      account_id: budget.account_id,
      rollover_amount: leftover,
      category_id: categoryId,
      category_name: null,
      category_status: categoryId ? 'assigned' : 'manual_selection_required',
      yield_amount: yieldAmount,
    })
  }

  for (const [key, rolloverAmount] of Array.from(categoryRollovers.entries())) {
    const [userId, categoryId] = key.split(':')
    const { data: currentCategoryBudget, error: currentCategoryError } = await supabase
      .from('category_budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('period_month', currentMonth)
      .maybeSingle()

    if (currentCategoryError) {
      return internalErrorResponse()
    }

    const categoryBudgetQuery = currentCategoryBudget
      ? supabase
          .from('category_budgets')
          .update({ rollover_amount: rolloverAmount })
          .eq('id', currentCategoryBudget.id)
      : supabase.from('category_budgets').insert({
          user_id: userId,
          category_id: categoryId,
          period_month: currentMonth,
          amount: 0,
          rollover_amount: rolloverAmount,
          alert_threshold_percent: null,
        })

    const { error: categoryBudgetError } = await categoryBudgetQuery
    if (categoryBudgetError) {
      return internalErrorResponse()
    }

  }

  const categoryIds = Array.from(new Set(results.flatMap((result) => result.category_id ? [result.category_id] : [])))
  if (categoryIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)

    if (categoriesError) {
      return internalErrorResponse()
    }

    const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]))
    for (const result of results) {
      result.category_name = result.category_id ? categoryNames.get(result.category_id) ?? null : null
    }
  }

  return NextResponse.json({
    ok: true,
    month: currentMonth,
    processed: results.length,
    categories_assigned: results.filter((result) => result.category_status === 'assigned').length,
    manual_selection_required: results.filter((result) => result.category_status === 'manual_selection_required').length,
  })
}
