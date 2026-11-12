import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addEstimatedYieldToExpenseStatuses, getExpenseLocationStatuses } from '@/lib/data/expense-location-status'
import { getMonthSummary } from '@/lib/data/dashboard'
import { yearMonthToDate } from '@/lib/date-utils'
import { EditTransaccionForm } from './EditTransaccionForm'

export default async function TransaccionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: transaction } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle()
  if (!transaction) notFound()

  const periodMonth = yearMonthToDate(transaction.occurred_at.slice(0, 7))
  const [{ data: categories }, { data: accounts }, { data: wallets }, locationStatusesRaw, summary] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name, category_id, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id, category_id').eq('is_active', true).order('name'),
    getExpenseLocationStatuses(supabase, periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])
  const locationStatuses = addEstimatedYieldToExpenseStatuses(locationStatusesRaw, summary)

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl text-ledger-text">Editar transacción</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      <EditTransaccionForm
        transaction={transaction}
        categories={categories ?? []}
        accounts={accounts ?? []}
        wallets={wallets ?? []}
        initialPeriodMonth={periodMonth}
        locationStatuses={locationStatuses}
        error={error}
      />
    </div>
  )
}
