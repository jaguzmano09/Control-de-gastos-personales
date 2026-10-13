export type OcrResult = {
  text: string
  confidence: number
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>

let workerPromise: Promise<TesseractWorker> | undefined
let recognitionQueue = Promise.resolve()
const OCR_TIMEOUT_MS = 30_000

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('spa', undefined, {
        logger: () => undefined,
        cacheMethod: 'write',
      }),
    )
  }

  return workerPromise
}

function resetWorker() {
  const currentWorker = workerPromise
  workerPromise = undefined
  void currentWorker?.then((worker) => worker.terminate()).catch(() => undefined)
}

export async function extractTextWithTesseract(image: Buffer): Promise<OcrResult> {
  const worker = await Promise.race([
    getWorker(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), OCR_TIMEOUT_MS)),
  ])
  const previousRecognition = recognitionQueue
  let releaseQueue!: () => void
  recognitionQueue = new Promise((resolve) => { releaseQueue = resolve })
  await previousRecognition

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6' as import('tesseract.js').PSM,
      user_defined_dpi: '300',
    })

    const { data } = await Promise.race([
      worker.recognize(image, {}, { text: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tesseract timeout')), OCR_TIMEOUT_MS)),
    ])

    return {
      text: data.text.trim(),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
    }
  } finally {
    releaseQueue()
  }
}

export async function discardTesseractWorker() {
  resetWorker()
}
