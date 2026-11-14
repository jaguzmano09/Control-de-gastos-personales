import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Organiza tu plata en contexto',
  description: 'Registra tus movimientos y entiende dónde está tu plata y para qué la separaste.',
}

const steps = [
  { title: 'Ubica tu plata', detail: 'Agrega tus cuentas y, cuando existan, sus bolsillos.' },
  { title: 'Registra lo que pasó', detail: 'Cada movimiento queda asociado a un lugar y a su categoría.' },
  { title: 'Consulta con contexto', detail: 'Revisa el disponible y encuentra tus movimientos por mes.' },
]

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-ledger-line bg-[#F4F7F3]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_.9fr] lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ledger-green/20 bg-white px-3 py-1.5 text-sm font-medium text-ledger-green">
              <span className="size-2 rounded-full bg-ledger-green" aria-hidden="true" />
              Tu plata, en su lugar
            </p>
            <h1 className="max-w-2xl font-serif text-5xl leading-[1.02] tracking-tight text-ledger-text sm:text-6xl lg:text-[4.4rem]">
              Cada movimiento tiene un lugar. Ahora también tiene contexto.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ledger-muted">
              Registra ingresos, gastos y transferencias. Organiza tu dinero entre cuentas, bolsillos y categorías para entender qué pasó y dónde quedó.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/login" className="btn btn-primary">Empezar a organizarme</a>
              <a href="#como-funciona" className="btn btn-secondary">Ver cómo funciona</a>
            </div>
            <p className="mt-5 text-sm leading-6 text-ledger-muted">Para tus finanzas personales en Colombia. Montos en pesos colombianos.</p>
          </div>

          <div aria-label="Ejemplo ilustrativo de cómo se relacionan una cuenta, un bolsillo y su categoría" className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] border border-ledger-green/10" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-ledger-line bg-white p-5 shadow-[0_24px_65px_rgba(20,37,29,0.12)] sm:p-7">
              <div className="flex items-center justify-between border-b border-ledger-line pb-5">
                <div><p className="text-sm font-semibold text-ledger-text">Un ejemplo de tu mes</p><p className="mt-1 text-xs text-ledger-muted">Datos ilustrativos · COP</p></div>
                <span className="rounded-full bg-ledger-green/10 px-3 py-1 text-xs font-semibold text-ledger-green">Noviembre</span>
              </div>
              <div className="mt-6 rounded-2xl bg-ledger-paper p-4 sm:p-5">
                <p className="text-xs font-medium text-ledger-muted">Cuenta</p>
                <p className="mt-1 text-lg font-semibold text-ledger-text">Mi cuenta principal</p>
                <div className="my-4 h-px bg-ledger-line" />
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-medium text-ledger-muted">Bolsillo</p><p className="mt-1 font-semibold text-ledger-text">Viaje</p></div>
                  <span aria-hidden="true" className="mt-2 text-ledger-green">→</span>
                  <div className="text-right"><p className="text-xs font-medium text-ledger-muted">Categoría</p><p className="mt-1 font-semibold text-ledger-text">Viajes</p></div>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div><p className="text-sm text-ledger-muted">Disponible en este bolsillo</p><p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ledger-text">$ 320.000</p></div>
                <span className="rounded-xl bg-ledger-green px-3 py-2 text-xs font-medium text-white">En contexto</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-12 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl"><h2 className="font-serif text-4xl tracking-tight text-ledger-text">De un movimiento a una idea clara.</h2><p className="mt-4 text-lg leading-7 text-ledger-muted">Empieza con lo que ya haces cada día. PlaENC conecta el registro con el lugar donde tienes tu dinero.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => <article key={step.title} className="border-t-2 border-ledger-green pt-5"><p className="text-sm font-semibold tabular-nums text-ledger-green">{String(index + 1).padStart(2, '0')}</p><h3 className="mt-4 text-xl font-semibold text-ledger-text">{step.title}</h3><p className="mt-3 leading-7 text-ledger-muted">{step.detail}</p></article>)}
        </div>
      </section>

      <section className="border-t border-ledger-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><h2 className="font-serif text-3xl text-ledger-text">Tus registros merecen cuidado.</h2><p className="mt-3 max-w-2xl leading-7 text-ledger-muted">Los movimientos capturados por correo o foto requieren tu revisión antes de afectar los cálculos. Estas integraciones se habilitan progresivamente.</p></div>
          <a href="/privacidad" className="btn btn-secondary shrink-0">Conoce cómo tratamos tus datos</a>
        </div>
      </section>
    </>
  )
}
