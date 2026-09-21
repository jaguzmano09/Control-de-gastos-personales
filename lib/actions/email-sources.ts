'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createEmailSource(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const account_id = formData.get('account_id') as string
  const email_address = (formData.get('email_address') as string)?.trim().toLowerCase()
  if (!email_address) throw new Error('El correo es obligatorio')

  const { error } = await supabase.from('email_sources').insert({ user_id: user.id, account_id, email_address })
  if (error) throw error
  revalidatePath('/correo')
}

export async function toggleEmailSourceActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('email_sources').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/correo')
}