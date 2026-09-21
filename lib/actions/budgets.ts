'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateCategoryBudgetThreshold(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const category_id = formData.get('category_id') as string
  const period_month = formData.get('period_month') as string
  const alert_threshold_percent = Number(formData.get('alert_threshold_percent'))

  const { data: updated, error: updateError } = await supabase
    .from('category_budgets')
    .update({ alert_threshold_percent })
    .eq('user_id', user.id)
    .eq('category_id', category_id)
    .eq('period_month', period_month)
    .select('category_id')

  if (updateError) throw updateError

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('category_budgets')
      .insert({ user_id: user.id, category_id, period_month, amount: 0, alert_threshold_percent })
    if (insertError) throw insertError
  }

  revalidatePath('/presupuestos/categorias')
}

export async function updateWalletBudgetThreshold(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const wallet_id = formData.get('wallet_id') as string
  const period_month = formData.get('period_month') as string
  const alert_threshold_percent = Number(formData.get('alert_threshold_percent'))

  const { data: updated, error: updateError } = await supabase
    .from('wallet_budgets')
    .update({ alert_threshold_percent })
    .eq('user_id', user.id)
    .eq('wallet_id', wallet_id)
    .eq('period_month', period_month)
    .select('wallet_id')

  if (updateError) throw updateError

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('wallet_budgets')
      .insert({ user_id: user.id, wallet_id, period_month, assigned_amount: 0, rollover_amount: 0, alert_threshold_percent })
    if (insertError) throw insertError
  }

  revalidatePath('/presupuestos/bolsillos')
}