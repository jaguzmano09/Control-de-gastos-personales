export type YieldMovement = {
  date: string
  amount: number
}

export type YieldRate = {
  eaPercent: number
  validFrom: string
}

export type DailyYieldInput = {
  openingBalance: number
  periodStart: string
  periodEnd: string
  activationDate: string
  movements: YieldMovement[]
  rates: YieldRate[]
}

function addDays(date: string) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

function dailyRate(eaPercent: number) {
  return Math.pow(1 + eaPercent / 100, 1 / 365) - 1
}

export function calculateDailyYield(input: DailyYieldInput) {
  if (input.periodStart >= input.periodEnd || input.activationDate >= input.periodEnd) return 0

  const movementsByDate = new Map<string, number>()
  for (const movement of input.movements) {
    if (movement.date >= input.periodStart && movement.date < input.periodEnd) {
      movementsByDate.set(movement.date, (movementsByDate.get(movement.date) ?? 0) + movement.amount)
    }
  }

  let balance = input.openingBalance
  let total = 0
  let date = input.periodStart

  while (date < input.periodEnd) {
    balance += movementsByDate.get(date) ?? 0
    if (date >= input.activationDate && balance > 0) {
      const rate = [...input.rates]
        .filter((candidate) => candidate.validFrom <= date)
        .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0]
      if (rate) total += balance * dailyRate(rate.eaPercent)
    }
    date = addDays(date)
  }

  return Math.round((total + Number.EPSILON) * 100) / 100
}
