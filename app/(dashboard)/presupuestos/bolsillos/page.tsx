import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateWalletBudgetThreshold } from '@/lib/actions/budgets'

interface Wallet {
  id: string
  name: string
}

interface WalletBudget {
  wallet_id: string
  assigned_amount?: number | string
  rollover_amount?: number | string
  total_budget?: number | string
  alert_threshold_percent?: number
}

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-20 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoBolsillosPage() {
  const supabase = await createClient()
  const periodMonth = firstDayOfMonth()

  const [{ data: rawWallets }, { data: rawBudgets }, summary] = await Promise.all([
    supabase.from('wallets').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('wallet_budgets')
      .select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent')
      .eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  // Desvinculamos la inferencia 'never' para ambas tablas
  const wallets = (rawWallets ?? []) as unknown as Wallet[]
  const budgets = (rawBudgets ?? []) as unknown as WalletBudget[]

  const budgetByWallet = new Map(budgets.map((b) => [b.wallet_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por bolsillo</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        {new Date(periodMonth + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} — se asigna registrando un Ingreso en Transacciones con ese bolsillo.
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-4">
        {wallets.map((wallet) => {
          const budget = budgetByWallet.get(wallet.id)
          const total = Number(budget?.total_budget ?? 0)
          const spent = summary.gastoByWallet.get(wallet.id) ?? 0
          const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
          const isOverBudget = total > 0 && spent > total

          return (
            <div key={wallet.id} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">{wallet.name}</p>
                <p className={isOverBudget ? 'text-sm text-red-700' : 'text-sm text-ledger-muted'}>
                  {formatCOP(spent)} / {formatCOP(total)}
                </p>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : 'bg-ledger-green'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-ledger-muted">
                Asignado este mes: {formatCOP(Number(budget?.assigned_amount ?? 0))} · Sobrante del mes anterior: {formatCOP(Number(budget?.rollover_amount ?? 0))}
              </p>

              {total === 0 && (
                <p className="mt-1 text-xs text-ledger-muted">Aún no has registrado un Ingreso para este bolsillo este mes.</p>
              )}

              <form action={updateWalletBudgetThreshold} className="mt-3 flex items-end gap-3">
                <input type="hidden" name="wallet_id" value={wallet.id} />
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