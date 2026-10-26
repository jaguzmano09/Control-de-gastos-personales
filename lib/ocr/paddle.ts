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
  if (!endpoint) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PADDLEOCR_TIMEOUT_MS)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

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
    })
    if (!response.ok) throw new Error(`PaddleOCR error: ${response.status}`)
    const result = await response.json() as PaddleResponse
    return {
      occurred_at: result.occurred_at ?? '',
      amount: typeof result.amount === 'number' ? result.amount : 0,
      description: result.description ?? '',
      suggested_category: result.suggested_category ?? '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
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
