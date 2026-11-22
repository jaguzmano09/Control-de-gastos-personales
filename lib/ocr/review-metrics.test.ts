import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildOcrReviewMetadata } from './review-metrics.ts'

test('records correction signals without retaining OCR text or financial values', () => {
  const metadata = buildOcrReviewMetadata(
    { engine: 'tesseract-local', date_inferred: true, amount_conflict: true, raw_ocr_text: 'private receipt', amount: 123456 },
    { amount: 0, occurred_at: '2026-11-22' },
    { amount: 27800, occurred_at: '2026-11-20' },
  )

  assert.deepEqual(metadata.review, { amount_corrected: true, date_corrected: true, amount_missing: true })
  assert.equal(metadata.engine, 'tesseract-local')
  assert.equal(metadata.date_inferred, true)
  assert.equal(metadata.amount_conflict, true)
  assert.equal(JSON.stringify(metadata).includes('private receipt'), false)
  assert.equal(JSON.stringify(metadata).includes('27800'), false)
  assert.equal(JSON.stringify(metadata).includes('123456'), false)
})

test('leaves unchanged draft fields marked as uncorrected', () => {
  const metadata = buildOcrReviewMetadata(null,
    { amount: 20000, occurred_at: '2026-11-20' },
    { amount: 20000, occurred_at: '2026-11-20' },
  )
  assert.deepEqual(metadata.review, { amount_corrected: false, date_corrected: false, amount_missing: false })
})
