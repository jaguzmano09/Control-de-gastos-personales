import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { gunzipSync } from 'node:zlib'

// CORD test split, CC BY 4.0: https://huggingface.co/datasets/Heliosoph/CORD/tree/51b7e932f2a07a883d77487b34aa5a33f76fa713
// Node's TypeScript runner needs require for the existing Tesseract worker path.
globalThis.require = createRequire(import.meta.url)
const { preprocessReceipt } = await import('../lib/ocr/preprocess.ts')
const { extractTextFromImagesWithTesseract, discardTesseractWorker } = await import('../lib/ocr/tesseract.ts')
const { parseOcrText } = await import('../lib/ocr/parse.ts')

const datasetDir = process.argv[2]
const sampleSize = Number(process.argv[3] ?? 12)
if (!datasetDir || !Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100) {
  throw new Error('Usage: node --experimental-strip-types scripts/evaluate-ocr-cord.mjs <extracted CORD test directory> [sample size 1-100]')
}

const records = gunzipSync(readFileSync(join(datasetDir, 'cord-test.jsonl.gz')))
  .toString('utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
const annotated = records.filter((record) => {
  const goldText = record.ground_truth?.gt_parse?.total?.total_price
  return typeof goldText === 'string' && Number(goldText.replace(/[^\d]/g, '')) > 0
})
const sample = annotated.slice(0, sampleSize)
assert.equal(sample.length, sampleSize, 'The pinned CORD test split has fewer rows than requested')

const durations = []
let exactTotal = 0
let missingTotal = 0
let errors = 0
let goldDigitsVisible = 0
try {
  for (const record of sample) {
    const goldText = record.ground_truth?.gt_parse?.total?.total_price
    const gold = typeof goldText === 'string' ? Number(goldText.replace(/[^\d]/g, '')) : NaN
    if (!Number.isFinite(gold) || gold <= 0) throw new Error(`Missing total annotation for ${record.image_file}`)
    const original = readFileSync(join(datasetDir, 'images', record.image_file))
    const started = performance.now()
    try {
      const variants = await preprocessReceipt(original)
      const result = await extractTextFromImagesWithTesseract([original, ...variants.map((variant) => variant.buffer)])
      const parsed = parseOcrText(result.text)
      const durationMs = Math.round(performance.now() - started)
      durations.push(durationMs)
      if (parsed.amount === gold) exactTotal += 1
      if (!parsed.amount) missingTotal += 1
      const digitsVisible = result.text.replace(/\D/g, '').includes(String(gold))
      if (digitsVisible) goldDigitsVisible += 1
      console.log(JSON.stringify({ id: record.image_file, exactTotal: parsed.amount === gold, missingTotal: !parsed.amount, goldDigitsVisible: digitsVisible, durationMs, variantsRead: result.variantsRead, confidence: Math.round(result.confidence) }))
    } catch {
      errors += 1
      console.log(JSON.stringify({ id: record.image_file, processingError: true }))
    }
  }
} finally {
  await discardTesseractWorker()
}

const sorted = durations.toSorted((a, b) => a - b)
console.log(JSON.stringify({ dataset: 'CORD test split, first annotated rows in annotation order', sampleSize, exactTotal, missingTotal, goldDigitsVisible, errors, p50Ms: sorted[Math.ceil(sorted.length * 0.5) - 1] ?? null, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null }))
assert.equal(errors, 0, 'One or more public receipt images could not be processed')
