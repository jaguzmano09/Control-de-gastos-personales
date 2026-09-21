import { createClient } from '@/lib/supabase/server'
import { ReviewCard } from './ReviewCard'
import { resolveDuplicate } from '@/lib/actions/review'

export default async function RevisionPage() {
  const supabase = await createClient()

  const [{ data: pendientes }, { data: duplicados }, { data: categories }, { data: accounts }, { data: wallets }] =
    await Promise.all([
      supabase
        .from('transactions')
        .select('id, occurred_at, description, amount, type, category_id, account_id, wallet_id, ai_confidence, source')
        .eq('status', 'pendiente_revision')
        .order('ai_confidence', { ascending: true, nullsFirst: false }),
      supabase
        .from('transactions')
        .select('id, occurred_at, description, amount, external_reference')
        .eq('status', 'duplicado'),
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
      supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
      supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
    ])

  const duplicadosConMatch = await Promise.all(
    (duplicados ?? []).map(async (dup) => {
      if (!dup.external_reference) return { ...dup, match: null }
      const { data: match } = await supabase
        .from('transactions')
        .select('id, occurred_at, description, amount')
        .eq('external_reference', dup.external_reference)
        .neq('id', dup.id)
        .eq('status', 'confirmada')
        .maybeSingle()
      return { ...dup, match }
    })
  )

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-2xl text-ledger-text">Bandeja de revisión</h1>
        <div className="mt-2 h-px w-10 bg-ledger-green" />
      </header>

      <section>
        <h2 className="font-serif text-lg text-ledger-text">Pendientes ({(pendientes ?? []).length})</h2>
        <div className="mt-4 space-y-4">
          {(pendientes ?? []).map((t) => (
            <ReviewCard key={t.id} transaction={t} categories={categories ?? []} accounts={accounts ?? []} wallets={wallets ?? []} />
          ))}
          {(pendientes ?? []).length === 0 && <p className="text-sm text-ledger-muted">No hay transacciones pendientes de revisión.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg text-ledger-text">Posibles duplicados ({duplicadosConMatch.length})</h2>
        <div className="mt-4 space-y-4">
          {duplicadosConMatch.map((t) => (
            <div key={t.id} className="rounded-sm border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-ledger-text">
                {new Date(t.occurred_at + 'T00:00:00').toLocaleDateString('es-CO')} · {t.description ?? '—'} · {Number(t.amount).toLocaleString('es-CO')}
              </p>
              {t.match && (
                <p className="mt-1 text-xs text-ledger-muted">
                  Coincide con: {new Date(t.match.occurred_at + 'T00:00:00').toLocaleDateString('es-CO')} · {t.match.description ?? '—'} · {Number(t.match.amount).toLocaleString('es-CO')}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <form action={resolveDuplicate}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="matched_transaction_id" value={t.match?.id ?? ''} />
                  <input type="hidden" name="was_duplicate" value="true" />
                  <button type="submit" className="btn btn-danger btn-sm">
                    Sí, es duplicado
                  </button>
                </form>
                <form action={resolveDuplicate}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="matched_transaction_id" value={t.match?.id ?? ''} />
                  <input type="hidden" name="was_duplicate" value="false" />
                  <button type="submit" className="btn btn-primary btn-sm">
                    No, es válida
                  </button>
                </form>
              </div>
            </div>
          ))}
          {duplicadosConMatch.length === 0 && <p className="text-sm text-ledger-muted">No hay duplicados por revisar.</p>}
        </div>
      </section>
    </div>
  )
}
