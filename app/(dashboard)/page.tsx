import { createClient } from '@/lib/supabase/server'
import { getMonthSummary, getPendingReviewCount } from '@/lib/data/dashboard'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function periodToMonthStart(period?: string) {
  if (!period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)) return firstDayOfMonth()
  return `${period}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const monthStart = periodToMonthStart(filters.period)
  const selectedPeriod = monthStart.slice(0, 7)

  const [
    { data: categories },
    { data: wallets },
    { data: accounts },
    { data: categoryBudgets },
    { data: walletBudgets },
    summary,
    pendingCount,
  ] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true),
    supabase.from('wallets').select('id, name').eq('is_active', true),
    supabase.from('accounts').select('id, name, is_active').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, amount, alert_threshold_percent').eq('period_month', monthStart),
    supabase.from('wallet_budgets').select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', monthStart),
    getMonthSummary(supabase, monthStart),
    getPendingReviewCount(supabase),
  ])

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const walletNameById = new Map((wallets ?? []).map((w) => [w.id, w.name]))
  const quickActions = [
    {
      href: `/transacciones?period=${selectedPeriod}`,
      label: 'Transacciones',
      value: formatCOP(summary.balance),
      detail: 'Balance del periodo',
      accent: 'border-ledger-green/40 bg-ledger-green/5 text-ledger-green',
    },
    {
      href: '/presupuestos/categorias',
      label: 'Presupuestos',
      value: `${(categoryBudgets ?? []).length + (walletBudgets ?? []).length}`,
      detail: 'Asignaciones activas',
      accent: 'border-amber-400/40 bg-amber-50 text-amber-700',
    },
    {
      href: '/transacciones/ocr',
      label: 'Factura OCR',
      value: 'OCR',
      detail: 'Registro desde factura',
      accent: 'border-sky-400/40 bg-sky-50 text-sky-700',
    },
    {
      href: '/correo',
      label: 'Email sync',
      value: pendingCount > 0 ? String(pendingCount) : 'OK',
      detail: pendingCount > 0 ? 'Movimientos por revisar' : 'Correo bancario',
      accent: pendingCount > 0
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-black/10 bg-white text-ledger-text',
    },
  ]

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ledger-text">Resumen del mes</h1>
          <p className="mt-1 text-sm text-ledger-muted">
            {new Date(monthStart + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <form method="get" className="flex flex-wrap items-end gap-2 rounded-sm border border-black/10 bg-white p-3">
            <div className="min-w-40">
              <label className="block text-xs text-ledger-muted">Mes y año</label>
              <input type="month" name="period" defaultValue={selectedPeriod} className={`${inputClass} mt-1 w-full`} />
            </div>
            <button type="submit" className="btn btn-primary">
              Filtrar
            </button>
            <a href="/" className="btn btn-secondary">
              Actual
            </a>
          </form>
          {pendingCount > 0 && (
            <a href="/revision" className="btn btn-secondary">
              {pendingCount} por revisar
            </a>
          )}
        </div>
      </header>

      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group rounded-sm border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-ledger-green/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ledger-green/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ledger-text">{action.label}</p>
                  <p className="mt-1 text-xs text-ledger-muted">{action.detail}</p>
                </div>
                <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${action.accent}`}>
                  {action.value}
                </span>
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-black/5">
                <div className="h-full w-1/3 rounded-full bg-ledger-green transition-all group-hover:w-full" />
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label="Ingresos" value={summary.totals.ingreso} />
        <SummaryStat label="Gastos" value={summary.totals.gasto} />
        <SummaryStat label="Ahorro" value={summary.totals.ahorro} />
        <SummaryStat label="Balance" value={summary.balance} emphasize />
      </section>

      <section>
        <h2 className="font-serif text-lg text-ledger-text">Presupuesto por categoría</h2>
        <div className="mt-4 space-y-3">
          {(categoryBudgets ?? []).map((budget) => (
            <BudgetBar
              key={budget.category_id}
              label={categoryNameById.get(budget.category_id) ?? 'Categoría'}
              spent={summary.gastoByCategory.get(budget.category_id) ?? 0}
              total={Number(budget.amount)}
              alertThreshold={budget.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
            />
          ))}
          {(categoryBudgets ?? []).length === 0 && (
            <p className="text-sm text-ledger-muted">Aún no has asignado presupuesto por categoría este mes.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg text-ledger-text">Bolsillos</h2>
        <div className="mt-4 space-y-3">
          {(walletBudgets ?? []).map((budget) => (
            <BudgetBar
              key={budget.wallet_id}
              label={walletNameById.get(budget.wallet_id) ?? 'Bolsillo'}
              spent={summary.gastoByWallet.get(budget.wallet_id) ?? 0}
              total={Number(budget.total_budget)}
              alertThreshold={budget.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
              detail={`Asignado ${formatCOP(Number(budget.assigned_amount))} + Sobrante ${formatCOP(Number(budget.rollover_amount))}`}
            />
          ))}
          {(walletBudgets ?? []).length === 0 && (
            <p className="text-sm text-ledger-muted">Aún no has asignado presupuesto a ningún bolsillo este mes.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg text-ledger-text">Estado de cuentas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(accounts ?? []).map((account) => {
            const accountSummary = summary.accountById.get(account.id)
            const income = accountSummary?.ingreso ?? 0
            const outflow = accountSummary?.outflow ?? 0
            const balance = accountSummary?.balance ?? 0

            return (
              <div key={account.id} className="rounded-sm border border-black/10 bg-white p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ledger-text">{account.name}</p>
                  <p className={balance >= 0 ? 'text-sm text-ledger-green' : 'text-sm text-red-700'}>
                    {formatCOP(balance)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-ledger-muted">Ingresos</p>
                    <p className="mt-0.5 text-ledger-text">{formatCOP(income)}</p>
                  </div>
                  <div>
                    <p className="text-ledger-muted">Salidas</p>
                    <p className="mt-0.5 text-ledger-text">{formatCOP(outflow)}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {(accounts ?? []).length === 0 && (
            <p className="text-sm text-ledger-muted">No hay cuentas activas para mostrar.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryStat({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className="rounded-sm border border-black/10 bg-white px-4 py-3">
      <p className="text-xs text-ledger-muted">{label}</p>
      <p className={`mt-1 text-lg ${emphasize ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
    </div>
  )
}

function BudgetBar({ label, spent, total, alertThreshold, detail }: {
  label: string; spent: number; total: number; alertThreshold?: number; detail?: string
}) {
  const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  const isOverThreshold = alertThreshold !== undefined && total > 0 && (spent / total) * 100 >= alertThreshold
  const isOverBudget = total > 0 && spent > total

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ledger-text">{label}</span>
        <span className={isOverBudget ? 'text-red-700' : 'text-ledger-muted'}>
          {formatCOP(spent)} / {formatCOP(total)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-ledger-muted">{detail}</p>}
    </div>
  )
}
