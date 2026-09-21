'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const name = (formData.get('name') as string)?.trim()
  const has_wallets = formData.get('has_wallets') === 'true'
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('accounts').insert({ user_id: user.id, name, has_wallets })
  if (error) throw error

  revalidatePath('/cuentas')
}

export async function toggleAccountActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('accounts').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/cuentas')
}

export async function createWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const account_id = formData.get('account_id') as string
  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('wallets').insert({ user_id: user.id, account_id, name })
  if (error) throw error

  // Mantiene consistente el flag informativo has_wallets de la cuenta padre.
  await supabase.from('accounts').update({ has_wallets: true }).eq('id', account_id)

  revalidatePath('/cuentas')
}

export async function toggleWalletActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('wallets').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/cuentas')
}