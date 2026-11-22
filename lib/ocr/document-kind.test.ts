import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { classifyReceiptDocument } from './document-kind.ts'

test('recognizes a bank transfer voucher', () => {
  assert.equal(classifyReceiptDocument('COMPROBANTE DE TRANSFERENCIA\nCuenta origen 123\nCuenta destino 456\nValor $20.000'), 'transfer')
})

test('recognizes a successful pocket transfer', () => {
  assert.equal(classifyReceiptDocument('Transferencia exitosa\nBolsillo origen A\nBolsillo destino B'), 'transfer')
})

test('does not classify a merchant receipt paid by transfer as an account transfer', () => {
  assert.equal(classifyReceiptDocument('TIENDA LOCAL\nMedio de pago: transferencia\nTotal $20.000'), 'unclassified')
})

test('leaves incomplete and ordinary receipts unclassified', () => {
  assert.equal(classifyReceiptDocument('PANADERIA CENTRAL\nTOTAL $20.000'), 'unclassified')
  assert.equal(classifyReceiptDocument('Transferencia $20.000'), 'unclassified')
})
