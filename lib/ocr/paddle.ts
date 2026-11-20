import type { Extracted } from '@/lib/gemini/client'

const PADDLEOCR_TIMEOUT_MS = 10_000

type PaddleResponse = {
  occurred_at?: string
  amount?: number
  description?: string
  suggested_category?: string
  confidence?: number
  text?: string
}

export async function extractWithConfiguredPaddleOcr(
  image: Buffer,
  mimeType: string,
  categoryNames: string[],
  signal?: AbortSignal,
): Promise<Partial<Extracted> | null> {
  const endpoint = process.env.PADDLEOCR_URL
  if (!endpoint || process.env.PADDLEOCR_PRIVATE_DATA_PROCESSING_APPROVED !== 'true') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PADDLEOCR_TIMEOUT_MS)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: image.toString('base64'),
        mime_type: mimeType,
        categories: categoryNames,
      }),
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`PaddleOCR error: ${response.status}`)
    const result = await response.json() as PaddleResponse
    return {
      occurred_at: typeof result.occurred_at === 'string' ? result.occurred_at.slice(0, 20) : '',
      amount: typeof result.amount === 'number' && Number.isFinite(result.amount) ? result.amount : 0,
      description: typeof result.description === 'string' ? result.description.trim().slice(0, 240) : '',
      suggested_category: typeof result.suggested_category === 'string' ? result.suggested_category.trim().slice(0, 80) : '',
      confidence: typeof result.confidence === 'number' && Number.isFinite(result.confidence) ? Math.max(0, Math.min(1, result.confidence)) : 0,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`PaddleOCR timeout después de ${PADDLEOCR_TIMEOUT_MS / 1000}s`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
