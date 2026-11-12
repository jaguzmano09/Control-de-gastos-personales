import { createClient } from '@/lib/supabase/server'
import {
  createAccount,
  createWallet,
  createYieldConfig,
  deleteYieldRate,
  toggleAccountActive,
  toggleWalletActive,
  toggleYieldConfig,
  updateYieldRate,
} from '@/lib/actions/accounts'
import { addEstimatedYieldToExpenseStatuses, getExpenseLocationStatuses, type ExpenseLocationStatusWithYield } from '@/lib/data/expense-location-status'
import { getMonthSummary } from '@/lib/data/dashboard'
import { currentYearMonth, yearMonthToDate } from '@/lib/date-utils'
import { MonthSelector } from '@/components/MonthSelector'
import { updateWalletBudgetThreshold } from '@/lib/actions/budgets'

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Account = { id: string; name: string; category_id: string | null; has_wallets: boolean; is_active: boolean }
type Wallet = {
  id: string
  name: string
  account_id: string
  category_id: string | null
  is_active: boolean
}
type YieldConfig = {
  id: string
  account_id: string | null
  wallet_id: string | null
  start_date: string
  is_active: boolean
}
type YieldRate = { id: string; config_id: string; ea_percent: number; valid_from: string }
type MonthlyBudget = {
  wallet_id: string | null
  account_id: string | null
  assigned_amount: number
  rollover_amount: number
  total_budget: number
  alert_threshold_percent: number | null
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; month?: string }>
}) {
  const params = await searchParams
  const yearMonth = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : currentYearMonth()
  const supabase = await createClient()
  const periodMonth = yearMonthToDate(yearMonth)

  const [{ data: accountsData }, { data: walletsData }, { data: yieldConfigsData }, { data: yieldRatesData }, locationStatusesRaw, { data: budgetsData }, summary] = await Promise.all([
    supabase.from('accounts').select('id, name, category_id, has_wallets, is_active').order('name'),
    supabase.from('wallets').select('id, name, account_id, category_id, is_active').order('name'),
    supabase.from('yield_configs').select('id, account_id, wallet_id, start_date, is_active'),
    supabase.from('yield_rates').select('id, config_id, ea_percent, valid_from').order('valid_from', { ascending: false }),
    getExpenseLocationStatuses(supabase, periodMonth),
    supabase.from('wallet_budgets').select('wallet_id, account_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', periodMonth),
    getMonthSummary(supabase, periodMonth),
  ])
  const locationStatuses = addEstimatedYieldToExpenseStatuses(locationStatusesRaw, summary)
  const accounts = accountsData as Account[] | null
  const wallets = walletsData as Wallet[] | null
  const yieldConfigs = yieldConfigsData as YieldConfig[] | null
  const yieldRates = yieldRatesData as YieldRate[] | null
  const monthlyBudgets = (budgetsData ?? []) as MonthlyBudget[]
  const statusByTarget = new Map<string, ExpenseLocationStatusWithYield>(
    locationStatuses.map((status) => [`${status.location_type}:${status.location_id}`, status]),
  )
  const budgetByTarget = new Map(monthlyBudgets.map((budget) => [
    `${budget.wallet_id ? 'wallet' : 'account'}:${budget.wallet_id ?? budget.account_id}`,
    budget,
  ]))
  const configByTarget = new Map(
    (yieldConfigs ?? []).map((config) => [`${config.account_id ? 'account' : 'wallet'}:${config.account_id ?? config.wallet_id}`, config]),
  )
  const ratesByConfig = new Map<string, YieldRate[]>()
  for (const rate of yieldRates ?? []) {
    ratesByConfig.set(rate.config_id, [...(ratesByConfig.get(rate.config_id) ?? []), rate])
  }

  const walletsByAccount = new Map<string, typeof wallets>()
  for (const w of wallets ?? []) {
    const list = walletsByAccount.get(w.account_id) ?? []
    list.push(w)
    walletsByAccount.set(w.account_id, list)
  }

  return (
    <div className="max-w-5xl">
      <header className="border-b border-black/10 pb-6">
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-ledger-text sm:text-4xl">Cuentas y bolsillos</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ledger-muted">
              Administra tus cuentas, bolsillos y su presupuesto mensual en un solo lugar.
            </p>
          </div>
          <div className="rounded-2xl border border-ledger-green/15 bg-ledger-green/5 px-4 py-3 text-right">
            <p className="text-2xl font-semibold text-ledger-green">{(accounts ?? []).length}</p>
            <p className="text-xs text-ledger-muted">cuentas registradas</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ledger-muted">Disponible incluye movimientos del mes y rendimiento estimado.</p>
          <MonthSelector yearMonth={yearMonth} basePath="/cuentas" />
        </div>
      </header>

      {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(params.error)}</p>}
      {params.success && <p role="status" className="mt-5 rounded-xl border border-ledger-green/20 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">{decodeURIComponent(params.success)}</p>}

      <div className="mt-7 space-y-5">
        {(accounts ?? []).map((account) => (
          <section key={account.id} className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(23,35,31,0.05)] ${!account.is_active ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/5 bg-gradient-to-br from-white via-white to-ledger-green/5 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ledger-green text-lg font-semibold text-white">
                  {account.name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ledger-text">{account.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${account.is_active ? 'bg-ledger-green/10 text-ledger-green' : 'bg-black/5 text-ledger-muted'}`}>
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ledger-muted">
                    {account.has_wallets ? 'El saldo se organiza por bolsillos' : 'El saldo pertenece directamente a esta cuenta'}
                  </p>
                  {!account.has_wallets && <LocationSummary status={statusByTarget.get(`account:${account.id}`)} budget={budgetByTarget.get(`account:${account.id}`)} locationId={account.id} spent={summary.accountById.get(account.id)?.gasto ?? 0} transferMovement={(summary.accountById.get(account.id)?.transferIn ?? 0) - (summary.accountById.get(account.id)?.transferOut ?? 0)} yieldAmount={summary.yieldByAccount.get(account.id) ?? 0} periodMonth={periodMonth} isActive={account.is_active} />}
                </div>
              </div>
              <form action={toggleAccountActive}>
                <input type="hidden" name="id" value={account.id} />
                <input type="hidden" name="is_active" value={(!account.is_active).toString()} />
                <button type="submit" className="btn btn-secondary btn-sm">
                  {account.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                </button>
              </form>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {account.has_wallets && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ledger-text">Bolsillos</h3>
                      <p className="mt-0.5 text-xs text-ledger-muted">{(walletsByAccount.get(account.id) ?? []).length} destinos dentro de esta cuenta</p>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-ledger-muted">Distribución interna</span>
                  </div>
                  <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/5">
                  {(walletsByAccount.get(account.id) ?? []).map((wallet) => {
                    const config = configByTarget.get(`wallet:${wallet.id}`)
                    return (
                      <li key={wallet.id} className={`bg-white px-4 py-3 ${!wallet.is_active ? 'bg-black/[0.02]' : ''}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-ledger-green" />
                            <span className={`text-sm font-medium ${!wallet.is_active ? 'text-ledger-muted line-through' : 'text-ledger-text'}`}>{wallet.name}</span>
                            {!wallet.is_active && <span className="text-[11px] text-ledger-muted">Inactivo</span>}
                          </div>
                          <form action={toggleWalletActive}>
                            <input type="hidden" name="id" value={wallet.id} />
                            <input type="hidden" name="is_active" value={(!wallet.is_active).toString()} />
                            <button type="submit" className="btn-link btn-sm">
                              {wallet.is_active ? 'Desactivar' : 'Reactivar'}
                            </button>
                          </form>
                        </div>
                        <YieldSettings
                          targetId={wallet.id}
                          targetType="wallet"
                          config={config}
                          rates={config ? ratesByConfig.get(config.id) ?? [] : []}
                        />
                        <LocationSummary status={statusByTarget.get(`wallet:${wallet.id}`)} budget={budgetByTarget.get(`wallet:${wallet.id}`)} locationId={wallet.id} walletId={wallet.id} spent={summary.gastoByWallet.get(wallet.id) ?? 0} transferMovement={summary.transferByWallet.get(wallet.id) ?? 0} yieldAmount={summary.yieldByWallet.get(wallet.id) ?? 0} periodMonth={periodMonth} isActive={wallet.is_active} />
                      </li>
                    )
                  })}
                  </ul>
                </div>
              )}
              <form action={createWallet} className="mt-5 flex flex-col gap-2 rounded-xl border border-dashed border-ledger-green/30 bg-ledger-green/[0.03] p-3 sm:flex-row">
                <input type="hidden" name="account_id" value={account.id} />
                <input name="name" placeholder="Nombre del nuevo bolsillo" required className={`${inputClass} mt-0 flex-1`} />
                <button type="submit" className="btn btn-primary btn-sm shrink-0">
                  {account.has_wallets ? 'Agregar' : 'Crear bolsillo'}
                </button>
              </form>
            </div>

            {!account.has_wallets && (
              <YieldSettings
                targetId={account.id}
                targetType="account"
                config={configByTarget.get(`account:${account.id}`)}
                rates={configByTarget.get(`account:${account.id}`) ? ratesByConfig.get(configByTarget.get(`account:${account.id}`)!.id) ?? [] : []}
              />
            )}
          </section>
        ))}
      </div>

      <section className="mt-7 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-green/10 text-xl text-ledger-green">+</div>
          <div>
            <h2 className="text-base font-semibold text-ledger-text">Agregar una cuenta</h2>
            <p className="mt-1 text-xs leading-5 text-ledger-muted">Crea una nueva cuenta y define desde el inicio si manejará bolsillos.</p>
          </div>
        </div>
        <form action={createAccount} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="text-xs font-medium text-ledger-muted">
            Nombre de la cuenta
            <input name="name" required className={inputClass} placeholder="Ej. Banco principal" />
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs text-ledger-muted">
            <input type="checkbox" name="has_wallets" value="true" />
            Crear con bolsillos
          </label>
          <button type="submit" className="btn btn-primary">Crear cuenta</button>
        </form>
      </section>
    </div>
  )
}

function LocationSummary({
  status,
  budget,
  locationId,
  walletId,
  spent,
  transferMovement,
  yieldAmount,
  periodMonth,
  isActive,
}: {
  status?: ExpenseLocationStatusWithYield
  budget?: MonthlyBudget
  locationId: string
  walletId?: string
  spent: number
  transferMovement: number
  yieldAmount: number
  periodMonth: string
  isActive: boolean
}) {
  const periodLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${periodMonth}T00:00:00Z`))
  const assigned = Number(budget?.assigned_amount ?? 0)
  const rollover = Number(budget?.rollover_amount ?? 0)
  const total = Number(budget?.total_budget ?? assigned + rollover)
  const available = total - spent + transferMovement + yieldAmount
  const threshold = budget?.alert_threshold_percent === null || budget?.alert_threshold_percent === undefined
    ? undefined
    : Number(budget.alert_threshold_percent)
  const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  const state = !isActive
    ? { label: 'Inactiva', classes: 'bg-black/5 text-ledger-muted' }
    : !status?.category_id
      ? { label: 'Sin categoría', classes: 'bg-amber-100 text-amber-900' }
      : total <= 0
        ? { label: 'Sin presupuesto', classes: 'bg-amber-100 text-amber-900' }
        : available < 0
          ? { label: 'Sobre presupuesto', classes: 'bg-red-100 text-red-800' }
          : { label: 'Lista para gastos', classes: 'bg-ledger-green/10 text-ledger-green' }

  return (
    <section aria-label={`Estado de ${status?.location_name ?? 'la cuenta o bolsillo'}`} className="mt-4 max-w-2xl border-y border-black/[0.07]">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ledger-muted">Categoría asignada</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ledger-text">{status?.category_name ?? 'Sin asignar'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${state.classes}`}>{state.label}</span>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-black/[0.06] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <SummaryMetric label={`Presupuesto · ${periodLabel}`} value={total} />
        <SummaryMetric label="Gastado" value={spent} />
        <SummaryMetric label="Mov. transferencias" value={transferMovement} />
        <SummaryMetric label="Rendimiento estimado" value={yieldAmount} />
        <SummaryMetric label="Disponible" value={available} emphasized />
        <SummaryMetric label="Uso del presupuesto" value={percent} percent />
      </dl>

      <p className="border-t border-black/[0.06] py-2.5 text-xs text-ledger-muted">
        Asignado {formatCOP(assigned)} · Sobrante {formatCOP(rollover)}
        {threshold !== undefined ? ` · Alerta ${threshold}%` : ''}
      </p>
      {total > 0 && (
        <div className="pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
            <div className={`h-full rounded-full ${available < 0 ? 'bg-red-700' : threshold !== undefined && percent >= threshold ? 'bg-amber-500' : 'bg-ledger-green'}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {!status?.category_id && <p className="border-t border-black/[0.06] py-2.5 text-xs leading-5 text-ledger-muted">La categoría y el presupuesto se asignan al registrar un ingreso o una transferencia.</p>}
      {status?.category_id && total <= 0 && <p className="border-t border-black/[0.06] py-2.5 text-xs leading-5 text-ledger-muted">Asigna el presupuesto con un ingreso o recibe una transferencia en este destino.</p>}
      {status?.category_id && <form action={updateWalletBudgetThreshold} className="flex flex-wrap items-end gap-3 border-t border-black/[0.06] py-3">
        {walletId ? <input type="hidden" name="wallet_id" value={walletId} /> : <input type="hidden" name="account_id" value={locationId} />}
        <input type="hidden" name="period_month" value={periodMonth} />
        <label className="text-xs text-ledger-muted">Alerta al gastar (%)
          <input type="number" name="alert_threshold_percent" min="0" max="100" step="1" defaultValue={threshold ?? 80} className="ml-2 w-20 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green" />
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">Guardar alerta</button>
      </form>}
    </section>
  )
}

function SummaryMetric({ label, value, emphasized = false, percent = false }: { label: string; value: number; emphasized?: boolean; percent?: boolean }) {
  return <div className="min-w-0 px-3 py-3">
    <dt className="truncate text-[10px] font-medium text-ledger-muted">{label}</dt>
    <dd className={`mt-1 truncate text-sm font-semibold tabular-nums ${emphasized ? value < 0 ? 'text-red-700' : 'text-ledger-green' : 'text-ledger-text'}`}>
      {percent ? `${value.toFixed(0)}%` : formatCOP(value)}
    </dd>
  </div>
}

function YieldSettings({
  targetId,
  targetType,
  config,
  rates,
}: {
  targetId: string
  targetType: 'account' | 'wallet'
  config?: YieldConfig
  rates: YieldRate[]
}) {
  return (
    <details className="mt-4 overflow-hidden rounded-xl border border-amber-200/70 bg-amber-50/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ledger-text marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-sm text-amber-700">%</span>
            Alto rendimiento
          </span>
          <span className="text-xs font-normal text-ledger-muted">{config ? (config.is_active ? 'Activo' : 'Pausado') : 'Sin configurar'}</span>
        </span>
      </summary>
      <div className="border-t border-amber-200/60 bg-white/70 px-4 py-4">
        {!config ? (
          <form action={createYieldConfig} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name={`${targetType}_id`} value={targetId} />
            <label className="text-xs font-medium text-ledger-muted">
              Tasa E.A. (%)
              <input name="ea_percent" type="number" min="0" max="100" step="0.0001" required className={inputClass} />
            </label>
            <label className="text-xs font-medium text-ledger-muted">
              Vigente desde
              <input name="start_date" type="date" required className={inputClass} />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Activar</button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ledger-muted">
                {config.is_active ? 'Generando rendimiento' : 'Rendimiento pausado'} · Desde {config.start_date}
              </span>
              <form action={toggleYieldConfig}>
                <input type="hidden" name="config_id" value={config.id} />
                <input type="hidden" name="is_active" value={(!config.is_active).toString()} />
                <button type="submit" className="btn-link btn-sm">
                  {config.is_active ? 'Pausar' : 'Activar'}
                </button>
              </form>
            </div>
            <ul className="mt-3 divide-y divide-black/5 overflow-hidden rounded-lg border border-black/5 bg-white text-xs text-ledger-muted">
              {rates.map((rate, index) => (
                <li key={rate.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs">{index === 0 ? 'Tasa vigente' : 'Tasa histórica'}</span>
                    <div className="flex items-center gap-1">
                      <details className="w-full">
                        <summary className="btn-link btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">Editar</summary>
                        <form action={updateYieldRate} className="mt-2 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                          <input type="hidden" name="rate_id" value={rate.id} />
                          <label className="text-xs text-ledger-muted">
                            Tasa E.A. (%)
                            <input name="ea_percent" type="number" min="0" max="100" step="0.0001" defaultValue={rate.ea_percent} required className={inputClass} />
                          </label>
                          <label className="text-xs text-ledger-muted">
                            Vigente desde
                            <input name="valid_from" type="date" min={config.start_date} defaultValue={rate.valid_from} required className={inputClass} />
                          </label>
                          <button type="submit" className="btn btn-secondary btn-sm">Guardar</button>
                        </form>
                      </details>
                      <form action={deleteYieldRate}>
                        <input type="hidden" name="rate_id" value={rate.id} />
                        <button type="submit" className="btn-link-danger btn-sm">Eliminar</button>
                      </form>
                    </div>
                  </div>
                  <div className="mt-2 font-medium text-ledger-text">E.A. {Number(rate.ea_percent).toFixed(4)}% · {rate.valid_from}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  )
}
