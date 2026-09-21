import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const [{ data: transaction }, { data: categories }, { data: accounts }, { data: wallets }] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
  ])

  if (!transaction) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl text-ledger-text">Editar transacción</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      <EditTransaccionForm
        transaction={transaction}
        categories={categories ?? []}
        accounts={accounts ?? []}
        wallets={wallets ?? []}
        error={error}
      />
    </div>
  )
}