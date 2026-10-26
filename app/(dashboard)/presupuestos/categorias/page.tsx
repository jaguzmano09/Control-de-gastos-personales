import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateCategoryBudgetThreshold } from '@/lib/actions/budgets'
import { currentYearMonth, yearMonthToDate } from '@/lib/date-utils'
import { MonthSelector } from '@/components/MonthSelector'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-20 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoCategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const yearMonth = month ?? currentYearMonth()
  const periodMonth = yearMonthToDate(yearMonth)

  const supabase = await createClient()

  const [{ data: categories }, { data: budgets }, summary] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, amount, rollover_amount, alert_threshold_percent').eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  const budgetByCategory = new Map((budgets ?? []).map((b) => [b.category_id, b]))

  return (
    <div className="max-w-5xl">
      <header className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_12px_35px_rgba(23,35,31,0.07)]">
        <div className="bg-gradient-to-br from-ledger-green via-[#347957] to-[#1f5239] px-5 py-6 text-white sm:px-7 sm:py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Planificación mensual</p>
          <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Presupuesto por categoría</h1>
          <p className="mt-1 text-sm text-white/75">Controla gastos, ahorros y saldo restante sin perder el contexto del mes.</p>
        </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/5 bg-white px-5 py-4 sm:px-7">
          <p className="text-sm text-ledger-muted">Consulta el desempeño de cada categoría.</p>
          <MonthSelector yearMonth={yearMonth} basePath="/presupuestos/categorias" />
        </div>
      </header>

      <div className="mt-7 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="grid divide-y divide-black/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryCard label="Categorías" value={(categories ?? []).length.toString()} detail="activas" />
          <SummaryCard label="Con presupuesto" value={(budgets ?? []).length.toString()} detail="este mes" />
          <SummaryCard label="Con alertas" value={(budgets ?? []).filter((budget) => budget.alert_threshold_percent !== null).length.toString()} detail="configuradas" />
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {(categories ?? []).map((category) => {
          const budget = budgetByCategory.get(category.id)
          const assigned = Number(budget?.amount ?? 0)
          const rollover = Number(budget?.rollover_amount ?? 0)
          const totalBudget = assigned + rollover
          const movement = summary.gastoByCategory.get(category.id) ?? 0
          const gastoNormal = summary.gastoNormalByCategory.get(category.id) ?? 0
          const ahorroIngreso = summary.ahorroIngresoByCategory.get(category.id) ?? 0
          const ahorroRetiro = summary.ahorroRetiroByCategory.get(category.id) ?? 0
          const spent = Math.max(0, -movement)
          const remaining = totalBudget + movement
          const threshold = budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined
          const percent = totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 100) : 0
          const isOverBudget = totalBudget > 0 && spent >= totalBudget
          const isOverThreshold = !isOverBudget && threshold !== undefined && totalBudget > 0 && (spent / totalBudget) * 100 >= threshold

          return (
            <div key={category.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(23,35,31,0.05)]">
              <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-gradient-to-br from-white via-white to-ledger-green/5 p-5">
                <div>
                  <p className="text-base font-semibold text-ledger-text">{category.name}</p>
                  <p className="mt-1 text-xs text-ledger-muted">{totalBudget > 0 ? `${percent.toFixed(0)}% utilizado` : 'Sin presupuesto asignado'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${remaining >= 0 ? 'text-ledger-green' : 'text-red-700'}`}>{formatCOP(remaining)}</p>
                  <p className="text-[11px] text-ledger-muted">restante</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ledger-muted">Movimiento del mes</span>
                  <span className={isOverBudget ? 'font-medium text-red-700' : isOverThreshold ? 'font-medium text-amber-700' : 'font-medium text-ledger-text'}>
                  Movimiento: {formatCOP(movement)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5">
                  <div
                    className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                <Metric label="Presupuesto" value={assigned} />
                <Metric label="Sobrante" value={rollover} />
                <Metric label="Ahorro ingresado" value={ahorroIngreso} positive />
                <Metric label="Gastos" value={gastoNormal} />
                <Metric label="Retiros de ahorro" value={ahorroRetiro} />
                </div>
              {isOverBudget && <p className="mt-2 text-xs text-red-700">Superaste el presupuesto de esta categoría.</p>}
              {isOverThreshold && <p className="mt-2 text-xs text-amber-700">Cruzaste el umbral de alerta ({threshold}%).</p>}
              {totalBudget === 0 && <p className="mt-2 text-xs text-ledger-muted">Sin presupuesto ni sobrante para esta categoría este mes.</p>}

              <form action={updateCategoryBudgetThreshold} className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-black/5 pt-4">
                <input type="hidden" name="category_id" value={category.id} />
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Alerta al gastar (%)</label>
                  <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Guardar alerta</button>
              </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ledger-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ledger-text">{value}</p>
      <p className="mt-1 text-xs text-ledger-muted">{detail}</p>
    </div>
  )
}

function Metric({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="rounded-sm bg-black/[0.03] px-2 py-1.5">
      <p className="text-ledger-muted">{label}</p>
      <p className={`mt-0.5 ${positive ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
    </div>
  )
}