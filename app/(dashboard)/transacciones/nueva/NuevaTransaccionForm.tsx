'use client'

import { useMemo, useState } from 'react'
import { createManualTransaction } from '@/lib/actions/transactions'

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Ahorro', 'Inversion'] as const

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Category = { id: string; name: string }
type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }

export function NuevaTransaccionForm({
  categories,
  accounts,
  wallets,
  error,
}: {
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
  error?: string
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )

  return (
    <form action={createManualTransaction} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm text-ledger-text">Fecha</label>
        <input type="date" name="occurred_at" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Tipo</label>
        <select name="type" required className={inputClass}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Categoría</label>
        <select name="category_id" className={inputClass}>
          <option value="">— Sin categoría —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Cuenta</label>
        <select
          name="account_id"
          required
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={inputClass}
        >
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {selectedAccount?.has_wallets && (
        <div>
          <label className="block text-sm text-ledger-text">Bolsillo</label>
          <select name="wallet_id" required className={inputClass}>
            {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-ledger-text">Descripción</label>
        <input type="text" name="description" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Monto</label>
        <input type="number" name="amount" min="0" step="1" required className={inputClass} />
      </div>

      <div>
        <label className="block text-sm text-ledger-text">¿Necesario?</label>
        <select name="is_necessary" className={inputClass}>
          <option value="">— No aplica —</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

      <button type="submit" className="w-full rounded-sm bg-ledger-green py-2.5 text-sm font-medium text-white hover:bg-ledger-green/90">
        Guardar
      </button>
    </form>
  )
}