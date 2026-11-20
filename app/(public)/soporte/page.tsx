import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SupportRequestForm } from '@/components/support/SupportRequestForm'

export const metadata = { title: 'Soporte privado', robots: { index: false, follow: false }, alternates: { canonical: '/soporte' } }

export default async function SoportePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: requests, error } = user
    ? await supabase.rpc('list_my_support_requests')
    : { data: null, error: null }

  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <h1 className="page-title">Soporte privado</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ledger-muted">Cuéntanos qué necesitas. Tu solicitud queda asociada a tu cuenta y solo tú y el equipo autorizado de PlaENC pueden verla.</p>
    <div className="panel mt-8 space-y-7 p-6 sm:p-8">
      {!user ? <section>
        <h2 className="font-serif text-xl text-ledger-text">Inicia sesión para continuar</h2>
        <p className="mt-2 text-sm leading-6 text-ledger-muted">El canal privado requiere una cuenta para proteger la solicitud y permitirte consultar la respuesta.</p>
        <Link className="btn btn-primary mt-4" href="/login?next=%2Fsoporte">Iniciar sesión</Link>
      </section> : <>
        <section>
          <h2 className="font-serif text-xl text-ledger-text">Enviar una solicitud</h2>
          <p className="mt-2 text-sm leading-6 text-ledger-muted">Puedes pedir ayuda, ejercer derechos sobre tus datos o reportar un problema de seguridad. No incluyas contraseñas, códigos, tokens ni números completos de cuentas o tarjetas. Para describir un error, evita incluir montos o movimientos reales.</p>
          <SupportRequestForm />
          <p className="mt-4 text-xs leading-5 text-ledger-muted">Al enviar, guardaremos el tipo, asunto y mensaje junto a tu identificador de cuenta para gestionar y responder la solicitud. Consulta la <Link className="underline" href="/privacidad">política de privacidad</Link>.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ledger-text">Tus solicitudes</h2>
          {error ? <p role="alert" className="mt-3 text-sm text-red-700">No pudimos cargar tus solicitudes. Intenta nuevamente más tarde.</p> : requests?.length ? <ul className="mt-4 divide-y divide-ledger-line">{requests.map((request) => <li key={request.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium text-ledger-text">{request.subject}</h3><span className="rounded-full bg-ledger-green/10 px-2.5 py-1 text-xs font-medium text-ledger-green">{statusLabel(request.status)}</span></div>
            <p className="mt-1 text-xs text-ledger-muted">{typeLabel(request.request_type)} · {new Date(request.created_at).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ledger-muted">{request.message}</p>
            {request.admin_response && <div className="mt-3 rounded-xl bg-ledger-paper p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ledger-green">Respuesta de PlaENC</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ledger-text">{request.admin_response}</p></div>}
          </li>)}</ul> : <p className="mt-2 text-sm text-ledger-muted">Aún no has enviado solicitudes.</p>}
        </section>
      </>}
      <section><h2 className="font-serif text-lg text-ledger-text">Ideas generales</h2><p className="mt-2 text-sm leading-6 text-ledger-muted">Para sugerencias que no incluyan información privada puedes usar <a className="font-medium text-ledger-green underline" href="https://github.com/jaguzmano09/Control-de-gastos-personales/issues" target="_blank" rel="noreferrer">GitHub Issues</a>, un espacio público. No reportes allí vulnerabilidades ni compartas datos personales.</p></section>
    </div>
  </article>
}

function statusLabel(status: string) { return ({ open: 'Recibida', in_progress: 'En gestión', resolved: 'Respondida' } as Record<string, string>)[status] ?? 'Recibida' }
function typeLabel(type: string) { return ({ support: 'Soporte', privacy: 'Privacidad', security: 'Seguridad' } as Record<string, string>)[type] ?? 'Soporte' }
