-- Corrección interna única para distribuir el saldo disponible mostrado por DALE.
-- No se expone como una acción de usuario y es idempotente mediante submission_id.

do $$
declare
  v_user_id uuid;
  v_account_id uuid;
  v_subscription_id uuid;
  v_other_id uuid;
  v_balance numeric(14, 2) := 121280.00;
  v_subscription_amount numeric(14, 2) := 76998.59;
  v_other_amount numeric(14, 2);
  v_occurred_at timestamptz := now();
  v_marker text := 'Reasignación interna de saldo DALE';
  v_source_submission_id uuid := gen_random_uuid();
  v_subscription_submission_id uuid := gen_random_uuid();
  v_other_submission_id uuid := gen_random_uuid();
begin
  select a.id, a.user_id
    into v_account_id, v_user_id
  from public.accounts a
  where lower(trim(a.name)) = 'dale'
  order by a.created_at
  limit 1;

  if v_account_id is null then
    raise exception 'No se encontró la cuenta DALE';
  end if;

  select w.id
    into v_subscription_id
  from public.wallets w
  where w.account_id = v_account_id
    and lower(trim(w.name)) = 'suscripciones'
  limit 1;

  select w.id
    into v_other_id
  from public.wallets w
  where w.account_id = v_account_id
    and lower(trim(w.name)) in ('otros', 'ahorro y otros gastos')
  limit 1;

  if v_subscription_id is null or v_other_id is null then
    raise exception 'DALE debe tener Suscripciones y Otros';
  end if;

  if exists (
    select 1
    from public.transactions t
    where t.user_id = v_user_id
      and t.account_id = v_account_id
      and t.description = v_marker
  ) then
    return;
  end if;

  if v_balance < v_subscription_amount then
    raise exception 'El saldo disponible de DALE (%) no alcanza para asignar %',
      to_char(v_balance, 'FM999999999990.00'),
      to_char(v_subscription_amount, 'FM999999999990.00');
  end if;

  v_other_amount := round(v_balance - v_subscription_amount, 2);

  update public.wallets
  set name = 'Ahorro y otros gastos'
  where id = v_other_id
    and user_id = v_user_id;

  insert into public.transactions (
    user_id, occurred_at, type, amount, account_id, wallet_id,
    description, source, status, submission_id, category_id,
    is_necessary, savings_operation
  )
  values
    (
      v_user_id, v_occurred_at, 'Gasto', v_balance, v_account_id, null,
      v_marker, 'manual', 'confirmada', v_source_submission_id,
      null, null, null
    ),
    (
      v_user_id, v_occurred_at, 'Ingreso', v_subscription_amount, v_account_id, v_subscription_id,
      v_marker, 'manual', 'confirmada', v_subscription_submission_id,
      null, null, null
    ),
    (
      v_user_id, v_occurred_at, 'Ingreso', v_other_amount, v_account_id, v_other_id,
      v_marker, 'manual', 'confirmada', v_other_submission_id,
      null, null, null
    );
end;
$$;
