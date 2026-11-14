import { createClient } from '@/lib/supabase/server'
import { getMonthSummary, getPendingReviewCount } from '@/lib/data/dashboard'
import { formatYearMonth } from '@/lib/date-utils'
import { getCategoryLocationBudgets } from '@/lib/data/category-location-budgets'
import type { ReactNode } from 'react'
import Link from 'next/link'

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

const inputClass = 'input'

type DashboardCategory = { id: string; name: string }
type DashboardWallet = { id: string; name: string; account_id: string; accounts: { name: string } | null }
type DashboardAccount = { id: string; name: string; is_active: boolean }
type CategoryBudget = { category_id: string; alert_threshold_percent: number | null }
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
  const summaryPromise = getMonthSummary(supabase, monthStart)
  const categoryLocationBudgetsPromise = getCategoryLocationBudgets(supabase, monthStart, summaryPromise)

  const [
    { data: categoriesData },
    { data: walletsData },
    { data: accountsData },
    { data: categoryBudgetsData },
    { data: walletBudgetsData },
    summary,
    pendingCount,
    locationBudgetsByCategory,
  ] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true),
    supabase.from('wallets').select('id, name, account_id, accounts(name)').eq('is_active', true),
    supabase.from('accounts').select('id, name, is_active').eq('is_active', true).order('name'),
    supabase.from('category_budgets').select('category_id, alert_threshold_percent').eq('period_month', monthStart),
    supabase.from('wallet_budgets').select('wallet_id, assigned_amount, rollover_amount, total_budget, alert_threshold_percent').eq('period_month', monthStart).not('wallet_id', 'is', null),
    summaryPromise,
    getPendingReviewCount(supabase),
    categoryLocationBudgetsPromise,
  ])

  const categories = categoriesData as DashboardCategory[] | null
  const wallets = walletsData as DashboardWallet[] | null
  const accounts = accountsData as DashboardAccount[] | null
  const categoryBudgets = categoryBudgetsData as CategoryBudget[] | null
  const walletBudgets = walletBudgetsData as WalletBudget[] | null
  const categoryBudgetById = new Map((categoryBudgets ?? []).map((budget) => [budget.category_id, budget]))

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const walletsByAccount = new Map<string, DashboardWallet[]>()
  for (const wallet of wallets ?? []) {
    const list = walletsByAccount.get(wallet.account_id) ?? []
    list.push(wallet)
    walletsByAccount.set(wallet.account_id, list)
  }
  const walletsWithMovement = (wallets ?? []).filter((wallet) => summary.walletIdsWithMovement.has(wallet.id))
  const accountsWithMovement = (accounts ?? []).filter((account) => {
    const accountSummary = summary.accountById.get(account.id)
    return accountSummary
      ? accountSummary.ingreso > 0
        || accountSummary.gasto > 0
        || accountSummary.ahorro !== 0
        || accountSummary.inversion > 0
        || accountSummary.transferencia > 0
        || accountSummary.transferIn > 0
        || accountSummary.transferOut > 0
        || accountSummary.rollover > 0
      : false
  })
  const accountsWithoutMovement = (accounts ?? []).filter((account) => !accountsWithMovement.some((item) => item.id === account.id))
  const categoryBudgetStats = Array.from(locationBudgetsByCategory.values()).reduce(
    (totals, budget) => ({ total: totals.total + budget.budget, spent: totals.spent + budget.spent }),
    { total: 0, spent: 0 },
  )
  const budgetedDestinations = Array.from(locationBudgetsByCategory.values()).reduce((count, budget) => count + budget.locations, 0)
  const categoryBudgetsWithActivity = Array.from(locationBudgetsByCategory.entries())
    .filter(([, budget]) => budget.budget !== 0 || budget.spent !== 0 || budget.available !== 0)
    .map(([category_id, values]) => ({ category_id, ...values, alert_threshold_percent: categoryBudgetById.get(category_id)?.alert_threshold_percent ?? null }))
  const categoryHighlights = categoryBudgetsWithActivity.map((budget) => {
    const total = budget.budget
    const spent = budget.spent
    return {
      name: categoryNameById.get(budget.category_id) ?? 'Categoría',
      total,
      spent,
      remaining: budget.available,
      percent: total > 0 ? (spent / total) * 100 : 0,
    }
  })
  const categoryHighlight = categoryHighlights
    .filter((category) => category.total > 0 && (category.remaining < 0 || category.percent >= 80))
    .sort((a, b) => {
      const aPriority = a.remaining < 0 ? 0 : a.percent >= 80 ? 1 : 2
      const bPriority = b.remaining < 0 ? 0 : b.percent >= 80 ? 1 : 2
      return aPriority - bPriority || b.percent - a.percent
    })[0]
  const accountHighlights = accountsWithMovement.map((account) => {
    const accountSummary = summary.accountById.get(account.id)
    const income = accountSummary?.ingreso ?? 0
    const rollover = accountSummary?.rollover ?? 0
    const outflow = accountSummary?.outflow ?? 0
    const yieldAmount = accountSummary?.yield ?? 0
    const available = income + rollover + (accountSummary?.transferIn ?? 0) + yieldAmount
    const balance = available - outflow - (accountSummary?.transferOut ?? 0)
    return {
      name: account.name,
      balance,
      percent: available > 0 ? (balance / available) * 100 : 0,
    }
  })
  const accountHighlight = accountHighlights
    .filter((account) => account.balance < 0 || account.percent <= 20)
    .sort((a, b) => {
      const aPriority = a.balance < 0 ? 0 : a.percent <= 20 ? 1 : 2
      const bPriority = b.balance < 0 ? 0 : b.percent <= 20 ? 1 : 2
      return aPriority - bPriority || a.percent - b.percent
    })[0]
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
      value: `${budgetedDestinations}`,
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
      <header className="relative overflow-hidden rounded-[2rem] border border-ledger-green/20 bg-white shadow-[0_20px_50px_rgba(20,37,29,0.10)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#163c2a] via-ledger-green to-[#4a9568] px-5 py-7 text-white sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[0.03]" />
        <div className="pointer-events-none absolute -bottom-36 right-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Panel financiero</p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl leading-none tracking-tight text-white sm:text-5xl">Tu dinero,<br /><span className="text-white/75">bajo control.</span></h1>
            <p className="mt-1 text-sm text-white/75">
              {formatYearMonth(monthStart.slice(0, 7))}
            </p>
          </div>
          {pendingCount > 0 && (
            <a href="/revision" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/25">
              <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
              {pendingCount} por revisar
            </a>
          )}
        </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 bg-white px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium text-ledger-text">Resumen del periodo</p>
            <p className="mt-0.5 text-xs text-ledger-muted">Consulta el movimiento y el estado de tus finanzas.</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="min-w-40">
              <label className="block text-xs text-ledger-muted">Cambiar periodo</label>
              <input type="month" name="period" defaultValue={selectedPeriod} className={`${inputClass} mt-1 w-full`} />
            </div>
            <button type="submit" className="btn btn-primary">Filtrar</button>
            <Link href="/" className="btn btn-secondary">Actual</Link>
          </form>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ledger-green">Atajos</p>
            <h2 className="mt-1 font-serif text-2xl text-ledger-text">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-ledger-muted">Las acciones más útiles para continuar tu gestión.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group surface-card p-5 focus:outline-none focus:ring-2 focus:ring-ledger-green/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ledger-text">{action.label}</p>
                  <p className="mt-1 text-xs text-ledger-muted">{action.detail}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${action.accent}`}>
                  {action.value}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-ledger-muted">
                <span>Ir a sección</span>
                <span className="transition group-hover:translate-x-1 group-hover:text-ledger-green" aria-hidden="true">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white shadow-[0_18px_45px_rgba(20,37,29,0.08)]">
        <div className="grid lg:grid-cols-[1.15fr_2fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-ledger-green to-[#183f2c] p-6 text-white sm:p-8">
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/10" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/70">Balance del periodo</p>
            <p className="mt-4 break-words text-4xl font-semibold tracking-tight sm:text-5xl">{formatCOP(summary.balance)}</p>
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

      <details className="panel overflow-hidden">
        <summary className="cursor-pointer list-none bg-white p-5 [&::-webkit-details-marker]:hidden sm:p-6">
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
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/5 pt-4 sm:grid-cols-3">
            <div className="rounded-xl bg-ledger-green/[0.06] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Categorías</p>
              <p className="mt-1 text-base font-semibold text-ledger-text">{categoryBudgetsWithActivity.length}</p>
            </div>
            <div className="rounded-xl bg-black/[0.03] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Asignado</p>
              <p className="mt-1 text-base font-semibold text-ledger-text">{formatCOP(categoryBudgetStats.total)}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-amber-50/80 px-3 py-2.5 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Consumido</p>
              <p className="mt-1 text-base font-semibold text-amber-700">{formatCOP(categoryBudgetStats.spent)}</p>
            </div>
          </div>
          {categoryHighlight && (
            <div className={`mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${categoryHighlight.remaining < 0 ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${categoryHighlight.remaining < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`} aria-hidden="true">
                !
              </span>
              <p className="text-xs text-ledger-text">
                <span className="font-semibold">{categoryHighlight.name}</span>{' '}
                {categoryHighlight.remaining < 0
                  ? `superó el presupuesto por ${formatCOP(Math.abs(categoryHighlight.remaining))}.`
                  : `lleva ${categoryHighlight.percent.toFixed(0)}% consumido; quedan ${formatCOP(Math.max(categoryHighlight.remaining, 0))}.`}
              </p>
            </div>
          )}
        </summary>
        <div className="border-t border-black/5 bg-black/[0.015] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ledger-muted">Detalle por categoría</p>
          <a href={`/presupuestos/categorias?month=${selectedPeriod}`} className="text-xs font-medium text-ledger-green transition hover:text-ledger-text">
              Administrar presupuestos
            </a>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
          {categoryBudgetsWithActivity.map((budget) => {
            return (
              <BudgetCard
                key={budget.category_id}
                label={categoryNameById.get(budget.category_id) ?? 'Categoría'}
                spent={budget.spent}
                total={budget.budget}
                available={budget.available}
                alertThreshold={budget.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
              >
                <BudgetMetric label="Presupuesto" value={budget.budget} />
                <BudgetMetric label="Gastos" value={budget.spent} />
                <BudgetMetric label="Transferencias netas" value={budget.transferMovement} />
                <BudgetMetric label="Rendimiento estimado" value={budget.yieldAmount} positive />
              </BudgetCard>
            )
          })}
          </div>
          {categoryBudgetsWithActivity.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white px-5 py-8 text-center">
              <p className="text-sm font-medium text-ledger-text">Aún no has asignado presupuesto por categoría.</p>
              <p className="mt-1 text-sm text-ledger-muted">Configura tus categorías para comenzar a controlar el mes.</p>
              <a href={`/presupuestos/categorias?month=${selectedPeriod}`} className="btn btn-primary btn-sm mt-4">
                Configurar presupuesto
              </a>
            </div>
          )}
        </div>
      </details>

      <section className="panel overflow-hidden">
        <div className="bg-white px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ledger-green">Destinos financieros</p>
            <h2 className="mt-1 font-serif text-2xl text-ledger-text">Bolsillos y cuentas</h2>
            <p className="mt-1 text-sm text-ledger-muted">Revisa los destinos con actividad y el estado general de tus cuentas este mes.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/5 pt-4 sm:grid-cols-3">
            <div className="rounded-xl bg-sky-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Cuentas activas</p>
              <p className="mt-1 text-base font-semibold text-ledger-text">{accounts?.length ?? 0}</p>
            </div>
            <div className="rounded-xl bg-ledger-green/[0.06] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Con actividad</p>
              <p className="mt-1 text-base font-semibold text-ledger-green">{accountsWithMovement.length}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-black/[0.03] px-3 py-2.5 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ledger-muted">Sin actividad</p>
              <p className="mt-1 text-base font-semibold text-ledger-text">{accountsWithoutMovement.length}</p>
            </div>
          </div>
          {accountHighlight && (
            <div className={`mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${accountHighlight.balance < 0 ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${accountHighlight.balance < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`} aria-hidden="true">
                !
              </span>
              <p className="text-xs text-ledger-text">
                <span className="font-semibold">{accountHighlight.name}</span>{' '}
                {accountHighlight.balance < 0
                  ? `tiene un saldo negativo de ${formatCOP(Math.abs(accountHighlight.balance))}.`
                  : `conserva solo ${accountHighlight.percent.toFixed(0)}% disponible (${formatCOP(accountHighlight.balance)}).`}
              </p>
            </div>
          )}
        </div>
      <details open className="hidden border-t border-black/10 overflow-hidden">
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
            {walletsWithMovement.length} con movimiento
          </span>
        </summary>
        <div className="space-y-3 bg-white/40 p-4 sm:p-6">
          {walletsWithMovement.map((wallet) => {
            const budget = (walletBudgets ?? []).find((item) => item.wallet_id === wallet.id)
            const spent = summary.gastoByWallet.get(wallet.id) ?? 0
            const total = Number(budget?.total_budget ?? 0)
            const yieldAmount = summary.yieldByWallet.get(wallet.id) ?? 0
            const available = total - spent + (summary.transferByWallet.get(wallet.id) ?? 0) + yieldAmount
            return (
              <BudgetCard
                key={wallet.id}
                label={wallet.name}
                sublabel={wallet.accounts?.name}
                spent={spent}
                total={total}
                available={available}
                alertThreshold={budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
              >
                <BudgetMetric label="Asignado" value={Number(budget?.assigned_amount ?? 0)} />
                <BudgetMetric label="Sobrante" value={Number(budget?.rollover_amount ?? 0)} />
                <BudgetMetric label="Saldo" value={available} positive />
                <BudgetMetric label="Rendimientos" value={yieldAmount} positive />
              </BudgetCard>
            )
          })}
          {walletsWithMovement.length === 0 && (
            <p className="text-sm text-ledger-muted">No hay movimientos en bolsillos durante este periodo.</p>
          )}
        </div>
      </details>

      <details className="border-t border-black/10 overflow-hidden">
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
        <div className="bg-black/[0.015] p-4 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-ledger-muted">Cuentas con actividad priorizadas para el período seleccionado.</p>
          </div>
          <span className="hidden rounded-full bg-ledger-green/10 px-3 py-1 text-xs font-medium text-ledger-green sm:inline-flex">
            {accountsWithMovement.length} con movimiento
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {accountsWithMovement.map((account) => {
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
                {(walletsByAccount.get(account.id) ?? []).length > 0 && (
                  <details className="border-t border-black/10 bg-black/[0.015]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-ledger-text [&::-webkit-details-marker]:hidden">
                      <span>Bolsillos de {account.name}</span>
                      <span className="text-xs font-normal text-ledger-muted">
                        {(walletsByAccount.get(account.id) ?? []).length} registrados
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-black/5 p-4">
                      {(walletsByAccount.get(account.id) ?? [])
                        .filter((wallet) => {
                          const budget = (walletBudgets ?? []).find((item) => item.wallet_id === wallet.id)
                          return summary.walletIdsWithMovement.has(wallet.id) || Number(budget?.total_budget ?? 0) > 0 || Number(budget?.rollover_amount ?? 0) > 0
                        })
                        .map((wallet) => {
                          const budget = (walletBudgets ?? []).find((item) => item.wallet_id === wallet.id)
                          const spent = summary.gastoByWallet.get(wallet.id) ?? 0
                          const total = Number(budget?.total_budget ?? 0)
                          const yieldAmount = summary.yieldByWallet.get(wallet.id) ?? 0
                          return (
                            <BudgetCard
                              key={wallet.id}
                              label={wallet.name}
                              spent={spent}
                              total={total}
                              available={total - spent + (summary.transferByWallet.get(wallet.id) ?? 0) + yieldAmount}
                              alertThreshold={budget?.alert_threshold_percent ? Number(budget.alert_threshold_percent) : undefined}
                            >
                              <BudgetMetric label="Asignado" value={Number(budget?.assigned_amount ?? 0)} />
                              <BudgetMetric label="Sobrante" value={Number(budget?.rollover_amount ?? 0)} />
                              <BudgetMetric label="Disponible" value={total - spent + (summary.transferByWallet.get(wallet.id) ?? 0) + yieldAmount} positive />
                              <BudgetMetric label="Rendimientos" value={yieldAmount} positive />
                            </BudgetCard>
                          )
                        })}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
          {accountsWithMovement.length === 0 && (
            <p className="text-sm text-ledger-muted">No hay cuentas activas para mostrar.</p>
          )}
        </div>
        {accountsWithoutMovement.length > 0 && (
          <details className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold text-ledger-text">Sin movimientos en este período</p>
                <p className="mt-1 text-xs text-ledger-muted">Estas cuentas no registraron actividad en el mes seleccionado.</p>
              </div>
              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-ledger-muted">
                {accountsWithoutMovement.length} cuentas
              </span>
            </summary>
            <div className="grid gap-3 border-t border-black/5 bg-black/[0.015] p-4 sm:grid-cols-2">
              {accountsWithoutMovement.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ledger-text">{account.name}</p>
                    <p className="mt-1 text-xs text-ledger-muted">Sin actividad mensual</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-black/20" aria-hidden="true" />
                </div>
              ))}
            </div>
          </details>
        )}
        </div>
      </details>
      </section>
    </div>
  )
}

function SummaryStat({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ledger-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold tracking-tight ${emphasize ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
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

function BudgetCard({ label, sublabel, spent, total, available, alertThreshold, children }: {
  label: string; sublabel?: string; spent: number; total: number; available?: number; alertThreshold?: number; children?: ReactNode
}) {
  const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  const isOverThreshold = alertThreshold !== undefined && total > 0 && (spent / total) * 100 >= alertThreshold
  const remaining = available ?? total - spent
  const isOverBudget = remaining < 0

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isOverBudget ? 'bg-red-600' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`} aria-hidden="true" />
            <p className="text-sm font-semibold leading-5 text-ledger-text">{label}</p>
          </div>
          {sublabel && <p className="mt-1 text-xs text-ledger-muted">Cuenta: {sublabel}</p>}
          <p className="mt-1 text-xs text-ledger-muted">{percent.toFixed(0)}% utilizado</p>
        </div>
        <div className="text-right">
          <p className={`text-base font-semibold ${isOverBudget ? 'text-red-700' : 'text-ledger-green'}`}>
            {formatCOP(remaining)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.1em] text-ledger-muted">disponible</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${isOverBudget ? 'bg-red-700' : isOverThreshold ? 'bg-amber-500' : 'bg-ledger-green'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ledger-muted">Utilizado <strong className="text-ledger-text">{formatCOP(spent)}</strong></span>
        <span className="text-ledger-muted">Total <strong className="text-ledger-text">{formatCOP(total)}</strong></span>
      </div>
      {children && <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/5 pt-4 xl:grid-cols-4">{children}</div>}
      {isOverBudget && <p className="mt-3 text-xs text-red-700">Presupuesto superado.</p>}
      {isOverThreshold && !isOverBudget && <p className="mt-3 text-xs text-amber-700">Alcanzaste el umbral del {alertThreshold}%.</p>}
    </div>
  )
}

function BudgetMetric({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-black/[0.05] bg-ledger-paper/70 px-2.5 py-2 text-xs">
      <p className="whitespace-nowrap text-[10px] leading-4 text-ledger-muted sm:text-[11px]">{label}</p>
      <p className={`mt-1 break-words font-medium ${positive ? 'text-ledger-green' : 'text-ledger-text'}`}>{formatCOP(value)}</p>
    </div>
  )
}
