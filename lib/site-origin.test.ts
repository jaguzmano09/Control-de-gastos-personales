import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCanonicalPageUrl, getTrustedSiteOrigin } from './site-origin.ts'

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

test('legacy page links open on the canonical domain with their path and query', () => {
  assert.equal(
    getCanonicalPageUrl('https://control-de-gastos-personales-nine.vercel.app/transacciones?mes=2026-11', 'GET'),
    'https://plaenc.vercel.app/transacciones?mes=2026-11',
  )
  assert.equal(
    getCanonicalPageUrl('https://control-de-gastos-personales-nine.vercel.app/', 'GET'),
    'https://plaenc.vercel.app/',
  )
})

test('legacy callbacks, asset requests, and writes stay on their origin', () => {
  assert.equal(getCanonicalPageUrl('https://control-de-gastos-personales-nine.vercel.app/api/gmail/callback?code=x', 'GET'), null)
  assert.equal(getCanonicalPageUrl('https://control-de-gastos-personales-nine.vercel.app/manifest.webmanifest', 'GET'), null)
  assert.equal(getCanonicalPageUrl('https://control-de-gastos-personales-nine.vercel.app/transacciones', 'POST'), null)
  assert.equal(getCanonicalPageUrl('https://plaenc.vercel.app/', 'GET'), null)
})
