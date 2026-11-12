import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSenderAddress } from './client.ts'

test('normalizes an exact address from a Gmail From header', () => {
  assert.equal(normalizeSenderAddress('Bank Alerts <alerts@example.com>'), 'alerts@example.com')
  assert.equal(normalizeSenderAddress('ALERTS@example.com'), 'alerts@example.com')
})

test('does not equate spoofed From headers with an allowed mailbox', () => {
  assert.notEqual(normalizeSenderAddress('alerts@example.com.attacker.test'), 'alerts@example.com')
  assert.notEqual(normalizeSenderAddress('alerts@example.com <attacker@evil.test>'), 'alerts@example.com')
  assert.equal(normalizeSenderAddress('not an address'), null)
})
