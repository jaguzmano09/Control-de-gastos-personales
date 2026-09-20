import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionForm } from './NuevaTransaccionForm'

export default async function NuevaTransaccionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: accounts }, { data: wallets }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl text-ledger-text">Nueva transacción</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      <NuevaTransaccionForm
        categories={categories ?? []}
        accounts={accounts ?? []}
        wallets={wallets ?? []}
        error={error}
      />
    </div>
  )
}