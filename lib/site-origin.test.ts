import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTrustedSiteOrigin } from './site-origin.ts'

test('Gmail callback stays on the domain that initiated the flow', () => {
  assert.equal(getTrustedSiteOrigin('https://plaenc.vercel.app/api/gmail/connect'), 'https://plaenc.vercel.app')
  assert.equal(
    getTrustedSiteOrigin('https://control-de-gastos-personales-nine.vercel.app/api/gmail/connect'),
    'https://control-de-gastos-personales-nine.vercel.app',
  )
})

test('untrusted origins cannot choose a Google OAuth callback', () => {
  assert.equal(getTrustedSiteOrigin('https://plaenc.vercel.app.attacker.example/api/gmail/connect'), null)
  assert.equal(getTrustedSiteOrigin('http://plaenc.vercel.app/api/gmail/connect'), null)
  assert.equal(getTrustedSiteOrigin('https://preview-plaenc.vercel.app/api/gmail/connect'), null)
})
