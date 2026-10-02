'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function assignRolloverCategory(formData: FormData) {
  const supabase = await createClient()
  const reviewId = formData.get('review_id') as string
  const categoryId = formData.get('category_id') as string
  if (!reviewId || !categoryId) throw new Error('Faltan datos para asignar la categoría')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: review, error: reviewError } = await supabase
    .from('budget_rollover_reviews')
    .select('id, amount, target_period_month')
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .single()
  if (reviewError) throw reviewError

  const { data: currentBudget, error: budgetError } = await supabase
    .from('category_budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('period_month', review.target_period_month)
    .maybeSingle()
  if (budgetError) throw budgetError

  const budgetQuery = currentBudget
    ? supabase.from('category_budgets').update({ rollover_amount: review.amount }).eq('id', currentBudget.id)
    : supabase.from('category_budgets').insert({
        user_id: user.id,
        category_id: categoryId,
        period_month: review.target_period_month,
        amount: 0,
        rollover_amount: review.amount,
        alert_threshold_percent: null,
      })
  const { error: saveBudgetError } = await budgetQuery
  if (saveBudgetError) throw saveBudgetError

  const { error: updateReviewError } = await supabase
    .from('budget_rollover_reviews')
    .update({ category_id: categoryId, status: 'assigned' })
    .eq('id', review.id)
    .eq('user_id', user.id)
  if (updateReviewError) throw updateReviewError

  revalidatePath('/revision')
  revalidatePath('/')
  revalidatePath('/presupuestos/categorias')
}
