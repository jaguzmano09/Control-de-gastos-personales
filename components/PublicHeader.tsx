import { Logo } from '@/components/Logo'

export function PublicHeader() {
  return (
    <header className="border-b border-ledger-line/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="/login" className="inline-flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-ledger-green/20">
          <Logo className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight text-ledger-text">PlaENC</span>
        </a>
        <nav aria-label="Navegación pública" className="hidden items-center gap-5 text-sm text-ledger-muted sm:flex">
          <a href="/login#como-funciona" className="rounded-lg px-2 py-2 transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Cómo funciona</a>
          <a href="/privacidad" className="rounded-lg px-2 py-2 transition hover:text-ledger-green focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Privacidad</a>
          <a href="/login#acceso" className="btn btn-secondary btn-sm">Acceder</a>
        </nav>
        <a href="/login#acceso" className="btn btn-secondary btn-sm sm:hidden">Acceder</a>
      </div>
    </header>
  )
}
