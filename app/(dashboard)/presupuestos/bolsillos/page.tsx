import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateWalletBudgetThreshold } from '@/lib/actions/budgets'
import { currentYearMonth, yearMonthToDate } from '@/lib/date-utils'
import { MonthSelector } from '@/components/MonthSelector'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-20 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoBolsillosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const yearMonth = month ?? currentYearMonth()
  const periodMonth = yearMonthToDate(yearMonth)

  const supabase = await createClient()

  const [{ data: wallets }, { data: budgets }, summary] = await Promise.all([
    supabase.from('wallets').select('id, name').eq('is_active', true).order('name'),
    supabase.from('wallet_budgets').select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  const budgetByWallet = new Map((budgets ?? []).map((b) => [b.wallet_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por bolsillo</h1>
      <p className="mt-1 text-sm text-ledger-muted">Se asigna registrando un Ingreso en Transacciones con ese bolsillo.</p>
      <div className="mt-3"><MonthSelector yearMonth={yearMonth} basePath="/presupuestos/bolsillos" /></div>

      <div className="mt-8 space-y-4">
        {(wallets ?? []).map((wallet) => {
          const budget = budgetByWallet.get(wallet.id)
          const total = Number(budget?.total_budget ?? 0)
          const spent = summary.gastoByWallet.get(wallet.id) ?? 0
          const threshold = budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined
          const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
          const isOverBudget = total > 0 && spent >= total
          const isOverThreshold = !isOverBudget && threshold !== undefined && total > 0 && (spent / total) * 100 >= threshold

          return (
            <div key={wallet.id} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">{wallet.name}</p>
                <p className={isOverBudget ? 'text-sm text-red-700' : isOverThreshold ? 'text-sm text-amber-700' : 'text-sm text-ledger-muted'}>
                  {formatCOP(spent)} / {formatCOP(total)}
                </p>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ledger-muted">
                Asignado: {formatCOP(Number(budget?.assigned_amount ?? 0))} · Sobrante: {formatCOP(Number(budget?.rollover_amount ?? 0))}
              </p>
              {isOverBudget && <p className="mt-2 text-xs text-red-700">Gastaste el presupuesto de este bolsillo.</p>}
              {isOverThreshold && <p className="mt-2 text-xs text-amber-700">Cruzaste el umbral de alerta ({threshold}%). ¡Ten cuidado!</p>}
              {total === 0 && <p className="mt-1 text-xs text-ledger-muted">Sin Ingreso registrado para este bolsillo este mes.</p>}

              <form action={updateWalletBudgetThreshold} className="mt-3 flex items-end gap-3">
                <input type="hidden" name="wallet_id" value={wallet.id} />
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Alerta al gastar (%)</label>
                  <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} />
                </div>
                <button type="submit" className="rounded-sm bg-ledger-green px-3 py-1.5 text-xs font-medium text-white hover:bg-ledger-green/90">Guardar</button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}