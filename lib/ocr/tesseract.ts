export type OcrResult = {
  text: string
  confidence: number
}

export async function extractTextWithTesseract(image: Buffer): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa', undefined, {
    logger: () => undefined,
  })

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    const { data } = await worker.recognize(image, {}, { text: true })

    return {
      text: data.text.trim(),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
    }
  } finally {
    await worker.terminate()
  }
}
