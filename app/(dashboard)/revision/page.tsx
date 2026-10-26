import { createClient } from '@/lib/supabase/server'
import { ReviewCard } from './ReviewCard'
import { resolveDuplicate } from '@/lib/actions/review'
import { RolloverReviewCard } from './RolloverReviewCard'
import { currentYearMonth, yearMonthToDate } from '@/lib/date-utils'

// Debe coincidir exactamente con el tipo Transaction que espera ReviewCard
interface PendingTransaction {
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

interface DuplicateTransaction {
  id: string
  occurred_at: string
  description: string | null
  amount: number
  external_reference: string | null
}

interface DuplicateMatch {
  id: string
  occurred_at: string
  description: string | null
  amount: number
}

interface Category {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
  has_wallets: boolean
}

interface Wallet {
  id: string
  name: string
  account_id: string
}

export default async function RevisionPage() {
  const supabase = await createClient()
  const currentMonth = yearMonthToDate(currentYearMonth())

  const [
    { data: rawPendientes },
    { data: rawDuplicados },
    { data: rawCategories },
    { data: rawAccounts },
    { data: rawWallets },
    { data: rawRollovers },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, occurred_at, description, amount, type, category_id, account_id, wallet_id, ai_confidence, source'
      )
      .eq('status', 'pendiente_revision')
      .order('ai_confidence', { ascending: true, nullsFirst: false }),

    supabase
      .from('transactions')
      .select('id, occurred_at, description, amount, external_reference')
      .eq('status', 'duplicado'),

    supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('accounts')
      .select('id, name, has_wallets')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('wallets')
      .select('id, name, account_id')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('budget_rollover_reviews')
      .select('id, amount, target_period_month, category_id, status, account_id, wallet_id')
      .eq('target_period_month', currentMonth)
      .order('target_period_month', { ascending: false }),
  ])

  // Convertimos los resultados de Supabase a los tipos que utilizan los componentes.
  const pendientes = (rawPendientes ?? []) as unknown as PendingTransaction[]
  const duplicados = (rawDuplicados ?? []) as unknown as DuplicateTransaction[]
  const categories = (rawCategories ?? []) as unknown as Category[]
  const accounts = (rawAccounts ?? []) as unknown as Account[]
  const wallets = (rawWallets ?? []) as unknown as Wallet[]
  const rollovers = (rawRollovers ?? []) as Array<{
    id: string
    amount: number
    target_period_month: string
    category_id: string | null
    status: string
    account_id: string | null
    wallet_id: string | null
  }>
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
  const walletNames = new Map(wallets.map((wallet) => [wallet.id, wallet.name]))
  const pendingRollovers = rollovers.filter((rollover) => rollover.status === 'pending')
  const assignedRollovers = rollovers.filter((rollover) => rollover.status === 'assigned')

  const duplicadosConMatch = await Promise.all(
    duplicados.map(async (dup) => {
      if (!dup.external_reference) {
        return {
          ...dup,
          match: null as DuplicateMatch | null,
        }
      }

      const { data: rawMatch } = await supabase
        .from('transactions')
        .select('id, occurred_at, description, amount')
        .eq('external_reference', dup.external_reference)
        .neq('id', dup.id)
        .eq('status', 'confirmada')
        .maybeSingle()

      const match = rawMatch as unknown as DuplicateMatch | null

      return {
        ...dup,
        match,
      }
    })
  )

  return (
    <div className="space-y-6">
      <header className="border-b border-black/10 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ledger-muted">Centro de control</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-ledger-text">Bandeja de revisión</h1>
            <p className="mt-1 max-w-xl text-sm text-ledger-muted">Revisa y confirma los movimientos que necesitan tu decisión.</p>
          </div>
          <span className="rounded-full bg-ledger-green/10 px-3 py-1 text-sm font-medium text-ledger-green">
            {pendientes.length + pendingRollovers.length + duplicadosConMatch.length} por atender
          </span>
        </div>
      </header>

      <details open={pendientes.length > 0} className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ledger-green">Centro de actividad</p>
            <h2 className="mt-1 font-serif text-xl text-ledger-text">Movimientos</h2>
            <p className="mt-1 text-sm text-ledger-muted">Revisa los movimientos que necesitan tu decisión.</p>
          </div>
          <span className="rounded-full bg-ledger-green/10 px-3 py-1 text-sm font-medium text-ledger-green">
            {pendientes.length} pendientes
          </span>
        </summary>
        <div className="border-t border-black/10 bg-white/40 p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-ledger-text">Movimientos pendientes</h3>
                <p className="mt-1 text-xs text-ledger-muted">Confirma los datos antes de incorporarlos.</p>
              </div>
              <span className="rounded-full bg-ledger-green/10 px-2.5 py-1 text-xs font-medium text-ledger-green">{pendientes.length}</span>
            </div>
            <div className="space-y-3 bg-black/[0.015] p-3">
              {pendientes.map((t) => (
                <ReviewCard
                  key={t.id}
                  transaction={t}
                  categories={categories}
                  accounts={accounts}
                  wallets={wallets}
                />
              ))}

              {pendientes.length === 0 && (
                <p className="rounded-lg border border-dashed border-black/10 p-4 text-sm text-ledger-muted">
                  No hay transacciones pendientes de revisión.
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      <details className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Presupuesto arrastrado</p>
            <h2 className="mt-1 font-serif text-xl text-ledger-text">Sobrantes</h2>
            <p className="mt-1 text-sm text-ledger-muted">Gestiona los sobrantes pendientes y revisa los que ya fueron asignados.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            {pendingRollovers.length + assignedRollovers.length} registros
          </span>
        </summary>
        <div className="space-y-3 border-t border-black/10 bg-white/40 p-4 sm:p-5">
          <details open={pendingRollovers.length > 0} className="overflow-hidden rounded-2xl border border-amber-200/70 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold text-ledger-text">Por asignar</p>
                <p className="mt-1 text-xs text-ledger-muted">Asigna una categoría a cada sobrante del mes.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">{pendingRollovers.length}</span>
            </summary>
            <div className="space-y-3 border-t border-amber-200/60 bg-amber-50/30 p-3">
              {pendingRollovers.map((rollover) => (
                <RolloverReviewCard
                  key={rollover.id}
                  review={{
                    ...rollover,
                    account_name: accountNames.get(rollover.account_id ?? '') ?? 'Cuenta',
                    wallet_name: rollover.wallet_id ? walletNames.get(rollover.wallet_id) ?? null : null,
                  }}
                  categories={categories}
                />
              ))}
              {pendingRollovers.length === 0 && (
                <p className="rounded-lg border border-dashed border-amber-200 p-4 text-sm text-ledger-muted">No hay sobrantes pendientes de asignación.</p>
              )}
            </div>
          </details>

          <details className="overflow-hidden rounded-2xl border border-ledger-green/20 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold text-ledger-text">Asignados</p>
                <p className="mt-1 text-xs text-ledger-muted">Puedes actualizar estas asignaciones cuando lo necesites.</p>
              </div>
              <span className="rounded-full bg-ledger-green/10 px-2.5 py-1 text-xs font-medium text-ledger-green">{assignedRollovers.length}</span>
            </summary>
            <div className="space-y-3 border-t border-ledger-green/10 bg-ledger-green/[0.03] p-3">
              {assignedRollovers.map((rollover) => (
                <RolloverReviewCard
                  key={rollover.id}
                  review={{
                    ...rollover,
                    account_name: accountNames.get(rollover.account_id ?? '') ?? 'Cuenta',
                    wallet_name: rollover.wallet_id ? walletNames.get(rollover.wallet_id) ?? null : null,
                  }}
                  categories={categories}
                />
              ))}
              {assignedRollovers.length === 0 && (
                <p className="rounded-lg border border-dashed border-ledger-green/20 p-4 text-sm text-ledger-muted">No hay sobrantes asignados en el mes actual.</p>
              )}
            </div>
          </details>
        </div>
      </details>

      <details className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Control de calidad</p>
            <h2 className="mt-1 font-serif text-xl text-ledger-text">Duplicados</h2>
            <p className="mt-1 text-sm text-ledger-muted">Compara y decide si cada movimiento debe conservarse.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">{duplicadosConMatch.length} por verificar</span>
        </summary>
        <div className="space-y-3 border-t border-black/10 bg-white/40 p-4 sm:p-5">
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/30 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <h3 className="text-sm font-semibold text-ledger-text">Movimientos por verificar</h3>
                <p className="mt-1 text-xs text-ledger-muted">Revisa la coincidencia antes de confirmar o descartar.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">{duplicadosConMatch.length}</span>
            </div>
          {duplicadosConMatch.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"
            >
              <p className="text-sm text-ledger-text">
                {new Date(
                  t.occurred_at + 'T00:00:00'
                ).toLocaleDateString('es-CO')}{' '}
                · {t.description ?? '—'} ·{' '}
                {Number(t.amount).toLocaleString('es-CO')}
              </p>

              {t.match && (
                <p className="mt-1 text-xs text-ledger-muted">
                  Coincide con:{' '}
                  {new Date(
                    t.match.occurred_at + 'T00:00:00'
                  ).toLocaleDateString('es-CO')}{' '}
                  · {t.match.description ?? '—'} ·{' '}
                  {Number(t.match.amount).toLocaleString('es-CO')}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <form action={resolveDuplicate}>
                  <input type="hidden" name="id" value={t.id} />

                  <input
                    type="hidden"
                    name="matched_transaction_id"
                    value={t.match?.id ?? ''}
                  />

                  <input
                    type="hidden"
                    name="was_duplicate"
                    value="true"
                  />

                  <button
                    type="submit"
                    className="btn btn-danger btn-sm"
                  >
                    Sí, es duplicado
                  </button>
                </form>

                <form action={resolveDuplicate}>
                  <input type="hidden" name="id" value={t.id} />

                  <input
                    type="hidden"
                    name="matched_transaction_id"
                    value={t.match?.id ?? ''}
                  />

                  <input
                    type="hidden"
                    name="was_duplicate"
                    value="false"
                  />

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    No, es válida
                  </button>
                </form>
              </div>
            </div>
          ))}

          {duplicadosConMatch.length === 0 && (
            <p className="rounded-lg border border-dashed border-black/10 p-4 text-sm text-ledger-muted">
              No hay duplicados por revisar.
            </p>
          )}
          </div>
        </div>
      </details>
    </div>
  )
}
