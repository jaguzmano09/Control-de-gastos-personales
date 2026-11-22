export type OcrResult = {
  text: string
  confidence: number
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>

let workerPromise: Promise<TesseractWorker> | undefined
let recognitionQueue = Promise.resolve()
const OCR_TIMEOUT_MS = 20_000
const TESSERACT_WORKER_PATH = require.resolve('tesseract.js/src/worker-script/node/index.js')

async function raceWithOcrDeadline<T>(task: Promise<T>, signal?: AbortSignal): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let abortHandler: (() => void) | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Tesseract timeout')), OCR_TIMEOUT_MS)
    if (signal) {
      abortHandler = () => reject(new Error('Tesseract cancelled'))
      signal.addEventListener('abort', abortHandler, { once: true })
      if (signal.aborted) abortHandler()
    }
  })
  try {
    return await Promise.race([task, deadline])
  } finally {
    if (timeout) clearTimeout(timeout)
    if (signal && abortHandler) signal.removeEventListener('abort', abortHandler)
  }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('spa', undefined, {
        logger: () => undefined,
        cacheMethod: 'none',
        workerPath: TESSERACT_WORKER_PATH,
      }))
      .catch((error) => {
        workerPromise = undefined
        throw error
      })
  }

  return workerPromise
}

function resetWorker() {
  const currentWorker = workerPromise
  workerPromise = undefined
  void currentWorker?.then((worker) => worker.terminate()).catch(() => undefined)
}

export async function extractTextWithTesseract(image: Buffer, signal?: AbortSignal): Promise<OcrResult> {
  const previousRecognition = recognitionQueue
  let releaseQueue!: () => void
  recognitionQueue = new Promise((resolve) => { releaseQueue = resolve })

  try {
    await raceWithOcrDeadline(previousRecognition, signal)
    const worker = await raceWithOcrDeadline(getWorker(), signal)
    await raceWithOcrDeadline(worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6' as import('tesseract.js').PSM,
      user_defined_dpi: '300',
    }), signal)

    const { data } = await raceWithOcrDeadline(worker.recognize(image, {}, { text: true }), signal)

    return {
      text: data.text.trim(),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
    }
  } catch (error) {
    resetWorker()
    throw error
  } finally {
    releaseQueue()
  }
}

export async function extractTextFromImagesWithTesseract(images: Buffer[], signal?: AbortSignal): Promise<OcrResult> {
  let best: OcrResult = { text: '', confidence: 0 }
  const errors: string[] = []

  for (const image of images) {
    try {
      const result = await extractTextWithTesseract(image, signal)
      if (result.confidence > best.confidence || (!best.text && result.text)) best = result
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.message === 'Tesseract cancelled')) throw error
      errors.push(error instanceof Error ? error.message : 'Error desconocido de Tesseract')
    }
  }

  if (!best.text && errors.length > 0) throw new Error(errors.join('; '))
  return best
}

export async function discardTesseractWorker() {
  resetWorker()
}
