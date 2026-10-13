'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { matchCategorizationRule } from '@/lib/categorization/match'
import { discardTesseractWorker, extractTextWithTesseract } from '@/lib/ocr/tesseract'
import { parseOcrText } from '@/lib/ocr/parse'

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

  const { data: categories } = await supabase.from('categories').select('id, name').eq('is_active', true)

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  let extracted
  let ocrResult: { text: string; confidence: number } = { text: '', confidence: 0 }
  try {
    ocrResult = await extractTextWithTesseract(Buffer.from(base64, 'base64'))
    extracted = parseOcrText(ocrResult.text)
  } catch (err) {
    const message = (err as Error).message
    if (/Tesseract timeout/i.test(message)) await discardTesseractWorker()
    const userMessage = /Tesseract|worker|traineddata|language|timeout/i.test(message)
      ? 'No se pudo leer el comprobante a tiempo. Intenta con una imagen más nítida o registra la transacción manualmente.'
      : message
    redirect('/transacciones/ocr?error=' + encodeURIComponent(userMessage))
  }

  if (extracted.amount <= 0 || !extracted.occurred_at || !extracted.description) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent(
      'No se pudieron identificar con suficiente claridad la fecha, el total o la descripción. Intenta con una imagen más nítida.',
    ))
  }

  // Rules-first: una regla aprendida/manual tiene prioridad sobre la sugerencia de Gemini.
  const rule = await matchCategorizationRule(supabase, user!.id, extracted!.description)
  const category = categories?.find((c) => c.name === extracted!.suggested_category)

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
    ai_confidence: rule ? 1 : Math.min(extracted!.confidence, ocrResult.confidence / 100),
    raw_data: {
      engine: 'tesseract-local',
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