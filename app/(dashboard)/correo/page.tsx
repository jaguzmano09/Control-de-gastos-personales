import { createClient } from '@/lib/supabase/server'
import { createEmailSource, toggleEmailSourceActive } from '@/lib/actions/email-sources'

const inputClass =
  'mt-1 w-full rounded-sm border border-black/10 bg-white px-2 py-1.5 text-sm text-ledger-text outline-none focus:border-ledger-green focus:ring-1 focus:ring-ledger-green'

export default async function CorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const supabase = await createClient()

  const [{ data: connection }, { data: sources }, { data: accounts }] = await Promise.all([
    supabase.from('gmail_connections').select('is_active, token_expires_at, gmail_history_id').maybeSingle(),
    supabase.from('email_sources').select('id, email_address, account_id, is_active, accounts(name)'),
    supabase.from('accounts').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-ledger-text">Correo</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />

      {connected && <p className="mt-4 text-sm text-ledger-green">Gmail conectado correctamente.</p>}
      {error && <p className="mt-4 text-sm text-red-700">{decodeURIComponent(error)}</p>}

      <section className="mt-8 rounded-sm border border-black/10 bg-white p-4">
        <p className="text-sm text-ledger-text">Conexión con Gmail</p>
        {connection ? (
          <p className="mt-1 text-xs text-ledger-muted">
            Estado: {connection.is_active ? 'activa' : 'inactiva'}
          </p>
        ) : (
          <p className="mt-1 text-xs text-ledger-muted">Aún no has conectado tu Gmail.</p>
        )}
        
          href="/api/gmail/connect"
          className="mt-3 inline-block rounded-sm bg-ledger-green px-4 py-2 text-sm font-medium text-white hover:bg-ledger-green/90"
        >
          {connection ? 'Reconectar Gmail' : 'Conectar Gmail'}
        </a>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg text-ledger-text">Direcciones autorizadas</h2>
        <div className="mt-4 space-y-2">
          {(sources ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-sm border border-black/10 bg-white p-3">
              <div>
                <p className="text-sm text-ledger-text">{s.email_address}</p>
                <p className="text-xs text-ledger-muted">{s.accounts?.name}</p>
              </div>
              <form action={toggleEmailSourceActive}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="is_active" value={(!s.is_active).toString()} />
                <button type="submit" className="text-xs text-ledger-muted hover:text-ledger-text hover:underline">
                  {s.is_active ? 'Desactivar' : 'Reactivar'}
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={createEmailSource} className="mt-4 flex items-end gap-3 rounded-sm border border-dashed border-black/20 p-4">
          <div className="flex-1">
            <label className="text-xs text-ledger-muted">Correo remitente</label>
            <input name="email_address" type="email" required placeholder="alertas@bancolombia.com.co" className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-ledger-muted">Cuenta</label>
            <select name="account_id" required className={inputClass}>
              {(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button type="submit" className="rounded-sm bg-ledger-green px-4 py-2 text-sm font-medium text-white hover:bg-ledger-green/90">
            Agregar
          </button>
        </form>
      </section>
    </div>
  )
}