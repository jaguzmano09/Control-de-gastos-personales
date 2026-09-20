import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type Totals = {
  ingreso: number
  gasto: number
  ahorro: number
  inversion: number
  transferencia: number
}

export async function getMonthSummary(supabase: SupabaseClient<Database>, monthStart: string) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, amount, category_id, wallet_id')
    .eq('month', monthStart)
    .eq('status', 'confirmada')

  if (error) throw error

  const totals: Totals = { ingreso: 0, gasto: 0, ahorro: 0, inversion: 0, transferencia: 0 }
  const gastoByCategory = new Map<string, number>()
  const gastoByWallet = new Map<string, number>()

  for (const t of transactions ?? []) {
    const amount = Number(t.amount)
    switch (t.type) {
      case 'Ingreso': totals.ingreso += amount; break
      case 'Gasto': totals.gasto += amount; break
      case 'Ahorro': totals.ahorro += amount; break
      case 'Inversion': totals.inversion += amount; break
      case 'Transferencia': totals.transferencia += amount; break
    }
    if (t.type === 'Gasto' && t.category_id) {
      gastoByCategory.set(t.category_id, (gastoByCategory.get(t.category_id) ?? 0) + amount)
    }
    if (t.type === 'Gasto' && t.wallet_id) {
      gastoByWallet.set(t.wallet_id, (gastoByWallet.get(t.wallet_id) ?? 0) + amount)
    }
  }

  const balance = totals.ingreso - totals.gasto - totals.ahorro - totals.inversion
  return { totals, balance, gastoByCategory, gastoByWallet }
}

export async function getPendingReviewCount(supabase: SupabaseClient<Database>) {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendiente_revision', 'duplicado'])

  if (error) throw error
  return count ?? 0
}