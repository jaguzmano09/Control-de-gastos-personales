import { createClient } from '@/lib/supabase/server'
import { NuevaTransaccionForm } from './NuevaTransaccionForm'

export default async function NuevaTransaccionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; occurred_at?: string; description?: string; amount?: string; purchase_draft_id?: string }>
}) {
  const { error, occurred_at, description, amount, purchase_draft_id } = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: accounts }, { data: wallets }, { data: draft }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
    purchase_draft_id ? supabase.from('shopping_purchase_drafts').select('id, description, status, shopping_purchase_draft_lines(quantity, actual_unit_price)').eq('id', purchase_draft_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const draftTotal = (draft?.shopping_purchase_draft_lines ?? []).reduce((total: number, line: { quantity: number; actual_unit_price: number }) => total + line.quantity * line.actual_unit_price, 0)

  if (purchase_draft_id && (!draft || draft.status !== 'borrador' || draftTotal <= 0)) {
    return <div className="max-w-2xl"><p className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">El borrador de compra no está disponible.</p></div>
  }

  return (
    <div className="max-w-2xl">
      <header className="border-b border-black/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Registro financiero</p>
        <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Nueva transacción</h1>
        <p className="mt-1 text-sm text-ledger-muted">Registra un movimiento y asígnalo a la cuenta o bolsillo correspondiente.</p>
      </header>
      {draft && <p className="mt-4 rounded-sm border border-ledger-green/20 bg-ledger-green/5 p-3 text-sm">Compra consolidada: <strong>${draftTotal.toFixed(2)}</strong>. Solo se confirmará con los precios reales seleccionados.</p>}
      <NuevaTransaccionForm
        categories={categories ?? []}
        accounts={accounts ?? []}
        wallets={wallets ?? []}
        error={error}
        purchaseDraftId={purchase_draft_id}
        initialValues={{ occurredAt: occurred_at, description: draft?.description ?? description, amount: draft ? String(draftTotal) : amount }}
      />
    </div>
  )
}
