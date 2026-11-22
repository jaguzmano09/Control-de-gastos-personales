import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import sharp from 'sharp'

// Node's TypeScript runner needs require for the existing Tesseract worker path.
globalThis.require = createRequire(import.meta.url)
const { preprocessReceipt } = await import('../lib/ocr/preprocess.ts')
const { extractTextFromImagesWithTesseract, discardTesseractWorker } = await import('../lib/ocr/tesseract.ts')
const { parseOcrText } = await import('../lib/ocr/parse.ts')
const { classifyReceiptDocument } = await import('../lib/ocr/document-kind.ts')

const fixtures = [
  { merchant: 'PANADERIA CENTRAL', date: '20/11/2026', total: '$ 20.000', expectedAmount: 20000, expectedDate: '2026-11-20' },
  { merchant: 'FARMACIA LOCAL', date: '21/11/2026', total: '$ 12.500', expectedAmount: 12500, expectedDate: '2026-11-21' },
  { merchant: 'TIENDA BARRIO', date: '19/11/2026', total: '$ 35.000', expectedAmount: 35000, expectedDate: '2026-11-19' },
  { merchant: 'CAFETERIA LOCAL', date: '18/11/2026', total: '$ 18.450', expectedAmount: 18450, expectedDate: '2026-11-18', transform: 'blur' },
  { merchant: 'PAPELERIA LOCAL', date: '17/11/2026', total: '$ 42.900', expectedAmount: 42900, expectedDate: '2026-11-17', transform: 'rotate' },
  { merchant: 'COMPROBANTE DE TRANSFERENCIA', date: '16/11/2026', total: '$ 50.000', expectedAmount: 50000, expectedDate: '2026-11-16', expectedKind: 'transfer' },
]

function receiptSvg(receipt) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">
    <rect width="1200" height="750" fill="white"/>
    <g fill="#111" font-family="Arial" font-size="54">
      <text x="80" y="130">${receipt.merchant}</text>
      <text x="80" y="270">FECHA ${receipt.date}</text>
      <text x="80" y="410">FACTURA No 123456</text>
      <text x="80" y="570">TOTAL ${receipt.total}</text>
    </g>
  </svg>`)
}

let exactAmount = 0
let exactDate = 0
let transferDetected = 0
try {
  for (const fixture of fixtures) {
    let image = sharp(receiptSvg(fixture)).png()
    if (fixture.transform === 'blur') image = image.blur(1.2)
    if (fixture.transform === 'rotate') image = image.rotate(3, { background: '#fff' })
    const original = await image.toBuffer()
    const started = performance.now()
    const variants = await preprocessReceipt(original)
    const result = await extractTextFromImagesWithTesseract([original, ...variants.map((variant) => variant.buffer)])
    const parsed = parseOcrText(result.text)
    const kind = classifyReceiptDocument(result.text)
    if (parsed.amount === fixture.expectedAmount) exactAmount += 1
    if (parsed.occurred_at === fixture.expectedDate) exactDate += 1
    if (fixture.expectedKind === 'transfer' && kind === 'transfer') transferDetected += 1
    console.log(JSON.stringify({ merchant: fixture.merchant, transform: fixture.transform ?? 'clean', amountCorrect: parsed.amount === fixture.expectedAmount, dateCorrect: parsed.occurred_at === fixture.expectedDate, kind, durationMs: Math.round(performance.now() - started), variantsRead: result.variantsRead, ocrConfidence: Math.round(result.confidence) }))
  }
} finally {
  await discardTesseractWorker()
}

console.log(JSON.stringify({ fixtures: fixtures.length, exactAmount, exactDate, transferDetected }))
assert.equal(exactAmount, fixtures.length, 'Synthetic receipt amount accuracy regressed')
assert.equal(exactDate, fixtures.length, 'Synthetic receipt date accuracy regressed')
assert.equal(transferDetected, 1, 'Synthetic transfer voucher classification regressed')
