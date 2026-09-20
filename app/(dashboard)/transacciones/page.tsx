import { createClient } from '@/lib/supabase/server'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const STATUS_LABEL: Record<string, string> = {
  confirmada: 'Confirmada',
  pendiente_revision: 'Pendiente',
  duplicado: 'Duplicado',
}

export default async function TransaccionesPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, occurred_at, type, description, amount, status, categories(name), accounts(name), wallets(name)')
    .order('occurred_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ledger-text">Transacciones</h1>
        <a href="/transacciones/nueva" className="rounded-sm bg-ledger-green px-4 py-2 text-sm font-medium text-white hover:bg-ledger-green/90">
          Nueva
        </a>
      </header>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-ledger-muted">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Tipo</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Cuenta / Bolsillo</th>
              <th className="py-2 pr-4">Descripción</th>
              <th className="py-2 pr-4 text-right">Monto</th>
              <th className="py-2 pr-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(transactions ?? []).map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="py-2 pr-4 text-ledger-text">{new Date(t.occurred_at + 'T00:00:00').toLocaleDateString('es-CO')}</td>
                <td className="py-2 pr-4 text-ledger-text">{t.type}</td>
                <td className="py-2 pr-4 text-ledger-text">{t.categories?.name ?? '—'}</td>
                <td className="py-2 pr-4 text-ledger-text">
                  {t.accounts?.name}{t.wallets?.name ? ` · ${t.wallets.name}` : ''}
                </td>
                <td className="py-2 pr-4 text-ledger-muted">{t.description ?? '—'}</td>
                <td className="py-2 pr-4 text-right text-ledger-text">{formatCOP(Number(t.amount))}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded-sm px-2 py-0.5 text-xs ${
                    t.status === 'confirmada' ? 'bg-ledger-green/10 text-ledger-green' :
                    t.status === 'duplicado' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
              </tr>
            ))}
            {(transactions ?? []).length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-ledger-muted">Aún no hay transacciones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}