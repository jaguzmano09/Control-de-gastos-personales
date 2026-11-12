import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/src/types/database.types'

type TransactionType = Database['public']['Enums']['transaction_type']
type TransactionStatus = Database['public']['Enums']['transaction_status']

interface Category {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
}

interface Transaction {
  id: string
  occurred_at: string
  type: string
  description: string | null
  amount: number
  status: string
  destination_account_id: string | null
  destination_wallet_id: string | null
  destination_category_id: string | null
  categories: {
    name: string
  } | null
  accounts: {
    name: string
  } | null
  wallets: {
    name: string
  } | null
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

const STATUS_LABEL: Record<string, string> = {
  confirmada: 'Confirmada',
  pendiente_revision: 'Pendiente',
  duplicado: 'Duplicado',
  descartada: 'Descartada',
}

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Ahorro', 'Inversion']

const selectClass =
  'mt-1 min-h-11 rounded-xl border border-ledger-line bg-white px-3 text-sm text-ledger-text outline-none transition hover:border-ledger-green/40 focus:border-ledger-green focus:ring-4 focus:ring-ledger-green/10'

function getMonthRange(period: string) {
  const [year, month] = period.split('-')

  const nextMonth =
    month === '12'
      ? '01'
      : String(Number(month) + 1).padStart(2, '0')

  const nextYear =
    month === '12'
      ? String(Number(year) + 1)
      : year

  return {
    start: `${year}-${month}-01`,
    end: `${nextYear}-${nextMonth}-01`,
  }
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    year?: string
    month?: string
    category_id?: string
    account_id?: string
    type?: string
    status?: string
  }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const [
    { data: rawCategories },
    { data: rawAccounts },
    { data: rawWallets },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name')
      .order('name'),

    supabase.from('wallets').select('id, name').eq('is_active', true),

    supabase
      .from('accounts')
      .select('id, name')
      .order('name'),
  ])

  const categories = (rawCategories ?? []) as Category[]
  const accounts = (rawAccounts ?? []) as Account[]

  const selectedPeriod =
    filters.period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)
      ? filters.period
      : filters.year && filters.month
        ? `${filters.year}-${filters.month}`
        : ''

  let query = supabase
    .from('transactions')
    .select(
      'id, occurred_at, type, description, amount, status, destination_account_id, destination_wallet_id, destination_category_id, categories(name), accounts(name), wallets(name)'
    )
    .order('occurred_at', { ascending: false })
    .limit(300)

  if (selectedPeriod) {
    const { start, end } = getMonthRange(selectedPeriod)

    query = query
      .gte('occurred_at', start)
      .lt('occurred_at', end)
  } else if (filters.year) {
    query = query
      .gte('occurred_at', `${filters.year}-01-01`)
      .lt(
        'occurred_at',
        `${Number(filters.year) + 1}-01-01`
      )
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id)
  }

  if (filters.type && TYPES.includes(filters.type as TransactionType)) {
    query = query.eq('type', filters.type as TransactionType)
  }

  if (filters.status && Object.hasOwn(STATUS_LABEL, filters.status)) {
    query = query.eq('status', filters.status as TransactionStatus)
  }

  const { data: rawTransactions } = await query

  const transactions = (rawTransactions ?? []) as unknown as Transaction[]
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]))
  const walletNameById = new Map((rawWallets ?? []).map((wallet) => [wallet.id, wallet.name]))
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return (
    <div className="max-w-6xl">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-ledger-green/15 bg-gradient-to-br from-[#163c2a] via-ledger-green to-[#4a9568] px-5 py-7 text-white shadow-[0_18px_42px_rgba(20,37,29,0.12)] sm:px-8 sm:py-9">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Registro financiero</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-white sm:text-4xl">Transacciones</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">Consulta, filtra y administra todos tus movimientos desde un solo lugar.</p>
        </div>
        <div className="mt-6 sm:absolute sm:right-8 sm:top-8 sm:mt-0">
          <Link href="/transacciones/nueva" className="btn border border-white/20 bg-white text-ledger-green shadow-lg hover:bg-white/90">Nueva transacción</Link>
        </div>
      </header>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-ledger-line bg-white/90 p-5 shadow-[0_10px_28px_rgba(20,37,29,0.05)]"
      >
        <div>
          <label className="block text-xs text-ledger-muted">
            Mes y año
          </label>

          <input
            type="month"
            name="period"
            defaultValue={selectedPeriod}
            className={selectClass}
          />
        </div>

        <div>
          <label className="block text-xs text-ledger-muted">
            Categoría
          </label>

          <select
            name="category_id"
            defaultValue={filters.category_id ?? ''}
            className={selectClass}
          >
            <option value="">Todas</option>

            {categories.map((c) => (
              <option
                key={c.id}
                value={c.id}
              >
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ledger-muted">
            Cuenta
          </label>

          <select
            name="account_id"
            defaultValue={filters.account_id ?? ''}
            className={selectClass}
          >
            <option value="">Todas</option>

            {accounts.map((a) => (
              <option
                key={a.id}
                value={a.id}
              >
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ledger-muted">
            Tipo
          </label>

          <select
            name="type"
            defaultValue={filters.type ?? ''}
            className={selectClass}
          >
            <option value="">Todos</option>

            {TYPES.map((t) => (
              <option
                key={t}
                value={t}
              >
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ledger-muted">
            Estado
          </label>

          <select
            name="status"
            defaultValue={filters.status ?? ''}
            className={selectClass}
          >
            <option value="">Todos</option>

            {Object.entries(STATUS_LABEL).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
        >
          Filtrar
        </button>

        <Link
          href="/transacciones"
          className="btn btn-secondary"
        >
          Limpiar
        </Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ledger-line bg-white shadow-[0_10px_28px_rgba(20,37,29,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ledger-line/70 px-5 py-4">
          <div>
            <p className="section-label">Actividad registrada</p>
            <p className="mt-1 text-sm text-ledger-muted">{transactions.length} movimientos encontrados</p>
          </div>
          <span className="rounded-full bg-ledger-green/10 px-3 py-1 text-xs font-semibold text-ledger-green">Vista detallada</span>
        </div>
        <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Tipo</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">
                Cuenta / Bolsillo
              </th>
              <th className="py-2 pr-4">Descripción</th>
              <th className="py-2 pr-4 text-right">
                Monto
              </th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="py-2 pr-4 text-ledger-text">
                  {new Date(
                    t.occurred_at + 'T00:00:00'
                  ).toLocaleDateString('es-CO')}
                </td>

                <td className="py-2 pr-4 text-ledger-text">
                  {t.type}
                </td>

                <td className="py-2 pr-4 text-ledger-text">
                  {t.categories?.name ?? '—'}
                  {t.destination_category_id && <div className="text-xs text-ledger-muted">Destino: {categoryNameById.get(t.destination_category_id) ?? 'Categoría'}</div>}
                </td>

                <td className="py-2 pr-4 text-ledger-text">
                  {t.accounts?.name}

                  {t.wallets?.name
                    ? ` · ${t.wallets.name}`
                    : ''}
                  {t.destination_account_id && <div className="text-xs text-ledger-muted">→ {accountNameById.get(t.destination_account_id) ?? 'Cuenta'}{t.destination_wallet_id ? ` · ${walletNameById.get(t.destination_wallet_id) ?? 'Bolsillo'}` : ''}</div>}
                </td>

                <td className="py-2 pr-4 text-ledger-muted">
                  {t.description ?? '—'}
                </td>

                <td className="py-2 pr-4 text-right text-ledger-text">
                  {formatCOP(Number(t.amount))}
                </td>

                <td className="py-2 pr-4">
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs ${
                      t.status === 'confirmada'
                        ? 'bg-ledger-green/10 text-ledger-green'
                        : t.status === 'duplicado'
                          ? 'bg-red-100 text-red-700'
                          : t.status === 'descartada'
                            ? 'bg-black/5 text-ledger-muted'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>

                <td className="py-2 pr-4">
                  <a
                    href={`/transacciones/${t.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Editar
                  </a>
                </td>
              </tr>
            ))}

            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center text-ledger-muted"
                >
                  No hay transacciones con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
