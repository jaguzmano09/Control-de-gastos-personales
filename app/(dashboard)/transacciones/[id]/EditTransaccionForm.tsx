'use client'

import { useEffect, useMemo, useState } from 'react'
import { updateTransaction, deleteTransaction, refreshExpenseLocationStatuses } from '@/lib/actions/transactions'
import type { ExpenseLocationStatus } from '@/lib/data/expense-location-status'

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
  transaction, categories, accounts, wallets, error, initialPeriodMonth, locationStatuses: initialLocationStatuses,
}: {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
  error?: string
  initialPeriodMonth: string
  locationStatuses: ExpenseLocationStatus[]
}) {
  const [occurredAt, setOccurredAt] = useState(transaction.occurred_at.slice(0, 10))
  const [accountId, setAccountId] = useState(transaction.account_id)
  const [walletId, setWalletId] = useState(transaction.wallet_id ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')
  const [type, setType] = useState(transaction.type)
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destination_account_id ?? '')
  const [destinationWalletId, setDestinationWalletId] = useState(transaction.destination_wallet_id ?? '')
  const [destinationCategoryChoice, setDestinationCategoryChoice] = useState(transaction.destination_category_id ?? '')
  const [locationStatuses, setLocationStatuses] = useState(initialLocationStatuses)
  const [statusPeriodMonth, setStatusPeriodMonth] = useState(initialPeriodMonth)
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false)
  const [statusLoadFailed, setStatusLoadFailed] = useState(false)
  const occurredPeriodMonth = occurredAt ? `${occurredAt.slice(0, 7)}-01` : ''

  useEffect(() => {
    if (!occurredPeriodMonth || occurredPeriodMonth === statusPeriodMonth) return
    let active = true
    setIsLoadingStatuses(true)
    setStatusLoadFailed(false)
    refreshExpenseLocationStatuses(occurredPeriodMonth)
      .then((statuses) => {
        if (!active) return
        setLocationStatuses(statuses)
        setStatusPeriodMonth(occurredPeriodMonth)
      })
      .catch(() => {
        if (active) setStatusLoadFailed(true)
      })
      .finally(() => {
        if (active) setIsLoadingStatuses(false)
      })
    return () => { active = false }
  }, [occurredPeriodMonth, statusPeriodMonth])

  const statusByTarget = useMemo(
    () => new Map(locationStatuses.map((status) => [`${status.location_type}:${status.location_id}`, status])),
    [locationStatuses],
  )
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
  const sourceCategoryId = sourceWallet
    ? sourceWallet.category_id ?? ''
    : selectedAccount?.has_wallets ? '' : selectedAccount?.category_id ?? ''
  const destinationCategoryId = destinationWallet
    ? destinationWallet.category_id ?? ''
    : destinationAccount?.has_wallets ? '' : destinationAccount?.category_id ?? ''
  const selectedLocationStatus = sourceWallet
    ? statusByTarget.get(`wallet:${sourceWallet.id}`)
    : selectedAccount?.has_wallets ? undefined : statusByTarget.get(`account:${accountId}`)
  const sourceCategoryForSubmission = type === 'Gasto'
    ? sourceCategoryId
    : type === 'Ingreso' || type === 'Transferencia' ? sourceCategoryId || categoryId : categoryId
  const destinationCategoryForSubmission = destinationCategoryId || destinationCategoryChoice
  const expenseBlockReason = type !== 'Gasto' ? ''
    : !selectedAccount ? 'Selecciona una cuenta.'
      : selectedAccount.has_wallets && !walletId ? 'Elige un bolsillo de esta cuenta para consultar su categoría y presupuesto.'
        : isLoadingStatuses ? 'Consultando el presupuesto del periodo…'
          : statusLoadFailed ? 'No pudimos verificar el presupuesto. Inténtalo de nuevo antes de guardar el gasto.'
            : !selectedLocationStatus?.category_id ? `No se puede guardar el gasto: ${selectedLocationStatus?.location_name ?? (sourceWallet ? `${selectedAccount.name} / ${sourceWallet.name}` : selectedAccount.name)} no tiene una categoría ni un presupuesto categorizado para este mes. Registra primero un ingreso o una transferencia para asignarlos.`
              : !selectedLocationStatus.budget_assigned ? `No se puede guardar el gasto: ${selectedLocationStatus.location_name} tiene la categoría ${selectedLocationStatus.category_name ?? ''}, pero no tiene presupuesto asignado para este mes.`
                : ''
  const canSave = type !== 'Gasto' || (!expenseBlockReason && !isLoadingStatuses)

  function optionDetails(status?: ExpenseLocationStatus) {
    if (!status) return 'Sin categoría o presupuesto'
    const category = status.category_name ? `Categoría: ${status.category_name}` : 'Sin categoría'
    const assigned = status.assigned_amount + status.rollover_amount
    const budget = status.category_id && status.budget_assigned
      ? assigned > 0 ? `Presupuesto: ${formatCOP(assigned)}` : `Financiado por transferencias: ${formatCOP(status.transfer_in)}`
      : 'Sin presupuesto este mes'
    return `${category} · ${budget} · Disponible: ${formatCOP(status.available_amount)}`
  }

  async function retryLocationStatuses() {
    if (!occurredPeriodMonth) return
    setIsLoadingStatuses(true)
    setStatusLoadFailed(false)
    try {
      const statuses = await refreshExpenseLocationStatuses(occurredPeriodMonth)
      setLocationStatuses(statuses)
      setStatusPeriodMonth(occurredPeriodMonth)
    } catch {
      setStatusLoadFailed(true)
    } finally {
      setIsLoadingStatuses(false)
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {transaction.source !== 'manual' && transaction.source !== 'migration' && (
        <p className="rounded-sm border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Esta transacción vino de {transaction.source === 'ocr' ? 'una foto (OCR)' : 'correo bancario'}. Editarla no vuelve a consultar la IA, solo guarda los valores que dejes aquí.
        </p>
      )}

      <form action={updateTransaction} className="space-y-5">
        <input type="hidden" name="id" value={transaction.id} />
        <input type="hidden" name="category_id" value={sourceCategoryForSubmission} />
        <input type="hidden" name="destination_category_id" value={type === 'Transferencia' ? destinationCategoryForSubmission : ''} />

        <div>
          <label className="block text-sm text-ledger-text">Fecha</label>
          <input type="date" name="occurred_at" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required className={inputClass} />
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
          <label className="block text-sm text-ledger-text">Cuenta</label>
          <select name="account_id" value={accountId} onChange={(e) => { setAccountId(e.target.value); setWalletId(''); setCategoryId('') }} required className={inputClass}>
            {accounts.map((account) => {
              const status = statusByTarget.get(`account:${account.id}`)
              return <option key={account.id} value={account.id}>{account.name}{account.has_wallets ? ' · Tiene bolsillos' : ` · ${optionDetails(status)}`}</option>
            })}
          </select>
        </div>

        {selectedAccount?.has_wallets && (
          <div>
            <label className="block text-sm text-ledger-text">Bolsillo</label>
            <select name="wallet_id" value={walletId} onChange={(event) => { setWalletId(event.target.value); setCategoryId('') }} required className={inputClass}>
              <option value="">— Elige uno —</option>
              {walletsForAccount.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {optionDetails(statusByTarget.get(`wallet:${wallet.id}`))}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-ledger-text">{type === 'Transferencia' ? 'Categoría de origen' : 'Categoría'}</label>
          {type === 'Gasto' ? (
            <input readOnly aria-readonly="true" value={selectedLocationStatus?.category_name ?? 'Sin categoría asignada'} className={`${inputClass} cursor-default bg-black/[0.03] text-ledger-muted`} />
          ) : (
            <select value={type === 'Ingreso' || type === 'Transferencia' ? sourceCategoryId || categoryId : categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={(type === 'Ingreso' || type === 'Transferencia') && !!sourceCategoryId} required={type === 'Ingreso' || (type === 'Transferencia' && !sourceCategoryId)} className={inputClass}>
              <option value="">— Selecciona una categoría —</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          )}
        </div>
        {type === 'Ingreso' && !sourceCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida se asignará a la cuenta o bolsillo al guardar este ingreso.</p>}
        {type === 'Gasto' && selectedLocationStatus && <LocationStatusSummary status={selectedLocationStatus} occurredAt={occurredAt} />}
        {type === 'Gasto' && expenseBlockReason && <div role="alert" className="rounded-sm border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{expenseBlockReason}</p>
          {statusLoadFailed && <button type="button" onClick={retryLocationStatuses} className="mt-2 font-medium underline underline-offset-2">Reintentar consulta</button>}
        </div>}

        {type === 'Transferencia' && <>
          <div>
            <label className="block text-sm text-ledger-text">Cuenta de destino</label>
            <select name="destination_account_id" value={destinationAccountId} onChange={(event) => { setDestinationAccountId(event.target.value); setDestinationWalletId(''); setDestinationCategoryChoice('') }} required className={inputClass}>
              <option value="">— Selecciona una cuenta —</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.has_wallets ? ' · Tiene bolsillos' : ''}</option>)}
            </select>
          </div>
          {destinationAccount?.has_wallets && <div>
            <label className="block text-sm text-ledger-text">Bolsillo de destino</label>
            <select name="destination_wallet_id" value={destinationWalletId} onChange={(event) => { setDestinationWalletId(event.target.value); setDestinationCategoryChoice('') }} required className={inputClass}>
              <option value="">— Elige uno —</option>
              {destinationWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {optionDetails(statusByTarget.get(`wallet:${wallet.id}`))}</option>)}
            </select>
          </div>}
          <div>
            <label className="block text-sm text-ledger-text">Categoría de destino</label>
            <select value={destinationCategoryId || destinationCategoryChoice} onChange={(event) => setDestinationCategoryChoice(event.target.value)} required={!destinationCategoryId} disabled={!!destinationCategoryId} className={inputClass}>
              <option value="">— Selecciona una categoría —</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          {!sourceCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida quedará asignada al origen al guardar.</p>}
          {!destinationCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida quedará asignada al destino al guardar.</p>}
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

        <button type="submit" disabled={!canSave} className="btn btn-primary btn-full disabled:cursor-not-allowed disabled:opacity-55">
          {isLoadingStatuses ? 'Consultando presupuesto…' : expenseBlockReason ? 'Gasto no disponible para este destino' : 'Guardar cambios'}
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

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function LocationStatusSummary({ status, occurredAt }: { status: ExpenseLocationStatus; occurredAt: string }) {
  const periodLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${occurredAt.slice(0, 7)}-01T00:00:00Z`))
  const assigned = status.assigned_amount + status.rollover_amount
  const budgetLabel = assigned > 0 ? formatCOP(assigned) : status.transfer_in > 0 ? `Financiado por transferencias (${formatCOP(status.transfer_in)})` : formatCOP(assigned)
  return (
    <dl className="grid gap-1 rounded-sm border border-black/10 bg-white px-3 py-2 text-xs sm:grid-cols-2">
      <div><dt className="inline text-ledger-muted">Ubicación: </dt><dd className="inline font-medium text-ledger-text">{status.location_name}</dd></div>
      <div><dt className="inline text-ledger-muted">Categoría asignada: </dt><dd className="inline font-medium text-ledger-text">{status.category_name ?? 'Sin asignar'}</dd></div>
      <div><dt className="inline text-ledger-muted">Presupuesto {periodLabel}: </dt><dd className="inline font-medium text-ledger-text">{budgetLabel}</dd></div>
      {status.transfer_in > 0 && <div><dt className="inline text-ledger-muted">Transferencias recibidas: </dt><dd className="inline font-medium text-ledger-text">{formatCOP(status.transfer_in)}</dd></div>}
      <div><dt className="inline text-ledger-muted">Gastado: </dt><dd className="inline font-medium text-ledger-text">{formatCOP(status.spent)}</dd></div>
      <div><dt className="inline text-ledger-muted">Disponible antes de rendimientos: </dt><dd className={`inline font-medium ${status.available_amount < 0 ? 'text-red-700' : 'text-ledger-green'}`}>{formatCOP(status.available_amount)}</dd></div>
    </dl>
  )
}
