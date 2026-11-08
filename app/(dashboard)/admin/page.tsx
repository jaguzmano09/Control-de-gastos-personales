import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ProductEventMetric = {
  event_name: string
  event_count: number
  unique_users: number
}

const EVENT_LABELS: Record<string, string> = {
  account_created: 'Cuentas creadas',
  first_transaction_confirmed: 'Primeros movimientos confirmados',
  onboarding_completed: 'Onboarding completado',
  ocr_started: 'Procesos OCR iniciados',
  ocr_completed: 'Procesos OCR completados',
  ocr_failed: 'Procesos OCR con fallo',
  gmail_connection_started: 'Conexiones de correo iniciadas',
  gmail_connection_completed: 'Conexiones de correo completadas',
  gmail_connection_failed: 'Conexiones de correo con fallo',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') notFound()

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data: metrics, error } = await supabase.rpc('admin_product_event_metrics', {
    p_since: since.toISOString(),
  })
  const eventMetrics = (metrics ?? []) as ProductEventMetric[]

  return (
    <div className="max-w-6xl space-y-7">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-ledger-green/15 bg-gradient-to-br from-[#163c2a] via-ledger-green to-[#4a9568] px-5 py-7 text-white shadow-[0_18px_42px_rgba(20,37,29,0.12)] sm:px-8 sm:py-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Administración</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Salud y adopción del producto</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Indicadores agregados de los últimos 30 días. Este panel no expone movimientos ni datos financieros individuales.</p>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">No fue posible cargar las métricas agregadas. Intenta nuevamente.</section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Eventos registrados" value={String(eventMetrics.reduce((total, metric) => total + Number(metric.event_count), 0))} detail="Actividad de producto, sin datos financieros." />
            <MetricCard label="Personas alcanzadas" value={String(Math.max(0, ...eventMetrics.map((metric) => Number(metric.unique_users))))} detail="Máximo de usuarios únicos por evento." />
            <MetricCard label="Estado de datos" value="Agregado" detail="Solo se muestran conteos y usuarios únicos." />
          </section>

          <section className="overflow-hidden rounded-2xl border border-ledger-line bg-white shadow-[0_10px_28px_rgba(20,37,29,0.055)]">
            <div className="border-b border-ledger-line/70 px-5 py-4"><p className="section-label">Actividad del producto</p><h2 className="mt-1 font-serif text-2xl text-ledger-text">Eventos de los últimos 30 días</h2></div>
            {eventMetrics.length > 0 ? <div className="divide-y divide-ledger-line/70">{eventMetrics.map((metric) => <div key={metric.event_name} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8"><p className="font-medium text-ledger-text">{EVENT_LABELS[metric.event_name] ?? metric.event_name}</p><p className="text-sm text-ledger-muted"><span className="font-semibold text-ledger-text">{Number(metric.event_count)}</span> eventos</p><p className="text-sm text-ledger-muted"><span className="font-semibold text-ledger-text">{Number(metric.unique_users)}</span> personas</p></div>)}</div> : <div className="px-5 py-10 text-center"><p className="font-medium text-ledger-text">Aún no hay eventos registrados.</p><p className="mt-2 text-sm text-ledger-muted">Los indicadores aparecerán a medida que activemos el onboarding y la instrumentación de funciones beta.</p></div>}
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="surface-card p-5"><p className="section-label">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-ledger-text">{value}</p><p className="mt-2 text-sm leading-5 text-ledger-muted">{detail}</p></article>
}
