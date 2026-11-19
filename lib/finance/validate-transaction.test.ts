import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { validTransactionFields } from './validate-transaction.ts'

test('validates actual calendar dates, transaction types and finite positive amounts', () => {
  assert.equal(validTransactionFields('2026-11-19', 'Transferencia', 5000, null), true)
  assert.equal(validTransactionFields('2026-02-30', 'Gasto', 10, null), false)
  assert.equal(validTransactionFields('2026-11-19', 'Other', 10, null), false)
  for (const amount of [NaN, Infinity, -1, 0]) assert.equal(validTransactionFields('2026-11-19', 'Ingreso', amount, null), false)
  assert.equal(validTransactionFields('2026-11-19', 'Ingreso', 1, 'a'.repeat(2001)), false)
})
