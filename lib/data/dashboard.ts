import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type Totals = {
  ingreso: number
  gasto: number
  ahorro: number
  inversion: number
  transferencia: number
}

type AccountSummary = Totals & {
  outflow: number
  balance: number
}

function getMonthRange(monthStart: string) {
  const [year, month] = monthStart.slice(0, 7).split('-')
  const nextMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0')
  const nextYear = month === '12' ? String(Number(year) + 1) : year

  return {
    start: `${year}-${month}-01`,
    end: `${nextYear}-${nextMonth}-01`,
  }
}

function emptyTotals(): Totals {
  return { ingreso: 0, gasto: 0, ahorro: 0, inversion: 0, transferencia: 0 }
}

function emptyAccountSummary(): AccountSummary {
  return { ...emptyTotals(), outflow: 0, balance: 0 }
}

export async function getMonthSummary(supabase: SupabaseClient<Database>, monthStart: string) {
  const { start, end } = getMonthRange(monthStart)
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, amount, category_id, wallet_id, account_id')
    .gte('occurred_at', start)
    .lt('occurred_at', end)
    .eq('status', 'confirmada')

  if (error) throw error

  const totals = emptyTotals()
  const gastoByCategory = new Map<string, number>()
  const gastoByWallet = new Map<string, number>()
  const accountById = new Map<string, AccountSummary>()

  for (const t of transactions ?? []) {
    const amount = Number(t.amount)
    const accountSummary = accountById.get(t.account_id) ?? emptyAccountSummary()

    switch (t.type) {
      case 'Ingreso': totals.ingreso += amount; break
      case 'Gasto': totals.gasto += amount; break
      case 'Ahorro': totals.ahorro += amount; break
      case 'Inversion': totals.inversion += amount; break
      case 'Transferencia': totals.transferencia += amount; break
    }

    switch (t.type) {
      case 'Ingreso': accountSummary.ingreso += amount; break
      case 'Gasto': accountSummary.gasto += amount; accountSummary.outflow += amount; break
      case 'Ahorro': accountSummary.ahorro += amount; accountSummary.outflow += amount; break
      case 'Inversion': accountSummary.inversion += amount; accountSummary.outflow += amount; break
      case 'Transferencia': accountSummary.transferencia += amount; break
    }

    accountSummary.balance = accountSummary.ingreso - accountSummary.outflow
    accountById.set(t.account_id, accountSummary)

    if (t.type === 'Gasto' && t.category_id) {
      gastoByCategory.set(t.category_id, (gastoByCategory.get(t.category_id) ?? 0) + amount)
    }
    if (t.type === 'Gasto' && t.wallet_id) {
      gastoByWallet.set(t.wallet_id, (gastoByWallet.get(t.wallet_id) ?? 0) + amount)
    }
  }

  const balance = totals.ingreso - totals.gasto - totals.ahorro - totals.inversion
  return { totals, balance, gastoByCategory, gastoByWallet, accountById }
}

export async function getPendingReviewCount(supabase: SupabaseClient<Database>) {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendiente_revision', 'duplicado'])

  if (error) throw error
  return count ?? 0
}
