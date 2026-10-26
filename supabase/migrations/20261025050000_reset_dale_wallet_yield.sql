-- Reinicio interno único de los bolsillos de DALE.
-- Conserva únicamente los ingresos de la reasignación y activa el rendimiento desde mañana.

do $$
declare
  v_user_id uuid;
  v_account_id uuid;
  v_subscription_id uuid;
  v_other_id uuid;
  v_start_date date := current_date + 1;
  v_subscription_config_id uuid;
  v_other_config_id uuid;
  v_subscription_rate numeric(7, 4);
  v_other_rate numeric(7, 4);
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
    and lower(trim(w.name)) = 'ahorro y otros gastos'
  limit 1;

  if v_subscription_id is null or v_other_id is null then
    raise exception 'DALE debe tener Suscripciones y Ahorro y otros gastos';
  end if;

  select c.id
    into v_subscription_config_id
  from public.yield_configs c
  where c.user_id = v_user_id
    and c.wallet_id = v_subscription_id;

  select c.id
    into v_other_config_id
  from public.yield_configs c
  where c.user_id = v_user_id
    and c.wallet_id = v_other_id;

  if v_subscription_config_id is null or v_other_config_id is null then
    raise exception 'Los dos bolsillos de DALE deben tener rendimiento configurado';
  end if;

  -- La tasa observada de Suscripciones es 10,5% E.A.
  v_subscription_rate := 10.5000;

  select r.ea_percent
    into v_other_rate
  from public.yield_rates r
  where r.config_id = v_other_config_id
  order by r.valid_from desc
  limit 1;

  if v_subscription_rate is null or v_other_rate is null then
    raise exception 'Los dos bolsillos de DALE deben tener una tasa registrada';
  end if;

  if not exists (
    select 1
    from public.transactions t
    where t.user_id = v_user_id
      and t.wallet_id = v_subscription_id
      and t.description = 'Reasignación interna de saldo DALE'
  ) or not exists (
    select 1
    from public.transactions t
    where t.user_id = v_user_id
      and t.wallet_id = v_other_id
      and t.description = 'Reasignación interna de saldo DALE'
  ) then
    raise exception 'No se encontraron los movimientos de reasignación de DALE';
  end if;

  -- El saldo de cada bolsillo queda representado únicamente por la reasignación.
  delete from public.transactions
  where user_id = v_user_id
    and wallet_id in (v_subscription_id, v_other_id)
    and coalesce(description, '') <> 'Reasignación interna de saldo DALE';

  update public.transactions
  set amount = case
    when wallet_id = v_subscription_id then 76998.59
    when wallet_id = v_other_id then 44281.41
  end
  where user_id = v_user_id
    and wallet_id in (v_subscription_id, v_other_id)
    and description = 'Reasignación interna de saldo DALE';

  delete from public.yield_rates
  where config_id in (v_subscription_config_id, v_other_config_id);

  update public.yield_configs
  set start_date = v_start_date,
      is_active = true
  where id in (v_subscription_config_id, v_other_config_id)
    and user_id = v_user_id;

  insert into public.yield_rates (user_id, config_id, ea_percent, valid_from)
  values
    (v_user_id, v_subscription_config_id, v_subscription_rate, v_start_date),
    (v_user_id, v_other_config_id, v_other_rate, v_start_date);
end;
$$;
