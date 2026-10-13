'use client'

import { useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createTransactionFromReceipt } from '@/lib/actions/ocr'

type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-full">
      {pending ? 'Procesando comprobante…' : 'Subir y extraer datos'}
    </button>
  )
}

export function OcrUploadForm({ accounts, wallets, error }: { accounts: Account[]; wallets: Wallet[]; error?: string }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [selectedFileName, setSelectedFileName] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(() => wallets.filter((w) => w.account_id === accountId), [wallets, accountId])

  return (
    <form action={createTransactionFromReceipt} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm text-ledger-text">Foto o imagen del comprobante</label>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <label className="btn btn-secondary cursor-pointer text-center">
            Tomar foto
            <input
              type="file"
              name="receipt_camera"
              accept="image/*"
              capture="environment"
              className="sr-only"
              ref={cameraInputRef}
              onChange={(event) => {
                if (event.target.files?.[0]) uploadInputRef.current!.value = ''
                setSelectedFileName(event.target.files?.[0]?.name ?? '')
              }}
            />
          </label>
          <label className="btn btn-secondary cursor-pointer text-center">
            Subir imagen
            <input
              type="file"
              name="receipt_upload"
              accept="image/*"
              className="sr-only"
              ref={uploadInputRef}
              onChange={(event) => {
                if (event.target.files?.[0]) cameraInputRef.current!.value = ''
                setSelectedFileName(event.target.files?.[0]?.name ?? '')
              }}
            />
          </label>
        </div>
        {selectedFileName ? (
          <p className="mt-2 text-xs text-ledger-green" role="status">
            ✓ Imagen adjuntada correctamente: {selectedFileName}
          </p>
        ) : (
          <p className="mt-1 text-xs text-ledger-muted">Elige una opción para adjuntar el comprobante.</p>
        )}
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
      <p className="text-center text-sm text-ledger-muted">
        ¿Prefieres no usar OCR?{' '}
        <Link href="/transacciones/nueva" className="text-ledger-green hover:underline">
          Registrar manualmente
        </Link>
      </p>
    </form>
  )
}
