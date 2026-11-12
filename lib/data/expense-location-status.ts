import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'
import { getMonthSummary } from '@/lib/data/dashboard'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
export type ExpenseLocationStatus = Database['public']['Functions']['get_transaction_location_status']['Returns'][number]
export type ExpenseLocationStatusWithYield = ExpenseLocationStatus & {
  estimated_yield: number
  available_with_yield: number
}
type MonthSummary = Awaited<ReturnType<typeof getMonthSummary>>

export async function getExpenseLocationStatuses(supabase: SupabaseClient, periodMonth: string) {
  const { data, error } = await supabase.rpc('get_transaction_location_status', {
    p_period_month: periodMonth,
  })
  if (error) throw error
  return (data ?? []) as ExpenseLocationStatus[]
}

export async function getExpenseLocationStatusesWithYield(supabase: SupabaseClient, periodMonth: string) {
  const [statuses, summary] = await Promise.all([
    getExpenseLocationStatuses(supabase, periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  return addEstimatedYieldToExpenseStatuses(statuses, summary)
}

export function addEstimatedYieldToExpenseStatuses(statuses: ExpenseLocationStatus[], summary: MonthSummary) {
  return statuses.map((status): ExpenseLocationStatusWithYield => {
    const estimated_yield = status.location_type === 'wallet'
      ? summary.yieldByWallet.get(status.location_id) ?? 0
      : summary.yieldByAccount.get(status.location_id) ?? 0
    return { ...status, estimated_yield, available_with_yield: status.available_amount + estimated_yield }
  })
}
