import { createClient } from '@/lib/supabase/server'
import { getMonthSummary, getPendingReviewCount } from '@/lib/data/dashboard'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default async function DashboardHomePage() {
  const supabase = await createClient()
  const monthStart = firstDayOfMonth()

  const [
    { data: categories },
    { data: wallets },
    { data: categoryBudgets },
    { data: walletBudgets },
    summary,
    pendingCount,
  ] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true),
    supabase.from('wallets').select('id, name').eq('is_active', true),
    supabase.from('category_budgets').select('category_id, amount, alert_threshold_percent').eq('period_month', monthStart),
    supabase.from('wallet_budgets').select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', monthStart),
    getMonthSummary(supabase, monthStart),
    getPendingReviewCount(supabase),
  ])

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const walletNameById = new Map((wallets ?? []).map((w) => [w.id, w.name]))

  return (
    <div className="space-y-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ledger-text">Resumen del mes</h1>
          <p className="mt-1 text-sm text-ledger-muted">
            {new Date(monthStart + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        {pendingCount > 0 && (
          <a href="/revision" className="rounded-sm border border-ledger-green px-3 py-1.5 text-sm text-ledger-green hover:bg-ledger-green/5">
            {pendingCount} por revisar
          </a>
        )}
      </header>

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