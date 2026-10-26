-- Keeps discard actions compatible with databases where the original migration
-- was not applied or was marked as applied before the enum value was created.
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'descartada';
