'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type TransactionType = Database['public']['Enums']['transaction_type']

export async function createManualTransaction(formData: FormData) {
  const supabase = await createClient()

  const occurred_at = formData.get('occurred_at') as string
  const type = formData.get('type') as TransactionType
  const category_id = (formData.get('category_id') as string) || null
  const account_id = formData.get('account_id') as string
  const wallet_id = (formData.get('wallet_id') as string) || null
  const description = (formData.get('description') as string) || null
  const amount = Number(formData.get('amount'))
  const isNecessaryRaw = formData.get('is_necessary') as string | null
  const is_necessary = !isNecessaryRaw ? null : isNecessaryRaw === 'true'

  if (!occurred_at || !type || !account_id || !amount || amount <= 0) {
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
  })

  if (error) {
    redirect('/transacciones/nueva?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/transacciones')
  revalidatePath('/')
  redirect('/transacciones')
}