'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmTransaction(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))

  const { data: current } = await supabase
    .from('transactions')
    .select('category_id')
    .eq('id', id)
    .single()

  const { data: updated, error } = await supabase
    .from('transactions')
    .update({ status: 'confirmada', category_id, account_id, wallet_id, description, amount })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!updated || updated.length === 0) throw new Error('No se encontró la transacción para confirmar')

  // Aprendizaje: si corregiste la categoría sugerida, crea/actualiza una regla
  if (current && category_id && current.category_id !== category_id && description) {
    const { data: { user } } = await supabase.auth.getUser()
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
  const id = formData.get('id') as string
  const { error } = await supabase.from('transactions').update({ status: 'descartada' }).eq('id', id)
  if (error) throw error
  revalidatePath('/revision')
  revalidatePath('/transacciones')
  redirect('/transacciones')
}

export async function resolveDuplicate(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const matchedId = (formData.get('matched_transaction_id') as string) || null
  const wasDuplicate = formData.get('was_duplicate') === 'true'
  const { data: { user } } = await supabase.auth.getUser()

  const { error: updateError } = await supabase
    .from('transactions')
    .update({ status: wasDuplicate ? 'descartada' : 'confirmada' })
    .eq('id', id)
  if (updateError) throw updateError

  const { error: logError } = await supabase.from('duplicate_review_log').insert({
    user_id: user!.id,
    transaction_id: id,
    matched_transaction_id: matchedId,
    was_duplicate: wasDuplicate,
  })
  if (logError) throw logError

  revalidatePath('/revision')
  revalidatePath('/transacciones')
  revalidatePath('/')
}