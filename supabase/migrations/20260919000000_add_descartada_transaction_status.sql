-- Enables the status used when a review decision discards a transaction.
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'descartada';
