import { createClient } from '@/lib/supabase/server'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const STATUS_LABEL: Record<string, string> = {
  confirmada: 'Confirmada',
  pendiente_revision: 'Pendiente',
  duplicado: 'Duplicado',
  descartada: 'Descartada',
}

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Ahorro', 'Inversion']

const selectClass =
  'mt-1 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

function getMonthRange(period: string) {
  const [year, month] = period.split('-')
  const nextMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0')
  const nextYear = month === '12' ? String(Number(year) + 1) : year

  return {
    start: `${year}-${month}-01`,
    end: `${nextYear}-${nextMonth}-01`,
  }
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string; year?: string; month?: string; category_id?: string; account_id?: string; type?: string; status?: string
  }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('accounts').select('id, name').order('name'),
  ])

  const selectedPeriod =
    filters.period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)
      ? filters.period
      : filters.year && filters.month
        ? `${filters.year}-${filters.month}`
        : ''

  let query = supabase
    .from('transactions')
    .select('id, occurred_at, type, description, amount, status, categories(name), accounts(name), wallets(name)')
    .order('occurred_at', { ascending: false })
    .limit(300)

  if (selectedPeriod) {
    const { start, end } = getMonthRange(selectedPeriod)
    query = query.gte('occurred_at', start).lt('occurred_at', end)
  } else if (filters.year) {
    query = query.gte('occurred_at', `${filters.year}-01-01`).lt('occurred_at', `${Number(filters.year) + 1}-01-01`)
  }
  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.account_id) query = query.eq('account_id', filters.account_id)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.status) query = query.eq('status', filters.status)

  const { data: transactions } = await query

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ledger-text">Transacciones</h1>
        <a href="/transacciones/nueva" className="btn btn-primary">
          Nueva
        </a>
      </header>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-sm border border-black/10 bg-white p-4">
        <div>
          <label className="block text-xs text-ledger-muted">Mes y año</label>
          <input type="month" name="period" defaultValue={selectedPeriod} className={selectClass} />
        </div>
        <div>
          <label className="block text-xs text-ledger-muted">Categoría</label>
          <select name="category_id" defaultValue={filters.category_id ?? ''} className={selectClass}>
            <option value="">Todas</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ledger-muted">Cuenta</label>
          <select name="account_id" defaultValue={filters.account_id ?? ''} className={selectClass}>
            <option value="">Todas</option>
            {(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ledger-muted">Tipo</label>
          <select name="type" defaultValue={filters.type ?? ''} className={selectClass}>
            <option value="">Todos</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ledger-muted">Estado</label>
          <select name="status" defaultValue={filters.status ?? ''} className={selectClass}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
        <a href="/transacciones" className="btn btn-secondary">
          Limpiar
        </a>
      </form>

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
              <th className="py-2 pr-4"></th>
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
                    t.status === 'descartada' ? 'bg-black/5 text-ledger-muted' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <a href={`/transacciones/${t.id}`} className="btn btn-secondary btn-sm">
                    Editar
                  </a>
                </td>
              </tr>
            ))}
            {(transactions ?? []).length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-ledger-muted">No hay transacciones con esos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
