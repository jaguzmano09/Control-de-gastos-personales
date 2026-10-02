ALTER TABLE public.category_budgets
ADD COLUMN IF NOT EXISTS rollover_amount numeric NOT NULL DEFAULT 0;
