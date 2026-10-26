'use client'

import { useMemo, useState } from 'react'
import { confirmTransaction, discardTransaction } from '@/lib/actions/review'

type Category = { id: string; name: string }
type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }
type Transaction = {
  id: string
  occurred_at: string
  description: string | null
  amount: number
  type: string
  category_id: string | null
  account_id: string | null
  wallet_id: string | null
  ai_confidence: number | null
  source: string
}

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  const percent = Math.round(confidence * 100)
  const color = confidence >= 0.85 ? 'text-ledger-green' : confidence >= 0.6 ? 'text-amber-600' : 'text-red-700'
  return <span className={`text-xs ${color}`}>{percent}% de confianza</span>
}

export function ReviewCard({ transaction, categories, accounts, wallets }: {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
}) {
  const [accountId, setAccountId] = useState(transaction.account_id ?? accounts[0]?.id ?? '')
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )

  return (
    <details className="rounded-xl border border-black/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ledger-text">{transaction.description || 'Movimiento sin descripción'}</p>
          <p className="mt-1 text-xs text-ledger-muted">
            {new Date(transaction.occurred_at + 'T00:00:00').toLocaleDateString('es-CO')} · {transaction.type} · {transaction.source}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3"><ConfidenceBadge confidence={transaction.ai_confidence} /><span className="text-xs text-ledger-muted">Revisar</span></div>
      </summary>
      <div className="border-t border-black/10 p-4">
      <form action={confirmTransaction} className="grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={transaction.id} />

        <div className="col-span-2">
          <label className="text-xs text-ledger-muted">Descripción</label>
          <input name="description" defaultValue={transaction.description ?? ''} className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Fecha</label>
          <input type="date" name="occurred_at" defaultValue={transaction.occurred_at} required className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Monto</label>
          <input type="number" name="amount" min="0" step="1" defaultValue={transaction.amount} className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Categoría</label>
          <select name="category_id" defaultValue={transaction.category_id ?? ''} className={inputClass}>
            <option value="">— Sin categoría —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Cuenta</label>
          <select name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {selectedAccount?.has_wallets && (
          <div>
            <label className="text-xs text-ledger-muted">Bolsillo</label>
            <select name="wallet_id" defaultValue={transaction.wallet_id ?? ''} className={inputClass}>
              {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        <div className="col-span-2 mt-2">
          <button
            type="submit"
            className="btn btn-primary btn-full"
          >
            Confirmar
          </button>
        </div>
      </form>

      <form action={discardTransaction} className="mt-2">
        <input type="hidden" name="id" value={transaction.id} />
        <button
          type="submit"
          className="btn btn-danger btn-full"
        >
          Descartar (no es un gasto real)
        </button>
      </form>
      </div>
    </details>
  )
}
