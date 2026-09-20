'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertCategoryBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const category_id = formData.get('category_id') as string
  const period_month = formData.get('period_month') as string
  const amount = Number(formData.get('amount'))
  const thresholdRaw = formData.get('alert_threshold_percent') as string
  const alert_threshold_percent = thresholdRaw ? Number(thresholdRaw) : null

  const { error } = await supabase
    .from('category_budgets')
    .upsert(
      { user_id: user.id, category_id, period_month, amount, alert_threshold_percent },
      { onConflict: 'user_id,category_id,period_month' }
    )
  if (error) throw error

  revalidatePath('/presupuestos/categorias')
  revalidatePath('/')
}

export async function upsertWalletBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const wallet_id = formData.get('wallet_id') as string
  const period_month = formData.get('period_month') as string
  const assigned_amount = Number(formData.get('assigned_amount'))
  const thresholdRaw = formData.get('alert_threshold_percent') as string
  const alert_threshold_percent = thresholdRaw ? Number(thresholdRaw) : null

  // rollover_amount nunca se edita a mano — lo escribe el job de rollover del día 1.
  // Aquí solo lo preservamos si ya existía la fila.
  const { data: existing } = await supabase
    .from('wallet_budgets')
    .select('rollover_amount')
    .eq('user_id', user.id)
    .eq('wallet_id', wallet_id)
    .eq('period_month', period_month)
    .maybeSingle()

  const { error } = await supabase
    .from('wallet_budgets')
    .upsert(
      {
        user_id: user.id,
        wallet_id,
        period_month,
        assigned_amount,
        rollover_amount: existing?.rollover_amount ?? 0,
        alert_threshold_percent,
      },
      { onConflict: 'user_id,wallet_id,period_month' }
    )
  if (error) throw error

  revalidatePath('/presupuestos/bolsillos')
  revalidatePath('/')
}