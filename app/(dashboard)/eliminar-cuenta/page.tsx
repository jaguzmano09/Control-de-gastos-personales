import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Eliminar cuenta', robots: { index: false, follow: false } }

export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login')

  const { data: job } = await supabase.from('account_deletion_jobs').select('status').eq('user_id', user.id).maybeSingle()
  const params = await searchParams
  const deletionError = params.error === 'No se pudo revocar el acceso de Gmail'
    ? 'No se pudo confirmar la revocación del acceso de Gmail. Antes de reintentar, revisa las conexiones de aplicaciones en tu cuenta de Google y revoca PlaENC si todavía aparece.'
    : params.error
      ? 'No se pudo completar el paso anterior. Revisa el estado de tu cuenta e inténtalo nuevamente.'
      : null
  return <div className="mx-auto max-w-3xl">
    <header className="border-b border-black/10 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Acción irreversible</p>
      <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Eliminar cuenta y datos</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ledger-muted">Se eliminarán tus movimientos, cuentas, bolsillos, categorías, presupuestos, configuraciones, solicitudes de soporte y datos de uso. También revocaremos la conexión de Gmail antes de borrar su credencial guardada.</p>
    </header>
    <section className="panel mt-7 p-6 sm:p-8">
      <h2 className="font-serif text-2xl text-ledger-text">Antes de continuar</h2>
      {deletionError && <p role="alert" className="feedback feedback-warning mt-4">{deletionError}</p>}
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-ledger-muted">
        <li>Descarga primero una copia desde Configuración si deseas conservar tus datos.</li>
        <li>La eliminación no se puede deshacer y cerrará tu sesión de PlaENC.</li>
        <li>Los proveedores pueden conservar copias de seguridad durante un ciclo de retención separado; sus plazos y eliminación verificable aún no están confirmados.</li>
      </ul>
      <DeleteAccountForm email={user.email} deletionPending={job?.status === 'data_removed'} />
    </section>
  </div>
}
