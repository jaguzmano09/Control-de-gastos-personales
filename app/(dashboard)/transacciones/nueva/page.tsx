import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionForm } from './NuevaTransaccionForm'

export default async function NuevaTransaccionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; occurred_at?: string; description?: string; amount?: string }>
}) {
  const { error, occurred_at, description, amount } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: accounts }, { data: wallets }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
  ])

  return (
    <div className="max-w-2xl">
      <header className="border-b border-black/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Registro financiero</p>
        <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Nueva transacción</h1>
        <p className="mt-1 text-sm text-ledger-muted">Registra un movimiento y asígnalo a la cuenta o bolsillo correspondiente.</p>
      </header>
      <NuevaTransaccionForm
        categories={categories ?? []}
        accounts={accounts ?? []}
        wallets={wallets ?? []}
        error={error}
        initialValues={{ occurredAt: occurred_at, description, amount }}
      />
    </div>
  )
}