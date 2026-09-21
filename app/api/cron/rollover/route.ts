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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const currentMonth = currentMonthStart()
  const previousMonth = previousMonthOf(currentMonth)

  const { data: previousBudgets, error: budgetsError } = await supabase
    .from('wallet_budgets')
    .select('user_id, wallet_id, total_budget')
    .eq('period_month', previousMonth)

  if (budgetsError) {
    return NextResponse.json({ error: budgetsError.message }, { status: 500 })
  }

  const results: Array<{ wallet_id: string; rollover_amount: number }> = []

  for (const budget of previousBudgets ?? []) {
    const { data: spentRows, error: spentError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('wallet_id', budget.wallet_id)
      .eq('month', previousMonth)
      .eq('type', 'Gasto')
      .eq('status', 'confirmada')

    if (spentError) {
      return NextResponse.json({ error: spentError.message }, { status: 500 })
    }

    const spent = (spentRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
    const leftover = Math.max(Number(budget.total_budget) - spent, 0)

    const { data: existingCurrent } = await supabase
      .from('wallet_budgets')
      .select('assigned_amount')
      .eq('user_id', budget.user_id)
      .eq('wallet_id', budget.wallet_id)
      .eq('period_month', currentMonth)
      .maybeSingle()

    const { error: upsertError } = await supabase
      .from('wallet_budgets')
      .upsert(
        {
          user_id: budget.user_id,
          wallet_id: budget.wallet_id,
          period_month: currentMonth,
          assigned_amount: existingCurrent?.assigned_amount ?? 0,
          rollover_amount: leftover,
        },
        { onConflict: 'user_id,wallet_id,period_month' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    results.push({ wallet_id: budget.wallet_id, rollover_amount: leftover })
  }

  return NextResponse.json({ ok: true, month: currentMonth, processed: results.length, results })
}