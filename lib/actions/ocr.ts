'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayInBogota } from '@/lib/date-utils'
import { matchesImageSignature } from '@/lib/ocr/image-signature'
import { discardTesseractWorker, extractTextFromImagesWithTesseract } from '@/lib/ocr/tesseract'
import { preprocessReceipt, validateReceiptImage } from '@/lib/ocr/preprocess'
import { extractWithConfiguredPaddleOcr } from '@/lib/ocr/paddle'
import { parseOcrText } from '@/lib/ocr/parse'
import {
  extractTransactionFromImage,
  extractTransactionFromImageWithOcr,
  isGeminiPrivateDataProcessingApproved,
  isUsableExtraction,
  type Extracted,
} from '@/lib/gemini/client'

const MAX_OCR_PROCESSING_MS = 55_000
const MAX_OCR_UPLOAD_BYTES = 4 * 1024 * 1024

function isValidIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

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
  const accountValue = formData.get('account_id')
  const walletValue = formData.get('wallet_id')
  const submissionValue = formData.get('submission_id')
  const account_id = typeof accountValue === 'string' ? accountValue : ''
  const wallet_id = typeof walletValue === 'string' && walletValue ? walletValue : null
  const submission_id = typeof submissionValue === 'string' ? submissionValue : ''

  if (!file) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('Selecciona una imagen o toma una foto del comprobante.'))
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('El archivo seleccionado no es una imagen válida.'))
  }
  if (file.size > MAX_OCR_UPLOAD_BYTES) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('La imagen no puede superar los 4 MB después de comprimirla.'))
  }

  if (!account_id) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('Selecciona una cuenta para registrar la transacción.'))
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submission_id)) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('No pudimos iniciar el procesamiento. Actualiza la página e inténtalo nuevamente.'))
  }

  const { data: existing } = await supabase.from('transactions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('submission_id', submission_id)
    .maybeSingle()
  if (existing) redirect(existing.status === 'pendiente_revision' ? '/revision' : '/transacciones')

  const { data: account } = await supabase.from('accounts')
    .select('id, category_id, has_wallets')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!account) redirect('/transacciones/ocr?error=' + encodeURIComponent('La cuenta seleccionada ya no está disponible. Actualiza la página.'))

  const { data: accountWallets, error: accountWalletsError } = await supabase.from('wallets')
    .select('id, category_id')
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
  if (accountWalletsError) redirect('/transacciones/ocr?error=' + encodeURIComponent('No pudimos verificar la cuenta seleccionada. Inténtalo más tarde.'))

  const hasWallets = account.has_wallets || (accountWallets?.length ?? 0) > 0
  if (hasWallets && !wallet_id) redirect('/transacciones/ocr?error=' + encodeURIComponent('Selecciona el bolsillo de esta cuenta.'))
  if (!hasWallets && wallet_id) redirect('/transacciones/ocr?error=' + encodeURIComponent('La cuenta seleccionada no utiliza bolsillos.'))
  const wallet = wallet_id ? accountWallets?.find((item) => item.id === wallet_id) : null
  if (wallet_id && !wallet) redirect('/transacciones/ocr?error=' + encodeURIComponent('El bolsillo seleccionado no pertenece a esta cuenta.'))
  const assignedCategoryId = wallet?.category_id ?? account.category_id
  const memberAllowedExternalProcessing = formData.get('allow_external_processing') === 'on'
  const allowGemini = memberAllowedExternalProcessing && isGeminiPrivateDataProcessingApproved()
  const allowPaddle = memberAllowedExternalProcessing
    && Boolean(process.env.PADDLEOCR_URL)
    && process.env.PADDLEOCR_PRIVATE_DATA_PROCESSING_APPROVED === 'true'

  const originalBuffer = Buffer.from(await file.arrayBuffer())
  if (!matchesImageSignature(originalBuffer, file.type)) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('El contenido no corresponde al tipo de imagen seleccionado.'))
  }
  try {
    await validateReceiptImage(originalBuffer, file.type)
  } catch {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('La imagen está dañada o supera el límite de resolución permitido.'))
  }

  // Check retries before charging quota; the unique index remains the race-safe backstop.
  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ocr_quota')
  if (quotaError) redirect('/transacciones/ocr?error=' + encodeURIComponent('No pudimos verificar el límite de procesamiento. Inténtalo más tarde.'))
  if (!allowed) redirect('/transacciones/ocr?error=' + encodeURIComponent('Alcanzaste el límite de comprobantes. Inténtalo de nuevo más tarde.'))

  const { error: draftError } = await supabase.from('transactions').insert({
    user_id: user.id,
    occurred_at: todayInBogota(),
    type: 'Gasto',
    category_id: assignedCategoryId,
    account_id,
    wallet_id,
    description: 'Comprobante pendiente de lectura',
    amount: 0,
    source: 'ocr',
    status: 'pendiente_revision',
    submission_id,
    ai_confidence: 0,
    raw_data: { engine: 'processing' },
  })
  if (draftError) {
    if (draftError.code === '23505') redirect('/revision')
    redirect('/transacciones/ocr?error=' + encodeURIComponent('No se pudo iniciar la revisión del comprobante. Inténtalo de nuevo.'))
  }
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
        let paddleResult: Awaited<ReturnType<typeof extractWithConfiguredPaddleOcr>> = null
        if (allowPaddle) {
          try {
            paddleResult = await extractWithConfiguredPaddleOcr(variant.buffer, variant.mimeType, [], processingController.signal)
          } catch {
            paddleResult = null
          }
        }
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

        if (!allowGemini) continue
        const geminiResult = await extractTransactionFromImage(variant.buffer.toString('base64'), variant.mimeType, [], processingController.signal)
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
        if (error instanceof Error && /(?:401|403|404|GEMINI_API_KEY)/i.test(error.message)) break
      }
    }

    if (!extracted && hasTimeRemaining()) {
      try {
        ocrResult = await extractTextFromImagesWithTesseract(
          [...imageVariants.filter((variant) => variant.label !== 'original'), imageVariants[0]].map((variant) => variant.buffer),
          processingController.signal,
        )
        if (allowGemini && ocrResult.text && hasTimeRemaining()) {
          try {
            const geminiImage = imageVariants.find((variant) => variant.label === 'enhanced') ?? imageVariants[0]
            const geminiResult = await extractTransactionFromImageWithOcr(
              geminiImage.buffer.toString('base64'),
              geminiImage.mimeType,
              ocrResult.text,
              [],
              processingController.signal,
            )
            if (isUsableExtraction(geminiResult)) {
              extracted = geminiResult
              extractionEngine = 'gemini-vision-ocr'
            } else if (!partialExtraction) {
              partialExtraction = geminiResult
              extractionEngine = 'gemini-vision-ocr'
            }
          } catch {
            // Continue with the local OCR parse path without persisting provider diagnostics.
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
        const tesseractError = error instanceof Error ? error : new Error('Unknown Tesseract error')
        if (/Tesseract timeout/i.test(tesseractError.message)) await discardTesseractWorker()
      }
    }
  } finally {
    clearTimeout(deadlineTimer)
    processingController.abort()
  }

  if (!extracted) {
    const partialAmount = partialExtraction?.amount
    extracted = {
      occurred_at: isValidIsoDate(partialExtraction?.occurred_at) ? partialExtraction.occurred_at : todayInBogota(),
      amount: typeof partialAmount === 'number' && Number.isFinite(partialAmount) && partialAmount > 0 && partialAmount <= Number.MAX_SAFE_INTEGER ? partialAmount : 0,
      description: typeof partialExtraction?.description === 'string' && partialExtraction.description.trim()
        ? partialExtraction.description.slice(0, 240)
        : 'Compra pendiente de identificar',
      suggested_category: partialExtraction?.suggested_category || '',
      confidence: partialAmount && partialAmount > 0 && isValidIsoDate(partialExtraction?.occurred_at)
        && typeof partialExtraction?.description === 'string' && partialExtraction.description.trim()
        && typeof partialExtraction.confidence === 'number' && Number.isFinite(partialExtraction.confidence)
        ? Math.max(0, Math.min(1, partialExtraction.confidence))
        : partialAmount && partialAmount > 0 ? 0.25 : 0,
    }
    extractionEngine = extractionEngine ?? 'manual-review'
  }

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
  const safeConfidence = Number.isFinite(extractionConfidence) ? Math.max(0, Math.min(1, extractionConfidence)) : 0

  const { error } = await supabase.from('transactions').update({
    occurred_at: extracted!.occurred_at,
    category_id: assignedCategoryId,
    description: extracted!.description,
    amount: extracted!.amount,
    ai_confidence: safeConfidence,
    raw_data: {
      engine: extractionEngine,
    },
  }).eq('user_id', user.id).eq('submission_id', submission_id).eq('status', 'pendiente_revision')

  if (error) redirect('/revision?error=' + encodeURIComponent('El comprobante sigue en revisión. Completa los datos manualmente.'))

  revalidatePath('/revision')
  redirect('/revision')
}
