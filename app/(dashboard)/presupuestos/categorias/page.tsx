import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateCategoryBudget } from '@/lib/actions/budgets'

interface Category {
  id: string
  name: string
  type?: string
}

interface CategoryBudget {
  category_id: string
  allocated_amount?: number | string
  alert_threshold_percent?: number
}

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-28 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoCategoriasPage() {
  const supabase = await createClient()
  const periodMonth = firstDayOfMonth()

  const [{ data: rawCategories }, { data: rawBudgets }, summary] = await Promise.all([
    supabase.from('categories').select('id, name, type').order('name'),
    supabase
      .from('category_budgets')
      .select('category_id, allocated_amount, alert_threshold_percent')
      .eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  // Desvinculamos la inferencia 'never' para ambas tablas usando 'as unknown'
  const categories = (rawCategories ?? []) as unknown as Category[]
  const budgets = (rawBudgets ?? []) as unknown as CategoryBudget[]

  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por categoría</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        {new Date(periodMonth + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-4">
        {categories.map((category) => {
          const budget = budgetByCategory.get(category.id)
          const allocated = Number(budget?.allocated_amount ?? 0)
          const spent = summary.gastoByCategory?.get(category.id) ?? 0
          const percent = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0
          const isOverBudget = allocated > 0 && spent > allocated

          return (
            <div key={category.id} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">{category.name}</p>
                <p className={isOverBudget ? 'text-sm text-red-700' : 'text-sm text-ledger-muted'}>
                  {formatCOP(spent)} / {formatCOP(allocated)}
                </p>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : 'bg-ledger-green'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <form action={updateCategoryBudget} className="mt-3 flex items-end gap-3">
                <input type="hidden" name="category_id" value={category.id} />
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Presupuesto asignado</label>
                  <input
                    type="number"
                    name="allocated_amount"
                    min="0"
                    step="1000"
                    defaultValue={allocated}
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