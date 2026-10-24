alter table public.transactions
  add column if not exists savings_operation text,
  add column if not exists submission_id uuid;

update public.transactions
set savings_operation = 'retiro'
where type = 'Ahorro' and savings_operation is null;

alter table public.transactions
  drop constraint if exists transactions_savings_operation_check;

alter table public.transactions
  add constraint transactions_savings_operation_check
  check (
    (type = 'Ahorro' and savings_operation in ('ingreso', 'retiro'))
    or (type <> 'Ahorro' and savings_operation is null)
  );

create unique index if not exists transactions_user_submission_id_idx
  on public.transactions (user_id, submission_id)
  where submission_id is not null;
