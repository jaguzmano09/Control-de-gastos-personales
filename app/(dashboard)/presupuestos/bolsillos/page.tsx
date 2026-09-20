import { createClient } from '@/lib/supabase/server'
import { upsertWalletBudget } from '@/lib/actions/budgets'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function PresupuestoBolsillosPage() {
  const supabase = await createClient()
  const periodMonth = firstDayOfMonth()

  const [{ data: wallets }, { data: budgets }] = await Promise.all([
    supabase.from('wallets').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('wallet_budgets')
      .select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent')
      .eq('period_month', periodMonth),
  ])

  const budgetByWallet = new Map((budgets ?? []).map((b) => [b.wallet_id, b]))

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por bolsillo</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        {new Date(periodMonth + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      <div className="mt-8 space-y-4">
        {(wallets ?? []).map((wallet) => {
          const budget = budgetByWallet.get(wallet.id)
          return (
            <div key={wallet.id} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">{wallet.name}</p>
                {budget && (
                  <p className="text-xs text-ledger-muted">
                    Sobrante del mes anterior: {formatCOP(Number(budget.rollover_amount))}
                  </p>
                )}
              </div>

              <form action={upsertWalletBudget} className="mt-3 grid grid-cols-[auto_auto_auto] items-end gap-3">
                <input type="hidden" name="wallet_id" value={wallet.id} />
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Asignación de este mes</label>
                  <input type="number" name="assigned_amount" min="0" step="1000" defaultValue={budget?.assigned_amount ?? ''} required className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-ledger-muted">Alerta (%)</label>
                  <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} />
                </div>
                <button type="submit" className="rounded-sm bg-ledger-green px-3 py-1.5 text-sm font-medium text-white hover:bg-ledger-green/90">
                  Guardar
                </button>
              </form>

              {budget && (
                <p className="mt-2 text-xs text-ledger-muted">
                  Total disponible este mes: {formatCOP(Number(budget.total_budget))}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}