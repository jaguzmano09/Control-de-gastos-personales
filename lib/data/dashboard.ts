import { createClient } from '@/lib/supabase/server'
import { calculateDailyYield } from '@/lib/yield-calculation'

type DashboardClient = Awaited<ReturnType<typeof createClient>>

type Totals = {
  ingreso: number
  gasto: number
  ahorro: number
  inversion: number
  transferencia: number
}

type AccountSummary = Totals & {
  outflow: number
  rollover: number
  balance: number
  yield: number
}

function getMonthRange(monthStart: string) {
  const [year, month] = monthStart.slice(0, 7).split('-')
  const nextMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0')
  const nextYear = month === '12' ? String(Number(year) + 1) : year

  return {
    start: `${year}-${month}-01`,
    end: `${nextYear}-${nextMonth}-01`,
  }
}

function getTodayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function addOneDay(date: string) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

function emptyTotals(): Totals {
  return { ingreso: 0, gasto: 0, ahorro: 0, inversion: 0, transferencia: 0 }
}

function emptyAccountSummary(): AccountSummary {
  return { ...emptyTotals(), outflow: 0, rollover: 0, balance: 0, yield: 0 }
}

export async function getMonthSummary(supabase: DashboardClient, monthStart: string) {
  const { start, end: monthEnd } = getMonthRange(monthStart)
  const today = getTodayDate()
  const end = monthStart.slice(0, 7) === today.slice(0, 7)
    ? (addOneDay(today) < monthEnd ? addOneDay(today) : monthEnd)
    : monthEnd
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, savings_operation, amount, category_id, wallet_id, account_id, occurred_at')
    .gte('occurred_at', start)
    .lt('occurred_at', end)
    .eq('status', 'confirmada')

  if (error) throw error

  const [
    { data: accountBudgets, error: accountBudgetsError },
    { data: wallets, error: walletsError },
    { data: yieldConfigs, error: yieldConfigsError },
    { data: yieldRates, error: yieldRatesError },
  ] =
    await Promise.all([
      supabase
        .from('wallet_budgets')
        .select('account_id, wallet_id, rollover_amount')
        .eq('period_month', monthStart),
      supabase.from('wallets').select('id, account_id').eq('is_active', true),
      supabase.from('yield_configs').select('id, account_id, wallet_id, start_date, is_active'),
      supabase.from('yield_rates').select('config_id, ea_percent, valid_from').order('valid_from'),
    ])

  if (accountBudgetsError) throw accountBudgetsError
  if (walletsError) throw walletsError
  if (yieldConfigsError) throw yieldConfigsError
  if (yieldRatesError) throw yieldRatesError

  const totals = emptyTotals()
  let rolloverTotal = 0
  const gastoByCategory = new Map<string, number>()
  const gastoNormalByCategory = new Map<string, number>()
  const ahorroIngresoByCategory = new Map<string, number>()
  const ahorroRetiroByCategory = new Map<string, number>()
  const gastoByWallet = new Map<string, number>()
  const balanceByWallet = new Map<string, number>()
  const walletIdsWithMovement = new Set<string>()
  const accountById = new Map<string, AccountSummary>()
  const yieldByWallet = new Map<string, number>()
  const yieldByAccount = new Map<string, number>()
  const accountIdByWalletId = new Map((wallets ?? []).map((wallet) => [wallet.id, wallet.account_id]))

  for (const budget of accountBudgets ?? []) {
    const accountId = budget.account_id ?? accountIdByWalletId.get(budget.wallet_id ?? '')
    if (!accountId) continue

    const accountSummary = accountById.get(accountId) ?? emptyAccountSummary()
    accountSummary.rollover += Number(budget.rollover_amount)
    if (budget.wallet_id) {
      balanceByWallet.set(budget.wallet_id, (balanceByWallet.get(budget.wallet_id) ?? 0) + Number(budget.rollover_amount))
    }
    rolloverTotal += Number(budget.rollover_amount)
    accountSummary.balance = accountSummary.ingreso + accountSummary.rollover - accountSummary.outflow
    accountById.set(accountId, accountSummary)
  }

  for (const t of transactions ?? []) {
    const amount = Number(t.amount)
    const accountSummary = accountById.get(t.account_id) ?? emptyAccountSummary()

    switch (t.type) {
      case 'Ingreso': totals.ingreso += amount; break
      case 'Gasto': totals.gasto += amount; break
      case 'Ahorro': totals.ahorro += t.savings_operation === 'retiro' ? -amount : amount; break
      case 'Inversion': totals.inversion += amount; break
      case 'Transferencia': totals.transferencia += amount; break
    }

    switch (t.type) {
      case 'Ingreso': accountSummary.ingreso += amount; break
      case 'Gasto': accountSummary.gasto += amount; accountSummary.outflow += amount; break
      case 'Ahorro': {
        const savingsAmount = t.savings_operation === 'retiro' ? -amount : amount
        accountSummary.ahorro += savingsAmount
        if (t.savings_operation === 'retiro') accountSummary.outflow += amount
        else accountSummary.ingreso += amount
        break
      }
      case 'Inversion': accountSummary.inversion += amount; accountSummary.outflow += amount; break
      case 'Transferencia': accountSummary.transferencia += amount; break
    }

    accountSummary.balance = accountSummary.ingreso + accountSummary.rollover - accountSummary.outflow
    accountById.set(t.account_id, accountSummary)

    if (t.category_id && (t.type === 'Gasto' || t.type === 'Ahorro')) {
      const categoryAmount = t.type === 'Ahorro' && t.savings_operation === 'ingreso'
        ? amount
        : -amount
      gastoByCategory.set(t.category_id, (gastoByCategory.get(t.category_id) ?? 0) + categoryAmount)
      if (t.type === 'Ahorro' && t.savings_operation === 'ingreso') {
        ahorroIngresoByCategory.set(t.category_id, (ahorroIngresoByCategory.get(t.category_id) ?? 0) + amount)
      }
      if (t.type === 'Ahorro' && t.savings_operation === 'retiro') {
        ahorroRetiroByCategory.set(t.category_id, (ahorroRetiroByCategory.get(t.category_id) ?? 0) + amount)
      }
      if (t.type === 'Gasto') {
        gastoNormalByCategory.set(t.category_id, (gastoNormalByCategory.get(t.category_id) ?? 0) + amount)
      }
    }
    if (t.type === 'Gasto' && t.wallet_id) {
      gastoByWallet.set(t.wallet_id, (gastoByWallet.get(t.wallet_id) ?? 0) + amount)
    }
    if (t.wallet_id) {
      walletIdsWithMovement.add(t.wallet_id)
      const walletMovement = t.type === 'Ingreso' || (t.type === 'Ahorro' && t.savings_operation === 'ingreso')
        ? amount
        : t.type === 'Gasto' || t.type === 'Inversion' || (t.type === 'Ahorro' && t.savings_operation === 'retiro')
          ? -amount
          : 0
      balanceByWallet.set(t.wallet_id, (balanceByWallet.get(t.wallet_id) ?? 0) + walletMovement)
    }
  }

  const ratesByConfig = new Map<string, { eaPercent: number; validFrom: string }[]>()
  for (const rate of yieldRates ?? []) {
    ratesByConfig.set(rate.config_id, [...(ratesByConfig.get(rate.config_id) ?? []), {
      eaPercent: Number(rate.ea_percent),
      validFrom: rate.valid_from,
    }])
  }
  for (const config of yieldConfigs ?? []) {
    if (!config.is_active) continue
    const targetId = config.wallet_id ?? config.account_id
    if (!targetId) continue
    const budget = (accountBudgets ?? []).find((row) =>
      config.wallet_id ? row.wallet_id === config.wallet_id : row.account_id === config.account_id,
    )
    const openingBalance = Number(budget?.rollover_amount ?? 0)
    const movements = (transactions ?? [])
      .filter((transaction) => config.wallet_id
        ? transaction.wallet_id === config.wallet_id
        : transaction.account_id === config.account_id && !transaction.wallet_id)
      .map((transaction) => ({
        date: transaction.occurred_at.slice(0, 10),
        amount: transaction.type === 'Ingreso' || (transaction.type === 'Ahorro' && transaction.savings_operation === 'ingreso')
          ? Number(transaction.amount)
          : -Number(transaction.amount),
      }))
    const calculated = calculateDailyYield({
      openingBalance,
      periodStart: start,
      periodEnd: end,
      activationDate: config.start_date,
      movements,
      rates: ratesByConfig.get(config.id) ?? [],
    })
    if (config.wallet_id) {
      yieldByWallet.set(config.wallet_id, calculated)
      balanceByWallet.set(config.wallet_id, (balanceByWallet.get(config.wallet_id) ?? 0) + calculated)
      const accountId = accountIdByWalletId.get(config.wallet_id)
      if (accountId) {
        const accountSummary = accountById.get(accountId) ?? emptyAccountSummary()
        accountSummary.yield += calculated
        accountSummary.balance += calculated
        accountById.set(accountId, accountSummary)
      }
    } else if (config.account_id) {
      yieldByAccount.set(config.account_id, calculated)
      const accountSummary = accountById.get(config.account_id) ?? emptyAccountSummary()
      accountSummary.yield += calculated
      accountSummary.balance += calculated
      accountById.set(config.account_id, accountSummary)
    }
  }

  const totalYield = [...Array.from(yieldByWallet.values()), ...Array.from(yieldByAccount.values())].reduce((sum, value) => sum + value, 0)
  const balance = totals.ingreso + totals.ahorro + rolloverTotal + totalYield - totals.gasto - totals.inversion
  return { totals, rolloverTotal, totalYield, yieldByWallet, yieldByAccount, balance, balanceByWallet, walletIdsWithMovement, gastoByCategory, gastoNormalByCategory, ahorroIngresoByCategory, ahorroRetiroByCategory, gastoByWallet, accountById }
}

export async function getPendingReviewCount(supabase: DashboardClient) {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendiente_revision', 'duplicado'])

  if (error) throw error
  return count ?? 0
}
