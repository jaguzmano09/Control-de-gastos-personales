CREATE TABLE IF NOT EXISTS public.budget_rollover_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_budget_id uuid NOT NULL REFERENCES public.wallet_budgets(id) ON DELETE CASCADE,
  source_period_month date NOT NULL,
  target_period_month date NOT NULL,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_budget_id, target_period_month)
);

ALTER TABLE public.budget_rollover_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rollover reviews"
  ON public.budget_rollover_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
