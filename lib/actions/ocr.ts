'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matchCategorizationRule } from '@/lib/categorization/match'
import { discardTesseractWorker, extractTextWithTesseract } from '@/lib/ocr/tesseract'
import { parseOcrText } from '@/lib/ocr/parse'
import {
  extractTransactionFromImage,
  extractTransactionFromImageWithOcr,
  isUsableExtraction,
  type Extracted,
} from '@/lib/gemini/client'

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

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  let extracted: Extracted | undefined
  let partialExtraction: Partial<Extracted> | undefined
  let extractionEngine: 'gemini-vision' | 'gemini-vision-ocr' | 'tesseract-local' | undefined
  let ocrResult: { text: string; confidence: number } = { text: '', confidence: 0 }
  let tesseractError: Error | undefined
  const categoryNames = (categories ?? []).map((category) => category.name)

  try {
    const geminiResult = await extractTransactionFromImage(base64, file.type, categoryNames)
    if (isUsableExtraction(geminiResult)) {
      extracted = geminiResult
      extractionEngine = 'gemini-vision'
    } else if (geminiResult.amount > 0) {
      partialExtraction = geminiResult
      extractionEngine = 'gemini-vision'
    }
  } catch {
    // The local OCR pass below is the recovery path for unavailable or incomplete vision results.
  }

  if (!extracted) {
    try {
      ocrResult = await extractTextWithTesseract(Buffer.from(base64, 'base64'))
      if (ocrResult.text) {
        try {
          const geminiResult = await extractTransactionFromImageWithOcr(
            base64,
            file.type,
            ocrResult.text,
            categoryNames,
          )
          if (isUsableExtraction(geminiResult)) {
            extracted = geminiResult
            extractionEngine = 'gemini-vision-ocr'
          } else if (geminiResult.amount > 0 && !partialExtraction) {
            partialExtraction = geminiResult
            extractionEngine = 'gemini-vision-ocr'
          }
        } catch {
          // Keep the parsed OCR result as a deterministic fallback.
        }
      }

      if (!extracted) {
        const parsed = parseOcrText(ocrResult.text)
        if (isUsableExtraction(parsed)) {
          extracted = {
            ...parsed,
            suggested_category: '',
          }
          extractionEngine = 'tesseract-local'
        } else if (parsed.amount > 0) {
          partialExtraction = parsed
        }
      }
    } catch (tesseractErr) {
      tesseractError = tesseractErr instanceof Error ? tesseractErr : new Error('Error desconocido de Tesseract')
      if (/Tesseract timeout/i.test(tesseractError.message)) await discardTesseractWorker()
    }
  }

  if (!extracted && partialExtraction?.amount && partialExtraction.amount > 0) {
    extracted = {
      occurred_at: partialExtraction.occurred_at || new Date().toISOString().slice(0, 10),
      amount: partialExtraction.amount,
      description: partialExtraction.description || 'Compra pendiente de identificar',
      suggested_category: partialExtraction.suggested_category || '',
      confidence: partialExtraction.confidence || 0.1,
    }
    extractionEngine = extractionEngine ?? 'tesseract-local'
  }

  if (!extracted || extracted.amount <= 0) {
    const errorMessage = tesseractError
      ? 'No se pudo identificar el total del comprobante. Verifica GEMINI_API_KEY o intenta con una imagen más nítida.'
      : 'No se pudo identificar el total del comprobante. Intenta con una imagen más nítida.'
    redirect('/transacciones/ocr?error=' + encodeURIComponent(
      errorMessage,
    ))
  }

  // Rules-first: una regla aprendida/manual tiene prioridad sobre la sugerencia de Gemini.
  const rule = await matchCategorizationRule(supabase, user!.id, extracted!.description)
  const category = categories?.find((c) => c.name.toLowerCase() === extracted!.suggested_category.toLowerCase())
  const extractionConfidence = extractionEngine === 'tesseract-local'
    ? Math.min(extracted!.confidence, ocrResult.confidence / 100)
    : extracted!.confidence

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