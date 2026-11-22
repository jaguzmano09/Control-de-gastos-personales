'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const id = formData.get('id') as string
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const description = (formData.get('description') as string) || null
  const occurred_at = formData.get('occurred_at') as string
  const amount = Number(formData.get('amount'))

  if (!occurred_at || !Number.isFinite(amount) || amount <= 0 || !account_id) {
    throw new Error('Fecha, cuenta y monto son obligatorios para confirmar la transacción')
  }

  const { data: current } = await supabase
    .from('transactions')
    .select('category_id, source, raw_data')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pendiente_revision')
    .maybeSingle()
  if (!current) throw new Error('No se encontró un borrador pendiente para confirmar')
  const ocrMetadata = current.raw_data && typeof current.raw_data === 'object' && !Array.isArray(current.raw_data)
    ? current.raw_data as { document_kind?: string }
    : null
  if (current.source === 'ocr' && ocrMetadata?.document_kind === 'transfer') {
    throw new Error('Este comprobante debe registrarse como transferencia, no como gasto')
  }

  const { data: updated, error } = await supabase
    .from('transactions')
    .update({ status: 'confirmada', occurred_at, category_id, account_id, wallet_id, description, amount })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pendiente_revision')
    .select('id')
  if (error) throw error
  if (!updated || updated.length === 0) throw new Error('No se encontró la transacción para confirmar')

  // Learn from a corrected category after the transaction has been confirmed.
  if (current && category_id && current.category_id !== category_id && description) {
    const pattern = description.trim().toLowerCase()

    const { data: existingRule } = await supabase
      .from('categorization_rules')
      .select('id, times_used')
      .eq('user_id', user!.id)
      .eq('pattern', pattern)
      .eq('match_type', 'contains')
      .maybeSingle()

    if (existingRule) {
      await supabase
        .from('categorization_rules')
        .update({ category_id, times_used: existingRule.times_used + 1, last_used_at: new Date().toISOString() })
        .eq('id', existingRule.id)
    } else {
      await supabase.from('categorization_rules').insert({
        user_id: user!.id,
        pattern,
        match_type: 'contains',
        category_id,
        source: 'auto_learned',
        times_used: 1,
        last_used_at: new Date().toISOString(),
      })
    }
  }

  revalidatePath('/revision')
  revalidatePath('/transacciones')
  revalidatePath('/')
  redirect('/transacciones')
}

export async function discardTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const id = formData.get('id') as string
  const { error } = await supabase.from('transactions').update({ status: 'descartada' }).eq('id', id).eq('user_id', user.id).eq('status', 'pendiente_revision')
  if (error) throw error
  revalidatePath('/revision')
  revalidatePath('/transacciones')
  redirect('/transacciones')
}

export async function resolveDuplicate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const id = formData.get('id')
  const matchedId = formData.get('matched_transaction_id')
  const duplicateDecision = formData.get('was_duplicate')
  const isUuid = (value: unknown): value is string => typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  if (!isUuid(id)) throw new Error('No se encontró el movimiento duplicado')
  if (matchedId !== null && matchedId !== '' && !isUuid(matchedId)) throw new Error('La coincidencia no es válida')
  if (duplicateDecision !== 'true' && duplicateDecision !== 'false') throw new Error('La decisión no es válida')
  const wasDuplicate = duplicateDecision === 'true'

  if (matchedId) {
    const { data: match, error: matchError } = await supabase.from('transactions')
      .select('id')
      .eq('id', matchedId)
      .eq('user_id', user.id)
      .eq('status', 'confirmada')
      .maybeSingle()
    if (matchError || !match) throw new Error('La coincidencia ya no está disponible')
  }

  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update({ status: wasDuplicate ? 'descartada' : 'confirmada' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'duplicado')
    .select('id')
  if (updateError) throw updateError
  if (!updated?.length) throw new Error('El movimiento duplicado ya no está disponible')

  const { error: logError } = await supabase.from('duplicate_review_log').insert({
    user_id: user.id,
    transaction_id: id,
    matched_transaction_id: matchedId || null,
    was_duplicate: wasDuplicate,
  })
  if (logError) throw logError

  revalidatePath('/revision')
  revalidatePath('/transacciones')
  revalidatePath('/')
}
