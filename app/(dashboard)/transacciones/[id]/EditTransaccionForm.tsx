'use client'

import { useMemo, useState } from 'react'
import { updateTransaction, deleteTransaction } from '@/lib/actions/transactions'

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Ahorro', 'Inversion'] as const

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Category = { id: string; name: string }
type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }
type Transaction = {
  id: string
  occurred_at: string
  type: string
  category_id: string | null
  account_id: string
  wallet_id: string | null
  description: string | null
  amount: number
  is_necessary: boolean | null
  source: string
  status: string
}

export function EditTransaccionForm({
  transaction, categories, accounts, wallets, error,
}: {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
  error?: string
}) {
  const [accountId, setAccountId] = useState(transaction.account_id)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )

  return (
    <div className="mt-8 space-y-8">
      {transaction.source !== 'manual' && transaction.source !== 'migration' && (
        <p className="rounded-sm border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Esta transacción vino de {transaction.source === 'ocr' ? 'una foto (OCR)' : 'correo bancario'}. Editarla no vuelve a consultar la IA, solo guarda los valores que dejes aquí.
        </p>
      )}

      <form action={updateTransaction} className="space-y-5">
        <input type="hidden" name="id" value={transaction.id} />

        <div>
          <label className="block text-sm text-ledger-text">Fecha</label>
          <input type="date" name="occurred_at" defaultValue={transaction.occurred_at} required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm text-ledger-text">Tipo</label>
          <select name="type" defaultValue={transaction.type} required className={inputClass}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-ledger-text">Categoría</label>
          <select name="category_id" defaultValue={transaction.category_id ?? ''} className={inputClass}>
            <option value="">— Sin categoría —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-ledger-text">Cuenta</label>
          <select name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)} required className={inputClass}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {selectedAccount?.has_wallets && (
          <div>
            <label className="block text-sm text-ledger-text">Bolsillo</label>
            <select name="wallet_id" defaultValue={transaction.wallet_id ?? ''} required className={inputClass}>
              <option value="">— Elige uno —</option>
              {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-ledger-text">Descripción</label>
          <input type="text" name="description" defaultValue={transaction.description ?? ''} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm text-ledger-text">Monto</label>
          <input type="number" name="amount" min="0" step="1" defaultValue={transaction.amount} required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm text-ledger-text">¿Necesario?</label>
          <select name="is_necessary" defaultValue={transaction.is_necessary === null ? '' : String(transaction.is_necessary)} className={inputClass}>
            <option value="">— No aplica —</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

        <button type="submit" className="btn btn-primary btn-full">
          Guardar cambios
        </button>
      </form>

      <form
        action={deleteTransaction}
        onSubmit={(e) => {
          if (!confirm('¿Seguro que quieres eliminar esta transacción? No se puede deshacer.')) {
            e.preventDefault()
          }
        }}
      >
        <input type="hidden" name="id" value={transaction.id} />
        <button type="submit" className="btn btn-danger btn-full">
          Eliminar transacción
        </button>
      </form>
    </div>
  )
}
