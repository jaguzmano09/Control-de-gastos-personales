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
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<typeof TYPES[number]>('Gasto')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [walletId, setWalletId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isNecessary, setIsNecessary] = useState('')

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(
    () => wallets.filter((w) => w.account_id === accountId),
    [wallets, accountId]
  )

  const categoryName = categories.find((c) => c.id === categoryId)?.name
  const walletName = wallets.find((w) => w.id === walletId)?.name

  function handleContinue() {
    if (!occurredAt || !accountId || !amount || Number(amount) <= 0) return
    setStep('confirm')
  }

  return (
    <form action={createManualTransaction} className="mt-8 space-y-5">
      {step === 'form' ? (
        <>
          <div>
            <label className="block text-sm text-ledger-text">Fecha</label>
            <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block text-sm text-ledger-text">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} required className={inputClass}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ledger-text">Categoría</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">— Sin categoría —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ledger-text">Cuenta</label>
            <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setWalletId('') }} required className={inputClass}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {selectedAccount?.has_wallets && (
            <div>
              <label className="block text-sm text-ledger-text">Bolsillo</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} required className={inputClass}>
                <option value="">— Elige uno —</option>
                {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-ledger-text">Descripción</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm text-ledger-text">Monto</label>
            <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block text-sm text-ledger-text">¿Necesario?</label>
            <select value={isNecessary} onChange={(e) => setIsNecessary(e.target.value)} className={inputClass}>
              <option value="">— No aplica —</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

          <button type="button" onClick={handleContinue} className="btn btn-primary btn-full">
            Continuar
          </button>
        </>
      ) : (
        <>
          <div className="rounded-sm border border-black/10 bg-white p-4">
            <p className="text-sm font-medium text-ledger-text">Revisa antes de confirmar</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Fecha" value={new Date(occurredAt + 'T00:00:00').toLocaleDateString('es-CO')} />
              <Row label="Tipo" value={type} />
              <Row label="Categoría" value={categoryName ?? '— Sin categoría —'} />
              <Row label="Cuenta" value={selectedAccount?.name ?? ''} />
              {walletName && <Row label="Bolsillo" value={walletName} />}
              <Row label="Descripción" value={description || '—'} />
              <Row label="Monto" value={Number(amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} />
              {isNecessary && <Row label="¿Necesario?" value={isNecessary === 'true' ? 'Sí' : 'No'} />}
            </dl>
          </div>

          {/* Campos ocultos: van los mismos valores que ya validó el paso anterior */}
          <input type="hidden" name="occurred_at" value={occurredAt} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="category_id" value={categoryId} />
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="wallet_id" value={walletId} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="is_necessary" value={isNecessary} />

          {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('form')} className="btn btn-secondary flex-1">
              Corregir
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Confirmar
            </button>
          </div>
        </>
      )}
    </form>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ledger-muted">{label}</dt>
      <dd className="text-ledger-text">{value}</dd>
    </div>
  )
}
