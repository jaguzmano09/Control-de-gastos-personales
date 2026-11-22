'use client'

import { useMemo, useState } from 'react'
import { confirmTransaction, discardTransaction } from '@/lib/actions/review'
import Link from 'next/link'

type Category = { id: string; name: string }
type Account = { id: string; name: string; has_wallets: boolean; category_id: string | null }
type Wallet = { id: string; name: string; account_id: string; category_id: string | null }
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
  raw_data: { engine?: string; date_inferred?: boolean; amount_conflict?: boolean; document_kind?: string } | null
}

const inputClass = 'input mt-1 w-full'

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  const percent = Math.round(confidence * 100)
  const color = confidence >= 0.85 ? 'text-ledger-green' : confidence >= 0.6 ? 'text-amber-600' : 'text-red-700'
  return <span className={`text-xs ${color}`}>{percent}% de confianza en la lectura</span>
}

export function ReviewCard({ transaction, categories, accounts, wallets }: {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
}) {
  const initialAccount = accounts.find((account) => account.id === transaction.account_id) ?? accounts[0]
  const initialAccountId = initialAccount?.id ?? ''
  const initialWallet = wallets.find((wallet) => wallet.id === transaction.wallet_id && wallet.account_id === initialAccountId)
  const initialAssignedCategory = initialWallet?.category_id ?? (initialAccount?.has_wallets ? null : initialAccount?.category_id)
  const [accountId, setAccountId] = useState(initialAccountId)
  const [walletId, setWalletId] = useState(initialWallet?.id ?? '')
  const [categoryId, setCategoryId] = useState(initialAssignedCategory
    ?? (transaction.type === 'Gasto' || !categories.some((category) => category.id === transaction.category_id) ? '' : transaction.category_id ?? ''))
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )
  const requiresWallet = Boolean(selectedAccount?.has_wallets || walletsForAccount.length > 0)
  const selectedWallet = walletsForAccount.find((wallet) => wallet.id === walletId)
  const assignedCategoryId = requiresWallet ? selectedWallet?.category_id : selectedAccount?.category_id
  const canConfirm = Boolean(accountId && (!requiresWallet || selectedWallet) && categoryId && (transaction.type !== 'Gasto' || assignedCategoryId))

  function chooseAccount(nextAccountId: string) {
    const nextAccount = accounts.find((account) => account.id === nextAccountId)
    const hasWallets = Boolean(nextAccount?.has_wallets || wallets.some((wallet) => wallet.account_id === nextAccountId))
    setAccountId(nextAccountId)
    setWalletId('')
    setCategoryId(hasWallets ? '' : nextAccount?.category_id ?? '')
  }

  function chooseWallet(nextWalletId: string) {
    setWalletId(nextWalletId)
    setCategoryId(walletsForAccount.find((wallet) => wallet.id === nextWalletId)?.category_id ?? '')
  }

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
      {transaction.source === 'ocr' && transaction.raw_data?.engine === 'processing' && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">La lectura automática no guardó resultados. Puedes completar los campos manualmente; este borrador no afecta tus saldos ni presupuestos hasta que lo confirmes.</p>}
      {transaction.source === 'ocr' && transaction.raw_data?.date_inferred && transaction.raw_data?.document_kind !== 'transfer' && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">No pudimos identificar una fecha confiable del comprobante. Selecciónala antes de confirmar.</p>}
      {transaction.source === 'ocr' && transaction.raw_data?.amount_conflict && transaction.raw_data?.document_kind !== 'transfer' && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Las lecturas automáticas dieron montos distintos. Escribe el total del comprobante antes de confirmar.</p>}
      {transaction.source === 'ocr' && transaction.raw_data?.document_kind === 'transfer' && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Este archivo parece un comprobante de transferencia entre cuentas. No lo confirmes como gasto. <Link href="/transacciones/nueva" className="font-semibold underline">Registra la transferencia</Link> y descarta este borrador.</p>}
      {transaction.raw_data?.document_kind !== 'transfer' && (
      <form action={confirmTransaction} className="grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={transaction.id} />

        <div className="col-span-2">
          <label className="text-xs text-ledger-muted">Descripción</label>
          <input name="description" defaultValue={transaction.description ?? ''} className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Fecha</label>
          <input type="date" lang="es-CO" name="occurred_at" defaultValue={transaction.raw_data?.date_inferred ? '' : transaction.occurred_at} required className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Monto</label>
          <input type="number" name="amount" min="1" step="1" required defaultValue={transaction.raw_data?.amount_conflict ? '' : transaction.amount || ''} className={inputClass} />
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Categoría</label>
          <select name="category_id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={Boolean(assignedCategoryId) || transaction.type === 'Gasto'} required className={inputClass}>
            <option value="">Sin categoría asignada</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(assignedCategoryId || transaction.type === 'Gasto') && <input type="hidden" name="category_id" value={categoryId} />}
        </div>

        <div>
          <label className="text-xs text-ledger-muted">Cuenta</label>
          <select name="account_id" value={accountId} onChange={(e) => chooseAccount(e.target.value)} className={inputClass}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {requiresWallet && (
          <div>
            <label className="text-xs text-ledger-muted">Bolsillo</label>
            <select name="wallet_id" value={walletId} onChange={(event) => chooseWallet(event.target.value)} required className={inputClass}>
              <option value="">Selecciona un bolsillo</option>
              {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {requiresWallet && !selectedWallet && <p role="alert" className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Selecciona un bolsillo de {selectedAccount?.name ?? 'esta cuenta'} antes de confirmar.</p>}
        {transaction.type === 'Gasto' && (!requiresWallet || selectedWallet) && !assignedCategoryId && <p role="alert" className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{selectedWallet?.name ?? selectedAccount?.name ?? 'Esta ubicación'} no tiene categoría ni presupuesto asignado. Registra primero un ingreso allí para poder confirmar el gasto.</p>}

        <div className="col-span-2 mt-2">
          <button
            type="submit"
            disabled={!canConfirm}
            className="btn btn-primary btn-full"
          >
            Confirmar
          </button>
        </div>
      </form>
      )}

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
