'use client'

import { useMemo, useState } from 'react'
import { updateTransaction, deleteTransaction } from '@/lib/actions/transactions'

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Inversion'] as const

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Category = { id: string; name: string }
type Account = { id: string; name: string; category_id: string | null; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string; category_id: string | null }
type Transaction = {
  id: string
  occurred_at: string
  type: string
  savings_operation: string | null
  category_id: string | null
  account_id: string
  wallet_id: string | null
  destination_account_id: string | null
  destination_wallet_id: string | null
  destination_category_id: string | null
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
  const [walletId, setWalletId] = useState(transaction.wallet_id ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')
  const [type, setType] = useState(transaction.type)
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destination_account_id ?? '')
  const [destinationWalletId, setDestinationWalletId] = useState(transaction.destination_wallet_id ?? '')
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId)
  const destinationWallets = useMemo(
    () => wallets.filter((wallet) => wallet.account_id === destinationAccountId),
    [wallets, destinationAccountId]
  )
  const sourceWallet = wallets.find((wallet) => wallet.id === walletId && wallet.account_id === accountId)
  const destinationWallet = wallets.find((wallet) => wallet.id === destinationWalletId && wallet.account_id === destinationAccountId)
  const sourceCategoryId = sourceWallet?.category_id ?? selectedAccount?.category_id ?? ''
  const destinationCategoryId = destinationWallet?.category_id ?? destinationAccount?.category_id ?? ''
  const destinationCategoryName = categories.find((category) => category.id === destinationCategoryId)?.name

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
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} required className={inputClass}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            {transaction.type === 'Ahorro' && <option value="Ahorro">Ahorro (histórico)</option>}
          </select>
        </div>

        {type === 'Ahorro' && (
          <div>
            <label className="block text-sm text-ledger-text">Operación de ahorro</label>
            <select name="savings_operation" defaultValue={transaction.savings_operation ?? 'retiro'} required className={inputClass}>
              <option value="ingreso">Ingreso para el ahorro</option>
              <option value="retiro">Retiro o gasto del ahorro</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-ledger-text">Categoría</label>
          <select value={type === 'Transferencia' ? sourceCategoryId : categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={type === 'Transferencia'} required={type === 'Gasto' || type === 'Ingreso'} className={inputClass}>
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
            <select name="wallet_id" value={walletId} onChange={(event) => setWalletId(event.target.value)} required className={inputClass}>
              <option value="">— Elige uno —</option>
              {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {type === 'Transferencia' && <>
          <div>
            <label className="block text-sm text-ledger-text">Cuenta de destino</label>
            <select name="destination_account_id" value={destinationAccountId} onChange={(event) => { setDestinationAccountId(event.target.value); setDestinationWalletId('') }} required className={inputClass}>
              <option value="">— Selecciona una cuenta —</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </div>
          {destinationAccount?.has_wallets && <div>
            <label className="block text-sm text-ledger-text">Bolsillo de destino</label>
            <select name="destination_wallet_id" value={destinationWalletId} onChange={(event) => setDestinationWalletId(event.target.value)} required className={inputClass}>
              <option value="">— Elige uno —</option>
              {destinationWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
            </select>
          </div>}
          <div>
            <label className="block text-sm text-ledger-text">Categoría de destino</label>
            <select value={destinationCategoryId} disabled className={inputClass}>
              <option value="">— Selecciona una categoría —</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <p className="text-sm text-ledger-muted">Categoría asignada: {destinationCategoryName ?? 'sin asignar'}</p>
          {!sourceCategoryId && <p className="text-xs text-amber-800">Asigna una categoría al origen en <a className="underline" href="/cuentas">Cuentas y bolsillos</a>.</p>}
          {!destinationCategoryId && <p className="text-xs text-amber-800">Asigna una categoría al destino en <a className="underline" href="/cuentas">Cuentas y bolsillos</a>.</p>}
        </>}

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
        <input type="hidden" name="category_id" value={type === 'Transferencia' ? sourceCategoryId : categoryId} />
        <input type="hidden" name="destination_category_id" value={type === 'Transferencia' ? destinationCategoryId : ''} />
        <button type="submit" className="btn btn-danger btn-full">
          Eliminar transacción
        </button>
      </form>
    </div>
  )
}
