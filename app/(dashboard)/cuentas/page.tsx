import { createClient } from '@/lib/supabase/server'
import {
  addYieldRate,
  createAccount,
  createWallet,
  createYieldConfig,
  toggleAccountActive,
  toggleWalletActive,
  toggleYieldConfig,
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
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Cuentas</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      {params.error && <p role="alert" className="mt-4 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(params.error)}</p>}
      {params.success && <p role="status" className="mt-4 rounded-sm bg-ledger-green/10 px-3 py-2 text-sm text-ledger-green">{decodeURIComponent(params.success)}</p>}

      <div className="mt-8 space-y-4">
        {(accounts ?? []).map((account) => (
          <div key={account.id} className={`rounded-sm border border-black/10 bg-white p-4 ${!account.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ledger-text">{account.name}</p>
              <form action={toggleAccountActive}>
                <input type="hidden" name="id" value={account.id} />
                <input type="hidden" name="is_active" value={(!account.is_active).toString()} />
                <button type="submit" className="btn-link btn-sm">
                  {account.is_active ? 'Desactivar' : 'Reactivar'}
                </button>
              </form>
            </div>

            <div className="mt-3 border-t border-black/5 pt-3">
              <p className="text-xs text-ledger-muted">
                {account.has_wallets ? 'Bolsillos' : 'Este saldo pertenece directamente a la cuenta'}
              </p>
              {account.has_wallets && (
                <ul className="mt-2 space-y-2">
                  {(walletsByAccount.get(account.id) ?? []).map((wallet) => {
                    const config = configByTarget.get(`wallet:${wallet.id}`)
                    return (
                      <li key={wallet.id} className="rounded-sm bg-black/[0.02] p-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={!wallet.is_active ? 'text-ledger-muted line-through' : 'text-ledger-text'}>
                            {wallet.name}
                          </span>
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
              )}
              <form action={createWallet} className="mt-3 flex gap-2">
                <input type="hidden" name="account_id" value={account.id} />
                <input name="name" placeholder="Nuevo bolsillo" required className={`${inputClass} mt-0`} />
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
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-sm border border-dashed border-black/20 p-4">
        <p className="text-sm text-ledger-text">Nueva cuenta</p>
        <form action={createAccount} className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-ledger-muted">Nombre</label>
            <input name="name" required className={inputClass} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-ledger-muted">
            <input type="checkbox" name="has_wallets" value="true" />
            Tiene bolsillos
          </label>
          <button type="submit" className="btn btn-primary">
            Crear
          </button>
        </form>
      </div>
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
    <details className="mt-4 border-t border-black/5 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-ledger-text">Alto rendimiento</summary>
      <div className="mt-3 space-y-3">
        {!config ? (
          <form action={createYieldConfig} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name={`${targetType}_id`} value={targetId} />
            <label className="text-xs text-ledger-muted">
              Tasa E.A. (%)
              <input name="ea_percent" type="number" min="0" max="100" step="0.0001" required className={inputClass} />
            </label>
            <label className="text-xs text-ledger-muted">
              Vigente desde
              <input name="start_date" type="date" required className={inputClass} />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Activar</button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={config.is_active ? 'text-ledger-green' : 'text-ledger-muted'}>
                {config.is_active ? 'Activo' : 'Pausado'} · Desde {config.start_date}
              </span>
              <form action={toggleYieldConfig}>
                <input type="hidden" name="config_id" value={config.id} />
                <input type="hidden" name="is_active" value={(!config.is_active).toString()} />
                <button type="submit" className="btn-link btn-sm">
                  {config.is_active ? 'Pausar' : 'Activar'}
                </button>
              </form>
            </div>
            <ul className="space-y-1 text-xs text-ledger-muted">
              {rates.map((rate) => (
                <li key={rate.id}>E.A. {Number(rate.ea_percent).toFixed(4)}% · desde {rate.valid_from}</li>
              ))}
            </ul>
            <form action={addYieldRate} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="config_id" value={config.id} />
              <label className="text-xs text-ledger-muted">
                Nueva tasa E.A. (%)
                <input name="ea_percent" type="number" min="0" max="100" step="0.0001" required className={inputClass} />
              </label>
              <label className="text-xs text-ledger-muted">
                Vigente desde
                <input name="valid_from" type="date" min={config.start_date} required className={inputClass} />
              </label>
              <button type="submit" className="btn btn-secondary btn-sm">Agregar tasa</button>
            </form>
          </>
        )}
      </div>
    </details>
  )
}
