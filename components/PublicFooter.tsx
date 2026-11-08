export function PublicFooter() {
  return (
    <footer className="border-t border-ledger-line/80 bg-white/70">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-[1fr_auto] sm:px-6 lg:px-8">
        <div>
          <p className="font-serif text-lg text-ledger-text">Control de gastos</p>
          <p className="mt-2 max-w-md leading-6 text-ledger-muted">Una herramienta personal para registrar, entender y organizar tu dinero con claridad.</p>
          <p className="mt-3 text-xs text-ledger-muted">Producto en evolución. Algunas integraciones están disponibles como funciones beta.</p>
        </div>
        <nav aria-label="Información legal y soporte" className="flex flex-wrap content-start gap-x-5 gap-y-3 text-ledger-muted sm:justify-end">
          <a href="/terminos" className="rounded-md transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Términos</a>
          <a href="/privacidad" className="rounded-md transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Privacidad</a>
          <a href="/seguridad" className="rounded-md transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Seguridad</a>
          <a href="/soporte" className="rounded-md transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Soporte</a>
        </nav>
      </div>
    </footer>
  )
}
