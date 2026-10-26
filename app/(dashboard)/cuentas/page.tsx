import { createClient } from '@/lib/supabase/server'
import {
  createAccount,
  createWallet,
  createYieldConfig,
  deleteYieldRate,
  toggleAccountActive,
  toggleWalletActive,
  toggleYieldConfig,
  updateYieldRate,
} from '@/lib/actions/accounts'

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Account = { id: string; name: string; has_wallets: boolean; is_active: boolean }
type Wallet = {
  id: string
  name: string
  account_id: string
  is_active: boolean
}
type YieldConfig = {
  id: string
  account_id: string | null
  wallet_id: string | null
  start_date: string
  is_active: boolean
}
type YieldRate = { id: string; config_id: string; ea_percent: number; valid_from: string }

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: accountsData }, { data: walletsData }, { data: yieldConfigsData }, { data: yieldRatesData }] = await Promise.all([
    supabase.from('accounts').select('id, name, has_wallets, is_active').order('name'),
    supabase.from('wallets').select('id, name, account_id, is_active').order('name'),
    supabase.from('yield_configs').select('id, account_id, wallet_id, start_date, is_active'),
    supabase.from('yield_rates').select('id, config_id, ea_percent, valid_from').order('valid_from', { ascending: false }),
  ])
  const accounts = accountsData as Account[] | null
  const wallets = walletsData as Wallet[] | null
  const yieldConfigs = yieldConfigsData as YieldConfig[] | null
  const yieldRates = yieldRatesData as YieldRate[] | null
  const configByTarget = new Map(
    (yieldConfigs ?? []).map((config) => [`${config.account_id ? 'account' : 'wallet'}:${config.account_id ?? config.wallet_id}`, config]),
  )
  const ratesByConfig = new Map<string, YieldRate[]>()
  for (const rate of yieldRates ?? []) {
    ratesByConfig.set(rate.config_id, [...(ratesByConfig.get(rate.config_id) ?? []), rate])
  }

  const walletsByAccount = new Map<string, typeof wallets>()
  for (const w of wallets ?? []) {
    const list = walletsByAccount.get(w.account_id) ?? []
    list.push(w)
    walletsByAccount.set(w.account_id, list)
  }

  return (
    <div className="max-w-4xl">
      <header className="border-b border-black/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Organización financiera</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-ledger-text sm:text-4xl">Cuentas y bolsillos</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ledger-muted">
              Administra dónde está tu dinero y configura el rendimiento de cada destino.
            </p>
          </div>
          <div className="rounded-2xl border border-ledger-green/15 bg-ledger-green/5 px-4 py-3 text-right">
            <p className="text-2xl font-semibold text-ledger-green">{(accounts ?? []).length}</p>
            <p className="text-xs text-ledger-muted">cuentas registradas</p>
          </div>
        </div>
      </header>

      {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(params.error)}</p>}
      {params.success && <p role="status" className="mt-5 rounded-xl border border-ledger-green/20 bg-ledger-green/10 px-4 py-3 text-sm text-ledger-green">{decodeURIComponent(params.success)}</p>}

      <div className="mt-7 space-y-5">
        {(accounts ?? []).map((account) => (
          <section key={account.id} className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(23,35,31,0.05)] ${!account.is_active ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/5 bg-gradient-to-br from-white via-white to-ledger-green/5 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ledger-green text-lg font-semibold text-white">
                  {account.name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ledger-text">{account.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${account.is_active ? 'bg-ledger-green/10 text-ledger-green' : 'bg-black/5 text-ledger-muted'}`}>
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ledger-muted">
                    {account.has_wallets ? 'El saldo se organiza por bolsillos' : 'El saldo pertenece directamente a esta cuenta'}
                  </p>
                </div>
              </div>
              <form action={toggleAccountActive}>
                <input type="hidden" name="id" value={account.id} />
                <input type="hidden" name="is_active" value={(!account.is_active).toString()} />
                <button type="submit" className="btn btn-secondary btn-sm">
                  {account.is_active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                </button>
              </form>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {account.has_wallets && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ledger-text">Bolsillos</h3>
                      <p className="mt-0.5 text-xs text-ledger-muted">{(walletsByAccount.get(account.id) ?? []).length} destinos dentro de esta cuenta</p>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-ledger-muted">Distribución interna</span>
                  </div>
                  <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/5">
                  {(walletsByAccount.get(account.id) ?? []).map((wallet) => {
                    const config = configByTarget.get(`wallet:${wallet.id}`)
                    return (
                      <li key={wallet.id} className={`bg-white px-4 py-3 ${!wallet.is_active ? 'bg-black/[0.02]' : ''}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-ledger-green" />
                            <span className={`text-sm font-medium ${!wallet.is_active ? 'text-ledger-muted line-through' : 'text-ledger-text'}`}>{wallet.name}</span>
                            {!wallet.is_active && <span className="text-[11px] text-ledger-muted">Inactivo</span>}
                          </div>
                          <form action={toggleWalletActive}>
                            <input type="hidden" name="id" value={wallet.id} />
                            <input type="hidden" name="is_active" value={(!wallet.is_active).toString()} />
                            <button type="submit" className="btn-link btn-sm">
                              {wallet.is_active ? 'Desactivar' : 'Reactivar'}
                            </button>
                          </form>
                        </div>
                        <YieldSettings
                          targetId={wallet.id}
                          targetType="wallet"
                          config={config}
                          rates={config ? ratesByConfig.get(config.id) ?? [] : []}
                        />
                      </li>
                    )
                  })}
                  </ul>
                </div>
              )}
              <form action={createWallet} className="mt-5 flex flex-col gap-2 rounded-xl border border-dashed border-ledger-green/30 bg-ledger-green/[0.03] p-3 sm:flex-row">
                <input type="hidden" name="account_id" value={account.id} />
                <input name="name" placeholder="Nombre del nuevo bolsillo" required className={`${inputClass} mt-0 flex-1`} />
                <button type="submit" className="btn btn-primary btn-sm shrink-0">
                  {account.has_wallets ? 'Agregar' : 'Crear bolsillo'}
                </button>
              </form>
            </div>

            {!account.has_wallets && (
              <YieldSettings
                targetId={account.id}
                targetType="account"
                config={configByTarget.get(`account:${account.id}`)}
                rates={configByTarget.get(`account:${account.id}`) ? ratesByConfig.get(configByTarget.get(`account:${account.id}`)!.id) ?? [] : []}
              />
            )}
          </section>
        ))}
      </div>

      <section className="mt-7 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-green/10 text-xl text-ledger-green">+</div>
          <div>
            <h2 className="text-base font-semibold text-ledger-text">Agregar una cuenta</h2>
            <p className="mt-1 text-xs leading-5 text-ledger-muted">Crea una nueva cuenta y define desde el inicio si manejará bolsillos.</p>
          </div>
        </div>
        <form action={createAccount} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="text-xs font-medium text-ledger-muted">
            Nombre de la cuenta
            <input name="name" required className={inputClass} placeholder="Ej. Banco principal" />
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs text-ledger-muted">
            <input type="checkbox" name="has_wallets" value="true" />
            Crear con bolsillos
          </label>
          <button type="submit" className="btn btn-primary">Crear cuenta</button>
        </form>
      </section>
    </div>
  )
}

function YieldSettings({
  targetId,
  targetType,
  config,
  rates,
}: {
  targetId: string
  targetType: 'account' | 'wallet'
  config?: YieldConfig
  rates: YieldRate[]
}) {
  return (
    <details className="mt-4 overflow-hidden rounded-xl border border-amber-200/70 bg-amber-50/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ledger-text marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-sm text-amber-700">%</span>
            Alto rendimiento
          </span>
          <span className="text-xs font-normal text-ledger-muted">{config ? (config.is_active ? 'Activo' : 'Pausado') : 'Sin configurar'}</span>
        </span>
      </summary>
      <div className="border-t border-amber-200/60 bg-white/70 px-4 py-4">
        {!config ? (
          <form action={createYieldConfig} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name={`${targetType}_id`} value={targetId} />
            <label className="text-xs font-medium text-ledger-muted">
              Tasa E.A. (%)
              <input name="ea_percent" type="number" min="0" max="100" step="0.0001" required className={inputClass} />
            </label>
            <label className="text-xs font-medium text-ledger-muted">
              Vigente desde
              <input name="start_date" type="date" required className={inputClass} />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Activar</button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ledger-muted">
                {config.is_active ? 'Generando rendimiento' : 'Rendimiento pausado'} · Desde {config.start_date}
              </span>
              <form action={toggleYieldConfig}>
                <input type="hidden" name="config_id" value={config.id} />
                <input type="hidden" name="is_active" value={(!config.is_active).toString()} />
                <button type="submit" className="btn-link btn-sm">
                  {config.is_active ? 'Pausar' : 'Activar'}
                </button>
              </form>
            </div>
            <ul className="mt-3 divide-y divide-black/5 overflow-hidden rounded-lg border border-black/5 bg-white text-xs text-ledger-muted">
              {rates.map((rate, index) => (
                <li key={rate.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs">{index === 0 ? 'Tasa vigente' : 'Tasa histórica'}</span>
                    <div className="flex items-center gap-1">
                      <details className="w-full">
                        <summary className="btn-link btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">Editar</summary>
                        <form action={updateYieldRate} className="mt-2 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                          <input type="hidden" name="rate_id" value={rate.id} />
                          <label className="text-xs text-ledger-muted">
                            Tasa E.A. (%)
                            <input name="ea_percent" type="number" min="0" max="100" step="0.0001" defaultValue={rate.ea_percent} required className={inputClass} />
                          </label>
                          <label className="text-xs text-ledger-muted">
                            Vigente desde
                            <input name="valid_from" type="date" min={config.start_date} defaultValue={rate.valid_from} required className={inputClass} />
                          </label>
                          <button type="submit" className="btn btn-secondary btn-sm">Guardar</button>
                        </form>
                      </details>
                      <form action={deleteYieldRate}>
                        <input type="hidden" name="rate_id" value={rate.id} />
                        <button type="submit" className="btn-link-danger btn-sm">Eliminar</button>
                      </form>
                    </div>
                  </div>
                  <div className="mt-2 font-medium text-ledger-text">E.A. {Number(rate.ea_percent).toFixed(4)}% · {rate.valid_from}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  )
}
