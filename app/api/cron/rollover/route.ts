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

  const results: Array<{ wallet_id: string | null; account_id: string | null; rollover_amount: number }> = []

  for (const budget of previousBudgets ?? []) {
    let spentQuery = supabase
      .from('transactions')
      .select('amount')
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

    results.push({ wallet_id: budget.wallet_id, account_id: budget.account_id, rollover_amount: leftover })
  }

  return NextResponse.json({ ok: true, month: currentMonth, processed: results.length, results })
}
