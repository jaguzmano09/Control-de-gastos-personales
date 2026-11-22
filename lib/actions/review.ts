'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validTransactionFields } from '@/lib/finance/validate-transaction'
import { buildOcrReviewMetadata } from '@/lib/ocr/review-metrics'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value)

export async function confirmTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const id = formData.get('id')
  const category_id = formData.get('category_id')
  const account_id = formData.get('account_id')
  const wallet_id = formData.get('wallet_id')
  const descriptionValue = formData.get('description')
  const description = typeof descriptionValue === 'string' ? descriptionValue.trim() || null : null
  const occurred_at = formData.get('occurred_at')
  const amountValue = formData.get('amount')
  const amount = typeof amountValue === 'string' && amountValue.trim() ? Number(amountValue) : NaN

  if (!isUuid(id) || !isUuid(account_id) || !isUuid(category_id)
    || (wallet_id !== null && wallet_id !== '' && !isUuid(wallet_id))
    || typeof occurred_at !== 'string' || !Number.isFinite(amount) || amount <= 0) {
    redirect('/revision?error=invalid')
  }

  const { data: current, error: currentError } = await supabase
    .from('transactions')
    .select('amount, occurred_at, type, category_id, source, raw_data')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pendiente_revision')
    .maybeSingle()
  if (currentError || !current) redirect('/revision?error=unavailable')
  if (current.type !== 'Gasto' && current.type !== 'Ingreso') redirect('/revision?error=unsupported')
  if (!validTransactionFields(occurred_at, current.type, amount, description)) redirect('/revision?error=invalid')
  const ocrMetadata = current.raw_data && typeof current.raw_data === 'object' && !Array.isArray(current.raw_data)
    ? current.raw_data as { engine?: string; date_inferred?: boolean; amount_conflict?: boolean; document_kind?: string }
    : null
  if (current.source === 'ocr' && ocrMetadata?.document_kind === 'transfer') {
    redirect('/revision?error=unsupported')
  }

  const [{ data: account, error: accountError }, { data: category, error: categoryError }] = await Promise.all([
    supabase.from('accounts').select('id, category_id, has_wallets').eq('id', account_id).eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    supabase.from('categories').select('id').eq('id', category_id).eq('user_id', user.id).eq('is_active', true).maybeSingle(),
  ])
  if (accountError || categoryError || !account || !category) redirect('/revision?error=location')

  const { data: wallet, error: walletError } = wallet_id
    ? await supabase.from('wallets').select('id, category_id').eq('id', wallet_id).eq('account_id', account_id).eq('user_id', user.id).eq('is_active', true).maybeSingle()
    : { data: null, error: null }
  if (walletError || (wallet_id && !wallet) || (account.has_wallets && !wallet_id)) redirect('/revision?error=location')
  const assignedCategoryId = wallet ? wallet.category_id : account.category_id
  if ((assignedCategoryId && assignedCategoryId !== category_id)
    || (current.type === 'Gasto' && !assignedCategoryId)) {
    redirect('/revision?error=category')
  }

  const reviewMetadata = current.source === 'ocr'
    ? buildOcrReviewMetadata(current.raw_data, current, { amount, occurred_at })
    : undefined

  const { data: updated, error } = await supabase
    .from('transactions')
    .update({ status: 'confirmada', occurred_at, category_id, account_id, wallet_id: wallet_id || null, description, amount,
      ...(reviewMetadata ? { raw_data: reviewMetadata } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pendiente_revision')
    .select('id')
  if (error) redirect('/revision?error=save')
  if (!updated || updated.length === 0) redirect('/revision?error=unavailable')

  // Learn from a corrected category after the transaction has been confirmed.
  if (current.category_id !== category_id && description) {
    const pattern = description.trim().toLowerCase()

    const { data: existingRule } = await supabase
      .from('categorization_rules')
      .select('id, times_used')
      .eq('user_id', user.id)
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
        user_id: user.id,
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
  const id = formData.get('id')
  if (!isUuid(id)) redirect('/revision?error=invalid')
  const { data: updated, error } = await supabase.from('transactions')
    .update({ status: 'descartada' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pendiente_revision')
    .select('id')
  if (error) redirect('/revision?error=save')
  if (!updated?.length) redirect('/revision?error=unavailable')
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
