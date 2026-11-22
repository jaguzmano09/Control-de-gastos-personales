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
  { merchant: 'MINIMERCADO SAN JOSE', date: '15/11/2026', total: '$ 27.800', expectedAmount: 27800, expectedDate: '2026-11-15', layout: 'dense' },
  { merchant: 'DROGUERIA DEL BARRIO', date: '14/11/2026', total: '$ 16.400', expectedAmount: 16400, expectedDate: '2026-11-14', layout: 'dense', transform: 'dim' },
  { merchant: 'TIENDA LA ESQUINA', date: '13/11/2026', total: '$ 31.900', expectedAmount: 31900, expectedDate: '2026-11-13', layout: 'dense', transform: 'small' },
  { merchant: 'CAFETERIA DEL CENTRO', date: '12/11/2026', total: '$ 9.600', expectedAmount: 9600, expectedDate: '2026-11-12', layout: 'dense', transform: 'blur' },
]

function receiptSvg(receipt) {
  if (receipt.layout === 'dense') {
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1100">
      <rect width="720" height="1100" fill="white"/>
      <g fill="#252525" font-family="Arial" font-size="31">
        <text x="44" y="100">${receipt.merchant}</text>
        <text x="44" y="170">NIT 900123456-7</text>
        <text x="44" y="240">FACTURA No 123456</text>
        <text x="44" y="310">FECHA ${receipt.date}</text>
        <text x="44" y="415">ARTICULO A                $ 7.500</text>
        <text x="44" y="485">ARTICULO B                $ 8.900</text>
        <text x="44" y="555">SUBTOTAL                  $ 16.400</text>
        <text x="44" y="625">IVA                       $ 3.116</text>
        <text x="44" y="735">TOTAL A PAGAR ${receipt.total}</text>
        <text x="44" y="835">EFECTIVO                  $ 50.000</text>
        <text x="44" y="905">CAMBIO                    $ 18.100</text>
      </g>
    </svg>`)
  }
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
const durations = []
const failures = []
try {
  for (const fixture of fixtures) {
    let image = sharp(receiptSvg(fixture)).png()
    if (fixture.transform === 'blur') image = image.blur(1.2)
    if (fixture.transform === 'rotate') image = image.rotate(3, { background: '#fff' })
    if (fixture.transform === 'dim') image = image.modulate({ brightness: 0.65 }).blur(0.6)
    if (fixture.transform === 'small') image = image.resize({ width: 520 })
    const original = await image.toBuffer()
    const started = performance.now()
    const variants = await preprocessReceipt(original)
    const preprocessMs = Math.round(performance.now() - started)
    const result = await extractTextFromImagesWithTesseract([original, ...variants.map((variant) => variant.buffer)])
    const parsed = parseOcrText(result.text)
    const kind = result.documentKind ?? classifyReceiptDocument(result.text)
    const amountCorrect = parsed.amount === fixture.expectedAmount
    const dateCorrect = parsed.occurred_at === fixture.expectedDate
    if (!amountCorrect || !dateCorrect || (fixture.expectedKind === 'transfer' && kind !== 'transfer')) failures.push({ merchant: fixture.merchant, amount: parsed.amount, date: parsed.occurred_at, kind })
    if (parsed.amount === fixture.expectedAmount) exactAmount += 1
    if (parsed.occurred_at === fixture.expectedDate) exactDate += 1
    if (fixture.expectedKind === 'transfer' && kind === 'transfer') transferDetected += 1
    const durationMs = Math.round(performance.now() - started)
    durations.push(durationMs)
    console.log(JSON.stringify({ merchant: fixture.merchant, layout: fixture.layout ?? 'simple', transform: fixture.transform ?? 'clean', amountCorrect, dateCorrect, kind, preprocessMs, durationMs, variantsRead: result.variantsRead, ocrConfidence: Math.round(result.confidence) }))
  }
} finally {
  await discardTesseractWorker()
}

const sorted = durations.toSorted((a, b) => a - b)
console.log(JSON.stringify({ fixtures: fixtures.length, exactAmount, exactDate, transferDetected, p50Ms: sorted[Math.ceil(sorted.length * 0.5) - 1], p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], failures }))
assert.equal(exactAmount, fixtures.length, 'Synthetic receipt amount accuracy regressed')
assert.equal(exactDate, fixtures.length, 'Synthetic receipt date accuracy regressed')
assert.equal(transferDetected, 1, 'Synthetic transfer voucher classification regressed')
