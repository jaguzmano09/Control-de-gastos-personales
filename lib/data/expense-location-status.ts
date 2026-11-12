import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
export type ExpenseLocationStatus = Database['public']['Functions']['get_transaction_location_status']['Returns'][number]

export async function getExpenseLocationStatuses(supabase: SupabaseClient, periodMonth: string) {
  const { data, error } = await supabase.rpc('get_transaction_location_status', {
    p_period_month: periodMonth,
  })
  if (error) throw error
  return (data ?? []) as ExpenseLocationStatus[]
}
