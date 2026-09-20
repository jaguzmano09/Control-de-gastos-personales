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
    <div className="rounded-sm border border-black/10 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ledger-text">
          {new Date(transaction.occurred_at + 'T00:00:00').toLocaleDateString('es-CO')} · {transaction.type} · {transaction.source}
        </p>
        <ConfidenceBadge confidence={transaction.ai_confidence} />
      </div>

      <form action={confirmTransaction} className="mt-3 grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={transaction.id} />

        <div className="col-span-2">
          <label className="text-xs text-ledger-muted">Descripción</label>
          <input name="description" defaultValue={transaction.description ?? ''} className={inputClass} />
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

        <div className="col-span-2 mt-1">
          <button type="submit" className="rounded-sm bg-ledger-green px-3 py-1.5 text-sm font-medium text-white hover:bg-ledger-green/90">
            Confirmar
          </button>
        </div>
      </form>

      <form action={discardTransaction} className="mt-2">
        <input type="hidden" name="id" value={transaction.id} />
        <button type="submit" className="text-sm text-red-700 hover:underline">
          Descartar (no es un gasto real)
        </button>
      </form>
    </div>
  )
}