'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExpenseLocationStatusesWithYield } from '@/lib/data/expense-location-status'
import { isSameTransferLocation } from '@/lib/finance/transfer'
import type { Database } from '@/lib/types/database.types'

type TransactionType = Database['public']['Enums']['transaction_type']
type SavingsOperation = 'ingreso' | 'retiro'

export async function refreshExpenseLocationStatuses(periodMonth: string) {
  if (!/^\d{4}-\d{2}-01$/.test(periodMonth)) throw new Error('Mes inválido')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return getExpenseLocationStatusesWithYield(supabase, periodMonth)
}

export async function createManualTransaction(formData: FormData) {
  const supabase = await createClient()

  const occurred_at = formData.get('occurred_at') as string
  const type = formData.get('type') as TransactionType
  const savings_operation = (formData.get('savings_operation') as SavingsOperation) || null
  const submission_id = (formData.get('submission_id') as string) || null
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const destination_account_id = (formData.get('destination_account_id') as string) || null
  const destination_wallet_id = (formData.get('destination_wallet_id') as string) || null
  const destination_category_id = (formData.get('destination_category_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))
  const isNecessaryRaw = formData.get('is_necessary') as string | null
  const is_necessary = !isNecessaryRaw ? null : isNecessaryRaw === 'true'
  const purchaseDraftId = (formData.get('purchase_draft_id') as string) || null

  if (!occurred_at || !type || !account_id || !amount || amount <= 0 || type === 'Ahorro'
    || ((type === 'Gasto' || type === 'Ingreso' || type === 'Transferencia') && !category_id)
    || (type === 'Transferencia' && (!destination_account_id || !destination_category_id))) {
    redirect('/transacciones/nueva?error=' + encodeURIComponent('Completa fecha, tipo, cuenta y un monto válido.'))
  }

  if (type === 'Transferencia' && isSameTransferLocation(account_id, wallet_id, destination_account_id!, destination_wallet_id)) {
    redirect('/transacciones/nueva?error=' + encodeURIComponent('El origen y el destino deben ser ubicaciones diferentes.'))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (purchaseDraftId) {
    const { error } = await supabase.rpc('confirm_shopping_purchase', {
      p_draft_id: purchaseDraftId,
      p_occurred_at: occurred_at,
      // PostgreSQL permits NULL here; generated RPC types cannot express argument nullability.
      p_category_id: (category_id || null) as string,
      p_account_id: account_id,
      p_wallet_id: (wallet_id || null) as string,
      p_description: (description || null) as string,
      p_is_necessary: is_necessary as boolean,
      p_submission_id: submission_id as string,
    })
    if (error) redirect('/transacciones/nueva?purchase_draft_id=' + purchaseDraftId + '&error=' + encodeURIComponent(error.message))
    revalidatePath('/transacciones')
    revalidatePath('/')
    revalidatePath('/mercado')
    redirect('/transacciones')
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user!.id,
    occurred_at,
    type,
    category_id,
    account_id,
    wallet_id,
    destination_account_id,
    destination_wallet_id,
    destination_category_id,
    description,
    amount,
    is_necessary,
    source: 'manual',
    status: 'confirmada',
    savings_operation,
    submission_id,
  })

  if (error) {
    if (error.code === '23505' && submission_id) {
      revalidatePath('/transacciones')
      revalidatePath('/')
      redirect('/transacciones')
    }
    redirect('/transacciones/nueva?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/transacciones')
  revalidatePath('/')
  redirect('/transacciones')
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) redirect('/transacciones')
  const { data: existingTransaction } = await supabase.from('transactions').select('type').eq('id', id).maybeSingle()
  if (!existingTransaction) redirect('/transacciones')

  const occurred_at = formData.get('occurred_at') as string
  const type = formData.get('type') as TransactionType
  const savings_operation = (formData.get('savings_operation') as SavingsOperation) || null
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const destination_account_id = (formData.get('destination_account_id') as string) || null
  const destination_wallet_id = (formData.get('destination_wallet_id') as string) || null
  const destination_category_id = (formData.get('destination_category_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))
  const isNecessaryRaw = formData.get('is_necessary') as string | null
  const is_necessary = !isNecessaryRaw ? null : isNecessaryRaw === 'true'

  if (!id || !occurred_at || !type || !account_id || !amount || amount <= 0
    || (type === 'Ahorro' && existingTransaction.type !== 'Ahorro')
    || (type === 'Ahorro' && !savings_operation)
    || ((type === 'Gasto' || type === 'Ingreso' || type === 'Transferencia') && !category_id)
    || (type === 'Transferencia' && (!destination_account_id || !destination_category_id))) {
    redirect(`/transacciones/${id}?error=` + encodeURIComponent('Completa fecha, tipo, cuenta y un monto válido.'))
  }

  if (type === 'Transferencia' && isSameTransferLocation(account_id, wallet_id, destination_account_id!, destination_wallet_id)) {
    redirect(`/transacciones/${id}?error=` + encodeURIComponent('El origen y el destino deben ser ubicaciones diferentes.'))
  }

  const { error } = await supabase
    .from('transactions')
    .update({ occurred_at, type, savings_operation: type === 'Ahorro' ? savings_operation : null, category_id, account_id, wallet_id, destination_account_id, destination_wallet_id, destination_category_id, description, amount, is_necessary })
    .eq('id', id)

  if (error) {
    redirect(`/transacciones/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/transacciones')
  revalidatePath(`/transacciones/${id}`)
  revalidatePath('/')
  revalidatePath('/presupuestos/categorias')
  revalidatePath('/cuentas')
  redirect('/transacciones')
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/transacciones')
  revalidatePath('/')
  revalidatePath('/presupuestos/categorias')
  revalidatePath('/cuentas')
  redirect('/transacciones')
}
