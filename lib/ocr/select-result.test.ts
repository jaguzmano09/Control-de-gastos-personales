import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { hasFinancialConsensus, selectOcrResult } from './select-result.ts'

test('prefers complete financial fields over character confidence', () => {
  const result = selectOcrResult([
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 76 },
    { text: 'TIENDA LOCAL\nFactura 123456\nPrecio $5.000', confidence: 98 },
  ])
  assert.match(result.text, /Total \$20\.000/)
  assert.equal(result.amountConflict, false)
})

test('flags competing totals and dates for explicit review', () => {
  const result = selectOcrResult([
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 90 },
    { text: 'TIENDA LOCAL\nFecha 21/11/2026\nTotal $28.000', confidence: 95 },
  ])
  assert.equal(result.amountConflict, true)
  assert.equal(result.dateConflict, true)
})

test('blocks a transfer detected in any OCR variant', () => {
  const result = selectOcrResult([
    { text: 'COMPROBANTE DE TRANSFERENCIA\nTotal $20.000', confidence: 75 },
    { text: 'COMPROBANTE\nTotal $20.000', confidence: 98 },
  ])
  assert.equal(result.documentKind, 'transfer')
})

test('returns an empty result when all image reads fail', () => {
  assert.deepEqual(selectOcrResult([]), {
    text: '', confidence: 0, amountConflict: false, dateConflict: false, documentKind: 'unclassified',
  })
})

test('stops after two matching complete reads', () => {
  assert.equal(hasFinancialConsensus([
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 90 },
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 90 },
  ]), true)
})

test('keeps reading when amount or date differs', () => {
  assert.equal(hasFinancialConsensus([
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 90 },
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $28.000', confidence: 90 },
  ]), false)
})

test('keeps reading when agreement comes from low confidence text', () => {
  assert.equal(hasFinancialConsensus([
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 70 },
    { text: 'TIENDA LOCAL\nFecha 20/11/2026\nTotal $20.000', confidence: 90 },
  ]), false)
})
