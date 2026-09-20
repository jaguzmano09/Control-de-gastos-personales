import { createClient } from '@/lib/supabase/server'
import { upsertCategoryBudget } from '@/lib/actions/budgets'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoCategoriasPage() {
  const supabase = await createClient()
  const periodMonth = firstDayOfMonth()

  const [{ data: categories }, { data: budgets }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, amount, alert_threshold_percent').eq('period_month', periodMonth),
  ])

  const budgetByCategory = new Map((budgets ?? []).map((b) => [b.category_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por categoría</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        {new Date(periodMonth + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-4">
        {(categories ?? []).map((category) => {
          const budget = budgetByCategory.get(category.id)
          return (
            <form
              key={category.id}
              action={upsertCategoryBudget}
              className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3 rounded-sm border border-black/10 bg-white p-4"
            >
              <input type="hidden" name="category_id" value={category.id} />
              <input type="hidden" name="period_month" value={periodMonth} />
              <div>
                <label className="text-xs text-ledger-muted">Categoría</label>
                <p className="mt-1 text-sm text-ledger-text">{category.name}</p>
              </div>
              <div>
                <label className="text-xs text-ledger-muted">Presupuesto</label>
                <input type="number" name="amount" min="0" step="1000" defaultValue={budget?.amount ?? ''} required className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-ledger-muted">Alerta (%)</label>
                <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} />
              </div>
              <button type="submit" className="rounded-sm bg-ledger-green px-3 py-1.5 text-sm font-medium text-white hover:bg-ledger-green/90">
                Guardar
              </button>
            </form>
          )
        })}
      </div>
    </div>
  )
}