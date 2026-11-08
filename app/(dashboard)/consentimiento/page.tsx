import { acceptCurrentDocuments } from '@/lib/actions/consent'

export default async function ConsentimientoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <section className="overflow-hidden rounded-[1.75rem] border border-ledger-line bg-white shadow-[0_20px_50px_rgba(20,37,29,0.10)]">
        <div className="bg-gradient-to-br from-[#163c2a] via-ledger-green to-[#4a9568] px-6 py-8 text-white sm:px-9 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Actualización de documentos</p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Antes de continuar, revisa estos cambios.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Queremos que sepas cómo funciona la plataforma y cómo se trata la información antes de volver a tu espacio financiero.</p>
        </div>
        <div className="p-6 sm:p-9">
          <div className="space-y-3">
            <a href="/terminos" target="_blank" className="group flex items-center justify-between gap-4 rounded-xl border border-ledger-line bg-ledger-paper/50 p-4 transition hover:border-ledger-green/35 hover:bg-ledger-green/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-ledger-green/15">
              <span><span className="block font-semibold text-ledger-text">Términos de uso</span><span className="mt-1 block text-sm text-ledger-muted">Uso responsable, funciones beta y cambios del producto.</span></span><span aria-hidden="true" className="text-ledger-green transition group-hover:translate-x-0.5">↗</span>
            </a>
            <a href="/privacidad" target="_blank" className="group flex items-center justify-between gap-4 rounded-xl border border-ledger-line bg-ledger-paper/50 p-4 transition hover:border-ledger-green/35 hover:bg-ledger-green/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-ledger-green/15">
              <span><span className="block font-semibold text-ledger-text">Política de privacidad</span><span className="mt-1 block text-sm text-ledger-muted">Información que administras, integraciones y controles disponibles.</span></span><span aria-hidden="true" className="text-ledger-green transition group-hover:translate-x-0.5">↗</span>
            </a>
          </div>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(error)}</p>}
          <form action={acceptCurrentDocuments} className="mt-7">
            <button className="btn btn-primary min-h-12 w-full" type="submit">He leído y acepto los documentos vigentes</button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-ledger-muted">La aceptación queda asociada a la versión vigente de cada documento. Si cambian de forma relevante, te pediremos revisarlos de nuevo.</p>
        </div>
      </section>
    </div>
  )
}
