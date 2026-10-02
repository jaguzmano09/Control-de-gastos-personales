import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const currentMonth = currentMonthStart()
  const previousMonth = previousMonthOf(currentMonth)

  const { data: previousBudgets, error: budgetsError } = await supabase
    .from('wallet_budgets')
    .select('id, user_id, wallet_id, account_id, total_budget')
    .eq('period_month', previousMonth)

  if (budgetsError) {
    return NextResponse.json({ error: budgetsError.message }, { status: 500 })
  }

  const results: Array<{
    wallet_id: string | null
    account_id: string | null
    rollover_amount: number
    category_id: string | null
    category_name: string | null
    category_status: 'assigned' | 'manual_selection_required'
  }> = []
  const categoryRollovers = new Map<string, number>()

  for (const budget of previousBudgets ?? []) {
    let spentQuery = supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', budget.user_id)
      .eq('month', previousMonth)
      .eq('type', 'Gasto')
      .eq('status', 'confirmada')

    spentQuery = budget.wallet_id
      ? spentQuery.eq('wallet_id', budget.wallet_id)
      : spentQuery.eq('account_id', budget.account_id!).is('wallet_id', null)

    const { data: spentRows, error: spentError } = await spentQuery
    if (spentError) {
      return NextResponse.json({ error: spentError.message }, { status: 500 })
    }

    const spent = (spentRows ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
    const leftover = Math.max(Number(budget.total_budget) - spent, 0)
    const categoryIdsInSpent = Array.from(new Set(
      (spentRows ?? []).filter((row) => row.category_id).map((row) => row.category_id as string)
    ))

    const { data: previousCategoryBudgets, error: categoryBudgetsError } = await supabase
      .from('category_budgets')
      .select('category_id')
      .eq('user_id', budget.user_id)
      .eq('period_month', previousMonth)
      .in('category_id', categoryIdsInSpent.length > 0 ? categoryIdsInSpent : ['00000000-0000-0000-0000-000000000000'])

    if (categoryBudgetsError) {
      return NextResponse.json({ error: categoryBudgetsError.message }, { status: 500 })
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
      : currentQuery.eq('account_id', budget.account_id!)

    const { data: existingCurrent, error: currentError } = await currentQuery.maybeSingle()
    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 })
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
      return NextResponse.json({ error: budgetError.message }, { status: 500 })
    }

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
      return NextResponse.json({ error: reviewError.message }, { status: 500 })
    }

    if (categoryId) {
      const key = `${budget.user_id}:${categoryId}`
      categoryRollovers.set(key, (categoryRollovers.get(key) ?? 0) + leftover)
    }

    results.push({
      wallet_id: budget.wallet_id,
      account_id: budget.account_id,
      rollover_amount: leftover,
      category_id: categoryId,
      category_name: null,
      category_status: categoryId ? 'assigned' : 'manual_selection_required',
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
      return NextResponse.json({ error: currentCategoryError.message }, { status: 500 })
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
      return NextResponse.json({ error: categoryBudgetError.message }, { status: 500 })
    }
  }

  const categoryIds = Array.from(new Set(results.flatMap((result) => result.category_id ? [result.category_id] : [])))
  if (categoryIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]))
    for (const result of results) {
      result.category_name = result.category_id ? categoryNames.get(result.category_id) ?? null : null
    }
  }

  return NextResponse.json({ ok: true, month: currentMonth, processed: results.length, results })
}
