import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { parseOcrText } from './parse.ts'

const receipts = [
  { label: 'Colombian thousands separator', text: 'PANADERIA CENTRAL\nFecha 20/11/2026\nTOTAL $ 20.000', amount: 20000, date: '2026-11-20' },
  { label: 'comma thousands separator', text: 'MINIMERCADO LOCAL\nFecha 21-11-2026\nTotal: $20,000', amount: 20000, date: '2026-11-21' },
  { label: 'decimal comma and thousands dot', text: 'CAFETERIA LOCAL\nFecha 21.11.2026\nTotal $12.500,00', amount: 12500, date: '2026-11-21' },
  { label: 'decimal dot and thousands comma', text: 'FARMACIA LOCAL\nFecha 2026-11-19\nTotal $1,250.00', amount: 1250, date: '2026-11-19' },
  { label: 'total and change on same line', text: 'RESTAURANTE LOCAL\nFecha 19/11/2026\nTotal $20.000 Cambio $5.000', amount: 20000, date: '2026-11-19' },
  { label: 'written Spanish date', text: 'LIBRERIA LOCAL\n21 de noviembre de 2026\nA pagar 35000', amount: 35000, date: '2026-11-21' },
  { label: 'invalid calendar date', text: 'FERRETERIA LOCAL\nFecha 31/02/2026\nTotal $10.000', amount: 10000, date: '' },
  { label: 'invoice identifier is not an amount', text: 'COMERCIO LOCAL\nFactura No. 123.456.789\nFecha 20/11/2026', amount: 0, date: '2026-11-20' },
] as const

for (const receipt of receipts) {
  test(receipt.label, () => {
    const actual = parseOcrText(receipt.text)
    assert.equal(actual.amount, receipt.amount)
    assert.equal(actual.occurred_at, receipt.date)
  })
}
