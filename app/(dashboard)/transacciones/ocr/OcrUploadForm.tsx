'use client'

import { useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createTransactionFromReceipt } from '@/lib/actions/ocr'

type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="w-full rounded-sm bg-ledger-green py-2.5 text-sm font-medium text-white hover:bg-ledger-green/90 disabled:opacity-60">
      {pending ? 'Leyendo factura…' : 'Subir y extraer datos'}
    </button>
  )
}

export function OcrUploadForm({ accounts, wallets, error }: { accounts: Account[]; wallets: Wallet[]; error?: string }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(() => wallets.filter((w) => w.account_id === accountId), [wallets, accountId])

  return (
    <form action={createTransactionFromReceipt} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm text-ledger-text">Foto de la factura</label>
        <input type="file" name="receipt" accept="image/*" capture="environment" required className={inputClass} />
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Cuenta</label>
        <select name="account_id" required value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
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

      {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

      <SubmitButton />
    </form>
  )
}