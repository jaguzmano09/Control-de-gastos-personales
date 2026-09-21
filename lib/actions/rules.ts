'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const pattern = (formData.get('pattern') as string)?.trim().toLowerCase()
  const match_type = formData.get('match_type') as string
  const category_id = formData.get('category_id') as string
  const priorityRaw = formData.get('priority') as string
  const priority = priorityRaw ? Number(priorityRaw) : 0

  if (!pattern || !category_id) throw new Error('Patrón y categoría son obligatorios')

  const { error } = await supabase.from('categorization_rules').insert({
    user_id: user.id,
    pattern,
    match_type,
    category_id,
    priority,
    source: 'manual',
  })
  if (error) throw error

  revalidatePath('/reglas')
}

export async function toggleRuleActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('categorization_rules').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/reglas')
}

export async function deleteRule(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const { error } = await supabase.from('categorization_rules').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/reglas')
}