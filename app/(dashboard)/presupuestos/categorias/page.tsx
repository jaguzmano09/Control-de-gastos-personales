import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateCategoryBudgetThreshold } from '@/lib/actions/budgets'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-20 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoCategoriasPage() {
  const supabase = await createClient()
  const periodMonth = firstDayOfMonth()

  const [{ data: categories }, { data: budgets }, summary] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, amount, alert_threshold_percent').eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  const budgetByCategory = new Map((budgets ?? []).map((b) => [b.category_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por categoría</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        {new Date(periodMonth + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} — se asigna registrando un Ingreso en Transacciones con esa categoría.
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-4">
        {(categories ?? []).map((category) => {
          const budget = budgetByCategory.get(category.id)
          const assigned = Number(budget?.amount ?? 0)
          const spent = summary.gastoByCategory.get(category.id) ?? 0
          const percent = assigned > 0 ? Math.min((spent / assigned) * 100, 100) : 0
          const isOverBudget = assigned > 0 && spent > assigned

          return (
            <div key={category.id} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">{category.name}</p>
                <p className={isOverBudget ? 'text-sm text-red-700' : 'text-sm text-ledger-muted'}>
                  {formatCOP(spent)} / {formatCOP(assigned)}
                </p>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : 'bg-ledger-green'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {assigned === 0 && (
                <p className="mt-2 text-xs text-ledger-muted">Aún no has registrado un Ingreso para esta categoría este mes.</p>
              )}

              <form action={updateCategoryBudgetThreshold} className="mt-3 flex items-end gap-3">
                <input type="hidden" name="category_id" value={category.id} />
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Alerta al gastar (%)</label>
                  <input
                    type="number" name="alert_threshold_percent" min="0" max="100" step="1"
                    defaultValue={budget?.alert_threshold_percent ?? 80}
                    className={inputClass}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
