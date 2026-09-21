import { createClient } from '@/lib/supabase/server'
import { createAccount, toggleAccountActive, createWallet, toggleWalletActive } from '@/lib/actions/accounts'

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function CuentasPage() {
  const supabase = await createClient()

  const [{ data: accounts }, { data: wallets }] = await Promise.all([
    supabase.from('accounts').select('id, name, has_wallets, is_active').order('name'),
    supabase.from('wallets').select('id, name, account_id, is_active').order('name'),
  ])

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

            {account.has_wallets && (
              <div className="mt-3 border-t border-black/5 pt-3">
                <p className="text-xs text-ledger-muted">Bolsillos</p>
                <ul className="mt-2 space-y-1.5">
                  {(walletsByAccount.get(account.id) ?? []).map((wallet) => (
                    <li key={wallet.id} className="flex items-center justify-between text-sm">
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
                    </li>
                  ))}
                </ul>

                <form action={createWallet} className="mt-3 flex gap-2">
                  <input type="hidden" name="account_id" value={account.id} />
                  <input name="name" placeholder="Nuevo bolsillo" required className={`${inputClass} mt-0`} />
                  <button type="submit" className="btn btn-primary btn-sm shrink-0">
                    Agregar
                  </button>
                </form>
              </div>
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
