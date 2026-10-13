export type OcrResult = {
  text: string
  confidence: number
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>

let workerPromise: Promise<TesseractWorker> | undefined
let recognitionQueue = Promise.resolve()

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

export async function extractTextWithTesseract(image: Buffer): Promise<OcrResult> {
  const worker = await getWorker()
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

    const { data } = await worker.recognize(image, {}, { text: true })

    return {
      text: data.text.trim(),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
    }
  } finally {
    releaseQueue()
  }
}
