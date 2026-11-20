-- Pin public routines to a safe, empty search path. Their table references
-- are schema-qualified, and built-in functions resolve through pg_catalog.
alter function public.set_updated_at()
  set search_path = '';

alter function public.validate_transaction_wallet()
  set search_path = '';

alter function public.sync_budget_from_income()
  set search_path = '';

alter function public.validate_shopping_list_store_owner()
  set search_path = '';

alter function public.validate_shopping_item_owner()
  set search_path = '';

alter function public.complete_shopping_list(uuid, date)
  set search_path = '';

alter function public.reopen_shopping_list(uuid)
  set search_path = '';

alter function public.validate_yield_config()
  set search_path = '';

alter function public.validate_yield_rate()
  set search_path = '';

alter function public.prevent_account_wallet_mode_change()
  set search_path = '';

alter function public.prevent_wallet_for_yield_account()
  set search_path = '';

alter function public.confirm_shopping_purchase(
  uuid,
  date,
  uuid,
  uuid,
  uuid,
  text,
  boolean,
  uuid
)
  set search_path = '';
