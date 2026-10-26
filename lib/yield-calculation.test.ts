import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// Node's native TypeScript runner requires the explicit extension.
// @ts-expect-error The application bundler resolves this module without the extension.
import { calculateDailyYield } from './yield-calculation.ts'

const rate = [{ eaPercent: 36.5, validFrom: '2026-01-01' }]

test('no genera rendimiento antes de la activación', () => {
  assert.equal(calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-02-01',
    activationDate: '2026-02-01',
    movements: [],
    rates: rate,
  }), 0)
})

test('calcula rendimiento sobre saldo constante', () => {
  const value = calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-02',
    activationDate: '2026-01-01',
    movements: [],
    rates: rate,
  })
  assert.ok(value > 0)
  assert.ok(value < 100)
})

test('un ingreso comienza a rendir desde su fecha', () => {
  const value = calculateDailyYield({
    openingBalance: 0,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-03',
    activationDate: '2026-01-01',
    movements: [{ date: '2026-01-02', amount: 100000 }],
    rates: rate,
  })
  const oneDay = calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-02',
    activationDate: '2026-01-01',
    movements: [],
    rates: rate,
  })
  assert.equal(value, oneDay)
})

test('un gasto reduce el saldo que rinde', () => {
  const value = calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-03',
    activationDate: '2026-01-01',
    movements: [{ date: '2026-01-02', amount: -50000 }],
    rates: rate,
  })
  const fullBalance = calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-03',
    activationDate: '2026-01-01',
    movements: [],
    rates: rate,
  })
  assert.ok(value < fullBalance)
})

test('no genera rendimiento con saldo cero o negativo', () => {
  assert.equal(calculateDailyYield({
    openingBalance: 0,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-03',
    activationDate: '2026-01-01',
    movements: [{ date: '2026-01-02', amount: -1 }],
    rates: rate,
  }), 0)
})

test('usa la nueva tasa desde su fecha de vigencia', () => {
  const value = calculateDailyYield({
    openingBalance: 100000,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-03',
    activationDate: '2026-01-01',
    movements: [],
    rates: [
      { eaPercent: 0, validFrom: '2026-01-01' },
      { eaPercent: 36.5, validFrom: '2026-01-02' },
    ],
  })
  assert.ok(value > 0)
})
