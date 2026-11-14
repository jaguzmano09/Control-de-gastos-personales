import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { applyTransferDelta, getTransferLocationError } from './transfer.ts'

test('transfer conserves the total across two accounts and their allocations', () => {
  const accounts = new Map([['a', 20000], ['b', 15000]])
  const allocations = new Map([['category-a', 20000], ['category-b', 15000]])

  applyTransferDelta(accounts, 'a', 'b', 5000)
  applyTransferDelta(allocations, 'category-a', 'category-b', 5000)

  assert.deepEqual(Array.from(accounts.values()), [15000, 20000])
  assert.deepEqual(Array.from(allocations.values()), [15000, 20000])
  assert.equal(Array.from(accounts.values()).reduce((sum, value) => sum + value), 35000)
  assert.equal(Array.from(allocations.values()).reduce((sum, value) => sum + value), 35000)
})

test('transfer between pockets in one account keeps the account and category totals', () => {
  const pockets = new Map([['travel', 12000], ['daily', 8000]])
  const category = new Map([['same-category', 20000]])

  applyTransferDelta(pockets, 'travel', 'daily', 3000)
  applyTransferDelta(category, 'same-category', 'same-category', 3000)

  assert.deepEqual(Array.from(pockets.values()), [9000, 11000])
  assert.equal(Array.from(pockets.values()).reduce((sum, value) => sum + value), 20000)
  assert.equal(category.get('same-category'), 20000)
})

test('transfer requires distinct fully selected locations', () => {
  const pocketed = { accountId: 'a', walletId: 'travel', hasWallets: true }
  assert.match(getTransferLocationError(pocketed, pocketed) ?? '', /diferentes/)
  assert.match(getTransferLocationError(pocketed, { accountId: 'a', hasWallets: true }) ?? '', /destino/)
  assert.equal(getTransferLocationError(pocketed, { accountId: 'a', walletId: 'daily', hasWallets: true }), null)
})
