'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { extractTransactionFromImage } from '@/lib/gemini/client'
import { matchCategorizationRule } from '@/lib/categorization/match'

export async function createTransactionFromReceipt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('receipt') as File
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null

  if (!file || file.size === 0) {
    redirect('/transacciones/ocr?error=' + encodeURIComponent('Sube una foto de la factura.'))
  }

  const { data: categories } = await supabase.from('categories').select('id, name').eq('is_active', true)
  const categoryNames = (categories ?? []).map((c) => c.name)

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  let extracted
  try {
    extracted = await extractTransactionFromImage(base64, file.type, categoryNames)
  } catch (err) {
    const message = (err as Error).message
    const userMessage = /Gemini error: (429|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message)
      ? 'El lector automático está temporalmente ocupado. Intenta de nuevo más tarde o registra la transacción manualmente.'
      : message
    redirect('/transacciones/ocr?error=' + encodeURIComponent(userMessage))
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
    ai_confidence: rule ? 1 : extracted!.confidence,
    raw_data: extracted,
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