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

type BudgetTarget = {
  key: string
  label: string
  sublabel?: string
  wallet_id: string | null
  account_id: string | null
  spent: number
}

export default async function PresupuestoBolsillosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const yearMonth = month ?? currentYearMonth()
  const periodMonth = yearMonthToDate(yearMonth)

  const supabase = await createClient()

  const [{ data: wallets }, { data: flatAccounts }, { data: budgets }, summary] = await Promise.all([
    supabase.from('wallets').select('id, name, accounts(name)').eq('is_active', true).order('name'),
    supabase.from('accounts').select('id, name').eq('is_active', true).eq('has_wallets', false).order('name'),
    supabase.from('wallet_budgets').select('wallet_id, account_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])

  const budgetByWallet = new Map((budgets ?? []).filter((b) => b.wallet_id).map((b) => [b.wallet_id as string, b]))
  const budgetByAccount = new Map((budgets ?? []).filter((b) => b.account_id).map((b) => [b.account_id as string, b]))

  const targets: BudgetTarget[] = [
    ...(wallets ?? []).map((w) => ({
      key: `wallet-${w.id}`,
      label: w.name,
      sublabel: (w as unknown as { accounts: { name: string } | null }).accounts?.name,
      wallet_id: w.id,
      account_id: null,
      spent: summary.gastoByWallet.get(w.id) ?? 0,
    })),
    ...(flatAccounts ?? []).map((a) => ({
      key: `account-${a.id}`,
      label: a.name,
      sublabel: undefined,
      wallet_id: null,
      account_id: a.id,
      spent: summary.accountById.get(a.id)?.gasto ?? 0,
    })),
  ]

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Presupuesto por bolsillo y cuenta</h1>
      <p className="mt-1 text-sm text-ledger-muted">Se asigna registrando un Ingreso en Transacciones con ese bolsillo o esa cuenta.</p>
      <div className="mt-3"><MonthSelector yearMonth={yearMonth} basePath="/presupuestos/bolsillos" /></div>

      <div className="mt-8 space-y-4">
        {targets.map((target) => {
          const budget = target.wallet_id ? budgetByWallet.get(target.wallet_id) : budgetByAccount.get(target.account_id!)
          const total = Number(budget?.total_budget ?? 0)
          const spent = target.spent
          const threshold = budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined
          const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
          const isOverBudget = total > 0 && spent >= total
          const isOverThreshold = !isOverBudget && threshold !== undefined && total > 0 && (spent / total) * 100 >= threshold

          return (
            <div key={target.key} className="rounded-sm border border-black/10 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ledger-text">
                  {target.label}
                  {target.sublabel && <span className="ml-1 text-xs text-ledger-muted">· {target.sublabel}</span>}
                </p>
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
              {total === 0 && <p className="mt-1 text-xs text-ledger-muted">Sin Ingreso registrado aquí este mes.</p>}

              <form action={updateWalletBudgetThreshold} className="mt-3 flex items-end gap-3">
                {target.wallet_id && <input type="hidden" name="wallet_id" value={target.wallet_id} />}
                {target.account_id && <input type="hidden" name="account_id" value={target.account_id} />}
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