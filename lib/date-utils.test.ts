import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { currentYearMonth, todayInBogota } from './date-utils.ts'

test('Bogota date stays in the prior month while UTC has crossed midnight', () => {
  const at = new Date('2026-11-01T02:30:00Z')
  assert.equal(todayInBogota(at), '2026-10-31')
  assert.equal(currentYearMonth(at), '2026-10')
})

test('Bogota date and month advance at local midnight across the year boundary', () => {
  const before = new Date('2027-01-01T04:59:59Z')
  const after = new Date('2027-01-01T05:00:00Z')
  assert.equal(todayInBogota(before), '2026-12-31')
  assert.equal(currentYearMonth(before), '2026-12')
  assert.equal(todayInBogota(after), '2027-01-01')
  assert.equal(currentYearMonth(after), '2027-01')
})
