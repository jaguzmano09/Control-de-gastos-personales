'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type TransactionType = Database['public']['Enums']['transaction_type']
type SavingsOperation = 'ingreso' | 'retiro'

export async function createManualTransaction(formData: FormData) {
  const supabase = await createClient()

  const occurred_at = formData.get('occurred_at') as string
  const type = formData.get('type') as TransactionType
  const savings_operation = (formData.get('savings_operation') as SavingsOperation) || null
  const submission_id = (formData.get('submission_id') as string) || null
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))
  const isNecessaryRaw = formData.get('is_necessary') as string | null
  const is_necessary = !isNecessaryRaw ? null : isNecessaryRaw === 'true'

  if (!occurred_at || !type || !account_id || !amount || amount <= 0 || (type === 'Ahorro' && !savings_operation)) {
    redirect('/transacciones/nueva?error=' + encodeURIComponent('Completa fecha, tipo, cuenta y un monto válido.'))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('transactions').insert({
    user_id: user!.id,
    occurred_at,
    type,
    category_id,
    account_id,
    wallet_id,
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

  const occurred_at = formData.get('occurred_at') as string
  const type = formData.get('type') as TransactionType
  const savings_operation = (formData.get('savings_operation') as SavingsOperation) || null
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))
  const isNecessaryRaw = formData.get('is_necessary') as string | null
  const is_necessary = !isNecessaryRaw ? null : isNecessaryRaw === 'true'

  if (!id || !occurred_at || !type || !account_id || !amount || amount <= 0 || (type === 'Ahorro' && !savings_operation)) {
    redirect(`/transacciones/${id}?error=` + encodeURIComponent('Completa fecha, tipo, cuenta y un monto válido.'))
  }

  const { error } = await supabase
    .from('transactions')
    .update({ occurred_at, type, savings_operation, category_id, account_id, wallet_id, description, amount, is_necessary })
    .eq('id', id)

  if (error) {
    redirect(`/transacciones/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/transacciones')
  revalidatePath(`/transacciones/${id}`)
  revalidatePath('/')
  revalidatePath('/presupuestos/categorias')
  revalidatePath('/presupuestos/bolsillos')
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
  revalidatePath('/presupuestos/bolsillos')
  redirect('/transacciones')
}
