'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createManualTransaction, refreshExpenseLocationStatuses } from '@/lib/actions/transactions'
import type { ExpenseLocationStatus } from '@/lib/data/expense-location-status'

const TYPES = ['Gasto', 'Ingreso', 'Transferencia', 'Inversion'] as const

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

type Category = { id: string; name: string }
type Account = { id: string; name: string; category_id: string | null; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string; category_id: string | null }

export function NuevaTransaccionForm({
  categories,
  accounts,
  wallets,
  error,
  initialValues,
  initialPeriodMonth,
  locationStatuses: initialLocationStatuses,
  purchaseDraftId,
}: {
  categories: Category[]
  accounts: Account[]
  wallets: Wallet[]
  error?: string
  initialValues?: { occurredAt?: string; description?: string; amount?: string }
  initialPeriodMonth: string
  locationStatuses: ExpenseLocationStatus[]
  purchaseDraftId?: string
}) {
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [submissionId] = useState(() => crypto.randomUUID())

  const [occurredAt, setOccurredAt] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return initialValues?.occurredAt || `${year}-${month}-${day}`
  })
  const [type, setType] = useState<typeof TYPES[number]>('Gasto')
  const [savingsOperation, setSavingsOperation] = useState<'ingreso' | 'retiro'>('ingreso')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [walletId, setWalletId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '')
  const [destinationWalletId, setDestinationWalletId] = useState('')
  const [destinationCategoryChoice, setDestinationCategoryChoice] = useState('')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [amount, setAmount] = useState(initialValues?.amount ?? '')
  const [isNecessary, setIsNecessary] = useState('')
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

  const categoryName = categories.find((c) => c.id === categoryId)?.name
  const walletName = wallets.find((w) => w.id === walletId)?.name
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId)
  const destinationWallets = useMemo(() => wallets.filter((w) => w.account_id === destinationAccountId), [wallets, destinationAccountId])
  const destinationName = destinationAccount?.name
  const destinationWalletName = wallets.find((w) => w.id === destinationWalletId)?.name
  const sourceWallet = wallets.find((wallet) => wallet.id === walletId && wallet.account_id === accountId)
  const destinationWallet = wallets.find((wallet) => wallet.id === destinationWalletId && wallet.account_id === destinationAccountId)
  const assignedSourceCategoryId = sourceWallet
    ? sourceWallet.category_id ?? ''
    : selectedAccount?.has_wallets ? '' : selectedAccount?.category_id ?? ''
  const assignedDestinationCategoryId = destinationWallet
    ? destinationWallet.category_id ?? ''
    : destinationAccount?.has_wallets ? '' : destinationAccount?.category_id ?? ''
  const selectedLocationStatus = sourceWallet
    ? statusByTarget.get(`wallet:${sourceWallet.id}`)
    : selectedAccount?.has_wallets ? undefined : statusByTarget.get(`account:${accountId}`)
  const sourceCategoryForSubmission = type === 'Gasto'
    ? assignedSourceCategoryId
    : type === 'Transferencia' || type === 'Ingreso' ? assignedSourceCategoryId || categoryId : categoryId
  const destinationCategoryForSubmission = assignedDestinationCategoryId || destinationCategoryChoice
  const expenseBlockReason = type !== 'Gasto' ? ''
    : !selectedAccount ? 'Selecciona una cuenta.'
      : selectedAccount.has_wallets && !walletId ? 'Elige un bolsillo de esta cuenta para consultar su categoría y presupuesto.'
        : isLoadingStatuses ? 'Consultando el presupuesto del periodo…'
          : statusLoadFailed ? 'No pudimos verificar el presupuesto. Inténtalo de nuevo antes de registrar el gasto.'
            : !selectedLocationStatus?.category_id ? `No se puede registrar el gasto: ${selectedLocationStatus?.location_name ?? (sourceWallet ? `${selectedAccount.name} / ${sourceWallet.name}` : selectedAccount.name)} no tiene una categoría ni un presupuesto categorizado para este mes. Registra primero un ingreso o una transferencia para asignarlos.`
              : !selectedLocationStatus.budget_assigned ? `No se puede registrar el gasto: ${selectedLocationStatus.location_name} tiene la categoría ${selectedLocationStatus.category_name ?? ''}, pero no tiene presupuesto asignado para este mes. Registra un ingreso o recibe una transferencia en este destino.`
                : ''
  const canContinueExpense = type !== 'Gasto' || (!expenseBlockReason && !isLoadingStatuses)

  function optionDetails(status?: ExpenseLocationStatus) {
    if (!status) return 'Sin categoría o presupuesto'
    const category = status.category_name ? `Categoría: ${status.category_name}` : 'Sin categoría'
    const budget = status.category_id && status.budget_assigned
      ? status.assigned_amount + status.rollover_amount > 0
        ? `Presupuesto: ${formatCOP(status.assigned_amount + status.rollover_amount)}`
        : `Financiado por transferencias: ${formatCOP(status.transfer_in)}`
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

  function handleContinue() {
    if (!occurredAt || !accountId || !amount || Number(amount) <= 0) return
    if (!canContinueExpense) return
    if ((type === 'Gasto' || type === 'Ingreso') && !sourceCategoryForSubmission) return
    if (type === 'Transferencia' && (!sourceCategoryForSubmission || !destinationCategoryForSubmission || !destinationAccountId)) return
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

          {(type as string) === 'Ahorro' && (
            <div>
              <label className="block text-sm text-ledger-text">Operación de ahorro</label>
              <select value={savingsOperation} onChange={(e) => setSavingsOperation(e.target.value as typeof savingsOperation)} required className={inputClass}>
                <option value="ingreso">Ingreso para el ahorro</option>
                <option value="retiro">Retiro o gasto del ahorro</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-ledger-text">Cuenta</label>
            <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setWalletId(''); setCategoryId('') }} required className={inputClass}>
              {accounts.map((account) => {
                const status = statusByTarget.get(`account:${account.id}`)
                return <option key={account.id} value={account.id}>{account.name}{account.has_wallets ? ' · Tiene bolsillos' : ` · ${optionDetails(status)}`}</option>
              })}
            </select>
          </div>

          {selectedAccount?.has_wallets && (
            <div>
              <label className="block text-sm text-ledger-text">Bolsillo</label>
              <select value={walletId} onChange={(e) => { setWalletId(e.target.value); setCategoryId('') }} required className={inputClass}>
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
              <select value={type === 'Transferencia' || type === 'Ingreso' ? assignedSourceCategoryId || categoryId : categoryId} onChange={(e) => setCategoryId(e.target.value)} required={type === 'Ingreso' || (type === 'Transferencia' && !assignedSourceCategoryId)} disabled={(type === 'Transferencia' || type === 'Ingreso') && !!assignedSourceCategoryId} className={inputClass}>
                <option value="">— Selecciona una categoría —</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            )}
          </div>

          {type === 'Ingreso' && !assignedSourceCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida se asignará a la cuenta o bolsillo al guardar este ingreso.</p>}
          {type === 'Transferencia' && !assignedSourceCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida quedará asignada al origen al confirmar.</p>}
          {type === 'Gasto' && selectedLocationStatus && <LocationStatusSummary status={selectedLocationStatus} occurredAt={occurredAt} />}
          {type === 'Gasto' && expenseBlockReason && <div role="alert" className="rounded-sm border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>{expenseBlockReason}</p>
            {statusLoadFailed && <button type="button" onClick={retryLocationStatuses} className="mt-2 font-medium underline underline-offset-2">Reintentar consulta</button>}
          </div>}

          {type === 'Transferencia' && <>
            <div>
              <label className="block text-sm text-ledger-text">Cuenta de destino</label>
              <select value={destinationAccountId} onChange={(e) => { setDestinationAccountId(e.target.value); setDestinationWalletId(''); setDestinationCategoryChoice('') }} required className={inputClass}>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.has_wallets ? ' · Tiene bolsillos' : ''}</option>)}
              </select>
            </div>
            {destinationAccount?.has_wallets && <div>
              <label className="block text-sm text-ledger-text">Bolsillo de destino</label>
              <select value={destinationWalletId} onChange={(e) => { setDestinationWalletId(e.target.value); setDestinationCategoryChoice('') }} required className={inputClass}>
                <option value="">— Elige uno —</option>
                {destinationWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
              </select>
            </div>}
            <div>
              <label className="block text-sm text-ledger-text">Categoría de destino</label>
              <select value={assignedDestinationCategoryId || destinationCategoryChoice} onChange={(e) => setDestinationCategoryChoice(e.target.value)} required={!assignedDestinationCategoryId} disabled={!!assignedDestinationCategoryId} className={inputClass}>
                <option value="">— Selecciona una categoría —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {!assignedDestinationCategoryId && <p className="text-xs text-ledger-muted">La categoría elegida quedará asignada al destino al confirmar.</p>}
          </>}

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

          <button type="button" onClick={handleContinue} disabled={!canContinueExpense} className="btn btn-primary btn-full disabled:cursor-not-allowed disabled:opacity-55">
            {isLoadingStatuses ? 'Consultando presupuesto…' : expenseBlockReason ? 'Gasto no disponible para este destino' : 'Continuar'}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-sm border border-black/10 bg-white p-4">
            <p className="text-sm font-medium text-ledger-text">Revisa antes de confirmar</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Fecha" value={new Date(occurredAt + 'T00:00:00').toLocaleDateString('es-CO')} />
              <Row label="Tipo" value={type} />
              {(type as string) === 'Ahorro' && <Row label="Operación" value={savingsOperation === 'ingreso' ? 'Ingreso para el ahorro' : 'Retiro o gasto del ahorro'} />}
              <Row label={type === 'Transferencia' ? 'Categoría de origen' : 'Categoría'} value={type === 'Gasto' ? selectedLocationStatus?.category_name ?? 'Sin asignar' : (type === 'Transferencia' || type === 'Ingreso') ? categories.find((category) => category.id === sourceCategoryForSubmission)?.name ?? 'Sin asignar' : categoryName ?? '—'} />
              <Row label="Cuenta" value={selectedAccount?.name ?? ''} />
              {walletName && <Row label="Bolsillo" value={walletName} />}
              {type === 'Transferencia' && <>
                <Row label="Destino" value={destinationName ?? ''} />
                {destinationWalletName && <Row label="Bolsillo de destino" value={destinationWalletName} />}
                <Row label="Categoría de destino" value={categories.find((category) => category.id === destinationCategoryForSubmission)?.name ?? 'Sin asignar'} />
              </>}
              <Row label="Descripción" value={description || '—'} />
              <Row label="Monto" value={Number(amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} />
              {isNecessary && <Row label="¿Necesario?" value={isNecessary === 'true' ? 'Sí' : 'No'} />}
            </dl>
          </div>

          {/* Campos ocultos: van los mismos valores que ya validó el paso anterior */}
          <input type="hidden" name="occurred_at" value={occurredAt} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="submission_id" value={submissionId} />
          {purchaseDraftId && <input type="hidden" name="purchase_draft_id" value={purchaseDraftId} />}
          <input type="hidden" name="savings_operation" value={(type as string) === 'Ahorro' ? savingsOperation : ''} />
          <input type="hidden" name="category_id" value={sourceCategoryForSubmission} />
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="wallet_id" value={walletId} />
          <input type="hidden" name="destination_account_id" value={type === 'Transferencia' ? destinationAccountId : ''} />
          <input type="hidden" name="destination_wallet_id" value={type === 'Transferencia' ? destinationWalletId : ''} />
          <input type="hidden" name="destination_category_id" value={type === 'Transferencia' ? destinationCategoryForSubmission : ''} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="is_necessary" value={isNecessary} />

          {error && <p role="alert" className="text-sm text-red-700">{decodeURIComponent(error)}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('form')} className="btn btn-secondary flex-1">
              Corregir
            </button>
            <ConfirmButton />
          </div>
        </>
      )}
    </form>
  )
}

function ConfirmButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? 'Guardando...' : 'Confirmar'}
    </button>
  )
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function LocationStatusSummary({ status, occurredAt }: { status: ExpenseLocationStatus; occurredAt: string }) {
  const periodLabel = occurredAt
    ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${occurredAt.slice(0, 7)}-01T00:00:00Z`))
    : 'este mes'
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ledger-muted">{label}</dt>
      <dd className="text-ledger-text">{value}</dd>
    </div>
  )
}
