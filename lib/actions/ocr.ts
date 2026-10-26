'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matchCategorizationRule } from '@/lib/categorization/match'
import { discardTesseractWorker, extractTextFromImagesWithTesseract } from '@/lib/ocr/tesseract'
import { preprocessReceipt } from '@/lib/ocr/preprocess'
import { extractWithConfiguredPaddleOcr } from '@/lib/ocr/paddle'
import { parseOcrText } from '@/lib/ocr/parse'
import {
  extractTransactionFromImage,
  extractTransactionFromImageWithOcr,
  isUsableExtraction,
  type Extracted,
} from '@/lib/gemini/client'

const MAX_OCR_PROCESSING_MS = 180_000

export async function createTransactionFromReceipt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cameraFile = formData.get('receipt_camera')
  const uploadFile = formData.get('receipt_upload')
  const file = cameraFile instanceof File && cameraFile.size > 0
    ? cameraFile
    : uploadFile instanceof File && uploadFile.size > 0
      ? uploadFile
      : null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null

  if (!file) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('Selecciona una imagen o toma una foto del comprobante.'))
  }

  if (!file.type.startsWith('image/')) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('El archivo seleccionado no es una imagen válida.'))
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('La imagen no puede superar los 10 MB.'))
  }

  if (!account_id) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('Selecciona una cuenta para registrar la transacción.'))
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
  if (categoriesError) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('No se pudieron cargar las categorías. Intenta nuevamente.'))
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer())
  let imageVariants: Array<{ buffer: Buffer; mimeType: string; label: string }> = [
    { buffer: originalBuffer, mimeType: file.type, label: 'original' },
  ]
  try {
    imageVariants = [
      ...imageVariants,
      ...(await preprocessReceipt(originalBuffer)),
    ]
  } catch {
    // The original image remains available if preprocessing cannot run.
  }

  let extracted: Extracted | undefined
  let partialExtraction: Partial<Extracted> | undefined
  let extractionEngine: string | undefined
  let ocrResult: { text: string; confidence: number } = { text: '', confidence: 0 }
  const extractionErrors: string[] = []
  const categoryNames = (categories ?? []).map((category) => category.name)
  const processingDeadline = Date.now() + MAX_OCR_PROCESSING_MS
  const hasTimeRemaining = () => Date.now() < processingDeadline
  const geminiVariants = [
    ...imageVariants.filter((variant) => variant.label === 'enhanced'),
    ...imageVariants.filter((variant) => variant.label === 'original'),
  ].slice(0, 1)
  const processingController = new AbortController()
  const deadlineTimer = setTimeout(() => processingController.abort(), MAX_OCR_PROCESSING_MS)

  try {
    for (const variant of geminiVariants) {
      if (!hasTimeRemaining()) break
      try {
        const paddleResult = await extractWithConfiguredPaddleOcr(
          variant.buffer,
          variant.mimeType,
          categoryNames,
          processingController.signal,
        )
        if (paddleResult) {
          if (isUsableExtraction(paddleResult)) {
            extracted = {
              occurred_at: paddleResult.occurred_at ?? '',
              amount: paddleResult.amount ?? 0,
              description: paddleResult.description ?? '',
              suggested_category: paddleResult.suggested_category ?? '',
              confidence: paddleResult.confidence ?? 0,
            }
            extractionEngine = `paddleocr-${variant.label}`
            break
          }
          partialExtraction = paddleResult
          extractionEngine = `paddleocr-${variant.label}`
        }

        const geminiResult = await extractTransactionFromImage(
          variant.buffer.toString('base64'),
          variant.mimeType,
          categoryNames,
          processingController.signal,
        )
        if (isUsableExtraction(geminiResult)) {
          extracted = geminiResult
          extractionEngine = `gemini-vision-${variant.label}`
          break
        }
        if (!partialExtraction || geminiResult.amount > (partialExtraction.amount ?? 0)) {
          partialExtraction = geminiResult
          extractionEngine = `gemini-vision-${variant.label}`
        }
      } catch (error) {
        extractionErrors.push(`gemini-vision-${variant.label}: ${error instanceof Error ? error.message : 'error desconocido'}`)
        if (error instanceof Error && /(?:401|403|404|GEMINI_API_KEY)/i.test(error.message)) break
      }
    }

    if (!extracted && hasTimeRemaining()) {
      try {
        ocrResult = await extractTextFromImagesWithTesseract(
          imageVariants.filter((variant) => variant.label !== 'original').map((variant) => variant.buffer),
        )
        if (ocrResult.text && hasTimeRemaining()) {
          try {
            const geminiResult = await extractTransactionFromImageWithOcr(
              imageVariants.find((variant) => variant.label === 'enhanced')?.buffer.toString('base64')
                ?? originalBuffer.toString('base64'),
              'image/jpeg',
              ocrResult.text,
              categoryNames,
              processingController.signal,
            )
            if (isUsableExtraction(geminiResult)) {
              extracted = geminiResult
              extractionEngine = 'gemini-vision-ocr'
            } else if (!partialExtraction) {
              partialExtraction = geminiResult
              extractionEngine = 'gemini-vision-ocr'
            }
          } catch (error) {
            extractionErrors.push(`gemini-vision-ocr: ${error instanceof Error ? error.message : 'error desconocido'}`)
          }
        }

        if (!extracted) {
          const parsed = parseOcrText(ocrResult.text)
          if (isUsableExtraction(parsed)) {
            extracted = { ...parsed, suggested_category: '' }
            extractionEngine = 'tesseract-local'
          } else if (!partialExtraction) {
            partialExtraction = parsed
            extractionEngine = 'tesseract-local'
          }
        }
      } catch (error) {
        const tesseractError = error instanceof Error ? error : new Error('Error desconocido de Tesseract')
        extractionErrors.push(`tesseract-local: ${tesseractError.message}`)
        if (/Tesseract timeout/i.test(tesseractError.message)) await discardTesseractWorker()
      }
    }
  } finally {
    clearTimeout(deadlineTimer)
    processingController.abort()
  }

  if (!extracted) {
    extracted = {
      occurred_at: partialExtraction?.occurred_at || new Date().toISOString().slice(0, 10),
      amount: partialExtraction?.amount && partialExtraction.amount > 0 ? partialExtraction.amount : 0,
      description: partialExtraction?.description || 'Compra pendiente de identificar',
      suggested_category: partialExtraction?.suggested_category || '',
      confidence: partialExtraction?.confidence || 0,
    }
    extractionEngine = extractionEngine ?? 'manual-review'
  }

  // Rules-first: una regla aprendida/manual tiene prioridad sobre la sugerencia de Gemini.
  const rule = await matchCategorizationRule(supabase, user!.id, extracted!.description)
  const category = categories?.find((c) => c.name.toLowerCase() === extracted!.suggested_category.toLowerCase())
  const extractionConfidence = extractionEngine === 'tesseract-local'
    ? Math.max(
      Math.min(extracted!.confidence, ocrResult.confidence / 100),
      extracted!.amount > 0 ? 0.35 : 0,
    )
    : extracted!.confidence > 0
      ? extracted!.confidence
      : extracted!.amount > 0
        ? 0.35
        : 0

  const { error } = await supabase.from('transactions').insert({
    user_id: user!.id,
    occurred_at: extracted!.occurred_at,
    type: 'Gasto',
    category_id: rule?.category_id ?? category?.id ?? null,
    account_id,
    wallet_id,
    description: extracted!.description,
    amount: extracted!.amount,
    source: 'ocr',
    status: 'pendiente_revision',
    ai_confidence: rule ? 1 : extractionConfidence,
    raw_data: {
      engine: extractionEngine,
      extracted,
      ocr: ocrResult,
      extraction_errors: extractionErrors,
    },
  })

  if (error) redirect('/transacciones/ocr?error=' + encodeURIComponent(error.message))

  if (rule) {
    await supabase
      .from('categorization_rules')
      .update({ times_used: rule.times_used + 1, last_used_at: new Date().toISOString() })
      .eq('id', rule.id)
  }

  revalidatePath('/revision')
  redirect('/revision')
}