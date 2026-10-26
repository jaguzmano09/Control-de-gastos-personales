import { createClient } from '@/lib/supabase/server'
import { getMonthSummary } from '@/lib/data/dashboard'
import { updateWalletBudgetThreshold } from '@/lib/actions/budgets'
import { currentYearMonth, yearMonthToDate } from '@/lib/date-utils'
import { MonthSelector } from '@/components/MonthSelector'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'mt-1 w-24 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ledger-green">Control por destino</p>
          <h1 className="mt-1 font-serif text-2xl text-ledger-text sm:text-3xl">Presupuesto por bolsillo y cuenta</h1>
          <p className="mt-1 max-w-xl text-sm text-ledger-muted">Consulta el presupuesto, el saldo real y los rendimientos de cada destino.</p>
        </div>
        <MonthSelector yearMonth={yearMonth} basePath="/presupuestos/bolsillos" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {targets.map((target) => {
          const budget = target.wallet_id ? budgetByWallet.get(target.wallet_id) : budgetByAccount.get(target.account_id!)
          const total = Number(budget?.total_budget ?? 0)
          const spent = target.spent
          const yieldAmount = target.wallet_id
            ? summary.yieldByWallet.get(target.wallet_id) ?? 0
            : summary.yieldByAccount.get(target.account_id!) ?? 0
          const currentBalance = target.wallet_id
            ? summary.balanceByWallet.get(target.wallet_id) ?? 0
            : summary.accountById.get(target.account_id!)?.balance ?? 0
          const threshold = budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined
          const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
          const isOverBudget = total > 0 && spent >= total
          const isOverThreshold = !isOverBudget && threshold !== undefined && total > 0 && (spent / total) * 100 >= threshold

          return (
            <div key={target.key} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-gradient-to-br from-ledger-green/10 via-white to-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-ledger-text">{target.label}</p>
                    {target.sublabel && <p className="mt-1 text-xs text-ledger-muted">Cuenta: {target.sublabel}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${currentBalance >= 0 ? 'text-ledger-green' : 'text-red-700'}`}>
                      {formatCOP(currentBalance)}
                    </p>
                    <p className="text-[11px] text-ledger-muted">saldo actual</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Presupuesto" value={total} />
                  <Metric label="Gastado" value={spent} negative={spent > 0} />
                  <Metric label="Rendimientos" value={yieldAmount} positive />
                  <Metric label="Disponible" value={Math.max(total - spent + yieldAmount, 0)} positive />
                </div>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="text-ledger-muted">Uso del presupuesto</span>
                  <span className={isOverBudget ? 'font-medium text-red-700' : 'font-medium text-ledger-text'}>{percent.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
                  style={{ width: `${percent}%` }}
                />
                </div>
                <p className="mt-3 text-xs text-ledger-muted">
                  Asignado: {formatCOP(Number(budget?.assigned_amount ?? 0))} · Sobrante: {formatCOP(Number(budget?.rollover_amount ?? 0))}
                </p>
                {isOverBudget && <p className="mt-3 text-xs text-red-700">Gastaste el presupuesto de este destino.</p>}
                {isOverThreshold && <p className="mt-3 text-xs text-amber-700">Cruzaste el umbral de alerta ({threshold}%).</p>}
                {total === 0 && <p className="mt-3 text-xs text-ledger-muted">Sin presupuesto asignado este mes.</p>}

                <form action={updateWalletBudgetThreshold} className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-black/5 pt-4">
                {target.wallet_id && <input type="hidden" name="wallet_id" value={target.wallet_id} />}
                {target.account_id && <input type="hidden" name="account_id" value={target.account_id} />}
                <input type="hidden" name="period_month" value={periodMonth} />
                <div>
                  <label className="text-xs text-ledger-muted">Alerta al gastar (%)</label>
                  <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={budget?.alert_threshold_percent ?? 80} className={inputClass} />
                </div>
                  <button type="submit" className="rounded-lg bg-ledger-green px-4 py-2 text-xs font-medium text-white hover:bg-ledger-green/90">Guardar alerta</button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value, positive = false, negative = false }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-xl bg-black/[0.03] px-3 py-2">
      <p className="text-[11px] text-ledger-muted">{label}</p>
      <p className={`mt-1 text-sm font-medium ${positive ? 'text-ledger-green' : negative ? 'text-red-700' : 'text-ledger-text'}`}>
        {formatCOP(value)}
      </p>
    </div>
  )
}