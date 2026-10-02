INSERT INTO public.budget_rollover_reviews (
  user_id,
  source_budget_id,
  source_period_month,
  target_period_month,
  wallet_id,
  account_id,
  amount,
  category_id,
  status
)
SELECT
  current_budget.user_id,
  source_budget.id,
  source_budget.period_month,
  current_budget.period_month,
  current_budget.wallet_id,
  current_budget.account_id,
  current_budget.rollover_amount,
  NULL,
  'pending'
FROM public.wallet_budgets AS current_budget
JOIN public.wallet_budgets AS source_budget
  ON source_budget.user_id = current_budget.user_id
  AND source_budget.period_month = (current_budget.period_month - INTERVAL '1 month')::date
  AND (
    (current_budget.wallet_id IS NOT NULL AND source_budget.wallet_id = current_budget.wallet_id)
    OR (
      current_budget.wallet_id IS NULL
      AND source_budget.wallet_id IS NULL
      AND source_budget.account_id = current_budget.account_id
    )
  )
WHERE current_budget.rollover_amount > 0
ON CONFLICT (source_budget_id, target_period_month) DO NOTHING;
