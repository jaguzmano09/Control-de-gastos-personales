import { createClient } from '@/lib/supabase/server'
import { getMonthSummary, getPendingReviewCount } from '@/lib/data/dashboard'
import type { ReactNode } from 'react'

function firstDayOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function periodToMonthStart(period?: string) {
  if (!period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)) return firstDayOfMonth()
  return `${period}-01`
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const inputClass =
  'rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type DashboardCategory = { id: string; name: string }
type DashboardWallet = { id: string; name: string; account_id: string; accounts: { name: string } | null }
type DashboardAccount = { id: string; name: string; is_active: boolean }
type CategoryBudget = { category_id: string; amount: number; rollover_amount: number; alert_threshold_percent: number | null }
type WalletBudget = { wallet_id: string; assigned_amount: number; rollover_amount: number; total_budget: number; alert_threshold_percent: number | null }

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const monthStart = periodToMonthStart(filters.period)
  const selectedPeriod = monthStart.slice(0, 7)

  const [
    { data: categoriesData },
    { data: walletsData },
    { data: accountsData },
    { data: categoryBudgetsData },
    { data: walletBudgetsData },
    summary,
    pendingCount,
  ] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true),
    supabase.from('wallets').select('id, name, account_id, accounts(name)').eq('is_active', true),
    supabase.from('accounts').select('id, name, is_active').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, amount, rollover_amount, alert_threshold_percent').eq('period_month', monthStart),
    supabase.from('wallet_budgets').select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', monthStart).not('wallet_id', 'is', null),
    getMonthSummary(supabase, monthStart),
    getPendingReviewCount(supabase),
  ])

  const categories = categoriesData as DashboardCategory[] | null
  const wallets = walletsData as DashboardWallet[] | null
  const accounts = accountsData as DashboardAccount[] | null
  const categoryBudgets = categoryBudgetsData as CategoryBudget[] | null
  const walletBudgets = walletBudgetsData as WalletBudget[] | null

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const walletNameById = new Map((wallets ?? []).map((w) => [w.id, w.name]))
  const walletAccountNameById = new Map((wallets ?? []).map((w) => [w.id, w.accounts?.name ?? 'Cuenta']))
  const quickActions = [
    {
      href: `/transacciones?period=${selectedPeriod}`,
      label: 'Transacciones',
      value: formatCOP(summary.balance),
      detail: 'Balance del periodo',
      accent: 'border-ledger-green/40 bg-ledger-green/5 text-ledger-green',
    },
    {
      href: '/presupuestos/categorias',
      label: 'Presupuestos',
      value: `${(categoryBudgets ?? []).length + (walletBudgets ?? []).length}`,
      detail: 'Asignaciones activas',
      accent: 'border-amber-400/40 bg-amber-50 text-amber-700',
    },
    {
      href: '/transacciones/ocr',
      label: 'Factura OCR',
      value: 'OCR',
      detail: 'Registro desde factura',
      accent: 'border-sky-400/40 bg-sky-50 text-sky-700',
    },
    {
      href: '/correo',
      label: 'Email sync',
      value: pendingCount > 0 ? String(pendingCount) : 'OK',
      detail: pendingCount > 0 ? 'Movimientos por revisar' : 'Correo bancario',
      accent: pendingCount > 0
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-black/10 bg-white text-ledger-text',
    },
  ]

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ledger-muted">Panel financiero</p>
            <h1 className="mt-2 font-serif text-3xl text-ledger-text">Resumen del mes</h1>
            <p className="mt-1 capitalize text-sm text-ledger-muted">
              {new Date(monthStart + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          {pendingCount > 0 && (
            <a href="/revision" className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              {pendingCount} por revisar
            </a>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-black/5 pt-4">
          <p className="text-sm text-ledger-muted">Consulta el movimiento y el estado de tus finanzas.</p>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="min-w-40">
              <label className="block text-xs text-ledger-muted">Cambiar periodo</label>
              <input type="month" name="period" defaultValue={selectedPeriod} className={`${inputClass} mt-1 w-full`} />
            </div>
            <button type="submit" className="btn btn-primary">Filtrar</button>
            <a href="/" className="btn btn-secondary">Actual</a>
          </form>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-ledger-text">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-ledger-muted">Consulta las áreas que más utilizas.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group rounded-xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-ledger-green/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ledger-green/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ledger-text">{action.label}</p>
                  <p className="mt-1 text-xs text-ledger-muted">{action.detail}</p>
                </div>
                <span className="text-lg text-ledger-muted transition group-hover:translate-x-0.5 group-hover:text-ledger-green" aria-hidden="true">→</span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${action.accent}`}>
                  {action.value}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.15fr_2fr]">
          <div className="bg-ledger-green p-5 text-white sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/70">Balance del periodo</p>
            <p className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{formatCOP(summary.balance)}</p>
            <p className="mt-2 text-sm text-white/75">Ingresos, gastos, ahorro y sobrantes incluidos.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-black/5 sm:grid-cols-4">
            <SummaryStat label="Ingresos" value={summary.totals.ingreso} />
            <SummaryStat label="Sobrantes anteriores" value={summary.rolloverTotal} />
            <SummaryStat label="Gastos" value={summary.totals.gasto} />
            <SummaryStat label="Ahorro" value={summary.totals.ahorro} />
          </div>
        </div>
      </section>

      <details open className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-black/10 bg-white p-5 [&::-webkit-details-marker]:hidden sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ledger-green/10 text-ledger-green" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 className="font-serif text-xl text-ledger-text sm:text-2xl">Presupuesto por categoría</h2>
              <p className="mt-1 text-sm text-ledger-muted">Controla el consumo y el saldo disponible de cada categoría.</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-ledger-green/10 px-3 py-1 text-xs font-medium text-ledger-green sm:inline-flex">
            {(categoryBudgets ?? []).length} categorías
          </span>
        </summary>
        <div className="space-y-3 bg-white/40 p-4 sm:p-6">
          {(categoryBudgets ?? []).map((budget) => {
            const movement = summary.gastoByCategory.get(budget.category_id) ?? 0
            const gastoNormal = summary.gastoNormalByCategory.get(budget.category_id) ?? 0
            const ahorroIngreso = summary.ahorroIngresoByCategory.get(budget.category_id) ?? 0
            const ahorroRetiro = summary.ahorroRetiroByCategory.get(budget.category_id) ?? 0
            return (
              <BudgetCard
                key={budget.category_id}
                label={categoryNameById.get(budget.category_id) ?? 'Categoría'}
                spent={Math.max(0, -movement)}
                total={Number(budget.amount) + Number(budget.rollover_amount) + Math.max(0, movement)}
                alertThreshold={budget.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
              >
                <BudgetMetric label="Ahorro ingresado" value={ahorroIngreso} positive />
                <BudgetMetric label="Gastos" value={gastoNormal} />
                <BudgetMetric label="Retiros de ahorro" value={ahorroRetiro} />
                <BudgetMetric label="Base" value={Number(budget.amount) + Number(budget.rollover_amount)} />
              </BudgetCard>
            )
          })}
          {(categoryBudgets ?? []).length === 0 && (
            <p className="text-sm text-ledger-muted">Aún no has asignado presupuesto por categoría este mes.</p>
          )}
        </div>
      </details>

      <details open className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-black/10 bg-white p-5 [&::-webkit-details-marker]:hidden sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M5 7.5h14A1.5 1.5 0 0 1 20.5 9v8A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V9A1.5 1.5 0 0 1 5 7.5Z" />
                <path d="M16 12h4.5v3H16a1.5 1.5 0 0 1 0-3ZM6.5 7.5V6A1.5 1.5 0 0 1 8 4.5h9A1.5 1.5 0 0 1 18.5 6v1.5" />
              </svg>
            </span>
            <div>
              <h2 className="font-serif text-xl text-ledger-text sm:text-2xl">Bolsillos</h2>
              <p className="mt-1 text-sm text-ledger-muted">Consulta cuánto tienes asignado y cuánto queda disponible.</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 sm:inline-flex">
            {(wallets ?? []).length} bolsillos
          </span>
        </summary>
        <div className="space-y-3 bg-white/40 p-4 sm:p-6">
          {(wallets ?? []).filter((wallet) => summary.walletIdsWithMovement.has(wallet.id)).map((wallet) => {
            const budget = (walletBudgets ?? []).find((item) => item.wallet_id === wallet.id)
            return (
              <BudgetCard
                key={wallet.id}
                label={wallet.name}
                sublabel={wallet.accounts?.name}
                spent={summary.gastoByWallet.get(wallet.id) ?? 0}
                total={Number(budget?.total_budget ?? 0)}
                alertThreshold={budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
              >
                <BudgetMetric label="Asignado" value={Number(budget?.assigned_amount ?? 0)} />
                <BudgetMetric label="Sobrante" value={Number(budget?.rollover_amount ?? 0)} />
                <BudgetMetric label="Saldo" value={summary.balanceByWallet.get(wallet.id) ?? 0} positive />
                <BudgetMetric label="Rendimientos" value={summary.yieldByWallet.get(wallet.id) ?? 0} positive />
              </BudgetCard>
            )
          })}
          {(wallets ?? []).filter((wallet) => summary.walletIdsWithMovement.has(wallet.id)).length === 0 && (
            <p className="text-sm text-ledger-muted">No hay movimientos en bolsillos durante este periodo.</p>
          )}
        </div>
      </details>

      <details open className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-black/10 bg-white p-5 [&::-webkit-details-marker]:hidden sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M4 9h16M8 14h3M8 16.5h6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 className="font-serif text-xl text-ledger-text sm:text-2xl">Estado de cuentas</h2>
              <p className="mt-1 text-sm text-ledger-muted">Consulta el saldo y el movimiento de cada cuenta.</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 sm:inline-flex">
            {accounts?.length ?? 0} activas
          </span>
        </summary>
        <div className="bg-white/40 p-4 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-ledger-muted">Saldos disponibles y uso de entradas del periodo.</p>
          </div>
          <span className="hidden rounded-full bg-ledger-green/10 px-3 py-1 text-xs font-medium text-ledger-green sm:inline-flex">
            {accounts?.length ?? 0} activas
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(accounts ?? []).map((account) => {
            const accountSummary = summary.accountById.get(account.id)
            const income = accountSummary?.ingreso ?? 0
            const rollover = accountSummary?.rollover ?? 0
            const outflow = accountSummary?.outflow ?? 0
            const yieldAmount = accountSummary?.yield ?? 0
            const balance = (accountSummary?.ingreso ?? 0) + rollover + yieldAmount - outflow
            const availableBeforeOutflow = income + rollover + yieldAmount
            const outflowPercent = availableBeforeOutflow > 0
              ? Math.min((outflow / availableBeforeOutflow) * 100, 100)
              : 0

            return (
              <div key={account.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="border-b border-black/5 bg-gradient-to-br from-ledger-green/10 via-white to-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-green text-white shadow-sm" aria-hidden="true">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 9h18M16 14h2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ledger-text">{account.name}</p>
                        <p className="mt-0.5 text-xs text-ledger-muted">Saldo actual</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-semibold tracking-tight ${balance >= 0 ? 'text-ledger-green' : 'text-red-700'}`}>
                        {formatCOP(balance)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ledger-muted">{balance >= 0 ? 'Disponible' : 'Saldo negativo'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-black/5 p-4 text-xs">
                  <div>
                    <p className="text-ledger-muted">Rendimientos</p>
                    <p className="mt-1 font-medium text-ledger-green">{formatCOP(yieldAmount)}</p>
                  </div>
                  <div>
                    <p className="text-ledger-muted">Disponible antes de gastos</p>
                    <p className="mt-1 font-medium text-ledger-text">{formatCOP(availableBeforeOutflow)}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <AccountMetric label="Entradas" value={availableBeforeOutflow} tone="green" />
                    <AccountMetric label="Salidas" value={outflow} tone="red" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-ledger-muted">
                      <span>Uso de entradas</span>
                      <span>{outflowPercent.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className={`h-full rounded-full ${balance < 0 ? 'bg-red-600' : 'bg-ledger-green'}`}
                        style={{ width: `${outflowPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                    <span className="text-ledger-muted">Sobrante incluido</span>
                    <span className="font-medium text-ledger-text">{formatCOP(rollover)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {(accounts ?? []).length === 0 && (
            <p className="text-sm text-ledger-muted">No hay cuentas activas para mostrar.</p>
          )}
        </div>
        </div>
      </details>
    </div>
  )
}

function SummaryStat({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className="rounded-sm border border-black/10 bg-white px-4 py-3">
      <p className="text-xs text-ledger-muted">{label}</p>
      <p className={`mt-1 text-lg ${emphasize ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
    </div>
  )
}

function AccountMetric({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone === 'green' ? 'border-ledger-green/15 bg-ledger-green/5' : 'border-red-200/70 bg-red-50/60'}`}>
      <p className="text-[11px] text-ledger-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone === 'green' ? 'text-ledger-green' : 'text-red-700'}`}>{formatCOP(value)}</p>
    </div>
  )
}

function BudgetCard({ label, sublabel, spent, total, alertThreshold, children }: {
  label: string; sublabel?: string; spent: number; total: number; alertThreshold?: number; children?: ReactNode
}) {
  const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  const isOverThreshold = alertThreshold !== undefined && total > 0 && (spent / total) * 100 >= alertThreshold
  const isOverBudget = total > 0 && spent > total
  const remaining = total - spent

  return (
    <div className="rounded-sm border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ledger-text">{label}</p>
          {sublabel && <p className="mt-1 text-xs text-ledger-muted">Cuenta: {sublabel}</p>}
          <p className="mt-1 text-xs text-ledger-muted">{percent.toFixed(0)}% utilizado</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${isOverBudget ? 'text-red-700' : 'text-ledger-text'}`}>
            {formatCOP(remaining)}
          </p>
          <p className="text-xs text-ledger-muted">disponible</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ledger-muted">Utilizado <strong className="text-ledger-text">{formatCOP(spent)}</strong></span>
        <span className="text-ledger-muted">Total <strong className="text-ledger-text">{formatCOP(total)}</strong></span>
      </div>
      {children && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 sm:grid-cols-4">{children}</div>}
      {isOverBudget && <p className="mt-3 text-xs text-red-700">Presupuesto superado.</p>}
      {isOverThreshold && !isOverBudget && <p className="mt-3 text-xs text-amber-700">Alcanzaste el umbral del {alertThreshold}%.</p>}
    </div>
  )
}

function BudgetMetric({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="rounded-sm bg-black/[0.03] px-2 py-1.5 text-xs">
      <p className="text-ledger-muted">{label}</p>
      <p className={`mt-0.5 ${positive ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
    </div>
  )
}
