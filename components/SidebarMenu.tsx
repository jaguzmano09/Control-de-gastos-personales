'use client'
import { Logo } from '@/components/Logo'
import { useState } from 'react'
import { signOut } from '@/lib/actions/auth'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Resumen' },
  { href: '/transacciones', label: 'Transacciones' },
  { href: '/mercado', label: 'Lista de mercado' },
  { href: '/revision', label: 'Revisión' },
  { href: '/presupuestos/categorias', label: 'Presupuesto por categoría' },
  { href: '/cuentas', label: 'Cuentas y bolsillos' },
  { href: '/reglas', label: 'Reglas' },
  { href: '/correo', label: 'Correo' },
]

export function SidebarMenu({ userEmail, isAdmin = false }: { userEmail?: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navItems = isAdmin ? [...NAV_ITEMS, { href: '/admin', label: 'Administración' }] : NAV_ITEMS

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.07] bg-white/85 shadow-[0_4px_20px_rgba(20,37,29,0.06)] backdrop-blur-xl">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-ledger-green">
        Saltar al contenido
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/[0.08] bg-white p-2.5 text-ledger-text shadow-sm transition hover:border-ledger-green/40 hover:bg-ledger-green/5 focus:outline-none focus:ring-2 focus:ring-ledger-green/30"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h12M3 9h12M3 13h12" strokeLinecap="round" />
          </svg>
        </button>
        <span className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <Logo className="h-10 w-10 shrink-0 drop-shadow-sm" />
          <span className="whitespace-nowrap font-serif text-lg font-semibold tracking-tight text-ledger-text sm:text-xl">
            PlaENC
          </span>
        </span>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="h-2 w-2 rounded-full bg-ledger-green shadow-[0_0_0_4px_rgba(47,111,78,0.12)]" aria-hidden="true" />
          <span className="text-xs font-semibold text-ledger-muted">Espacio personal</span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/35" onClick={() => setOpen(false)}>
          <nav
          className="fixed inset-y-0 left-0 z-[61] flex h-screen min-h-full w-80 max-w-[88vw] flex-col overflow-y-auto border-r border-black/[0.08] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg text-ledger-text">Menú</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl text-ledger-muted transition hover:bg-black/5 hover:text-ledger-text focus:outline-none focus:ring-2 focus:ring-ledger-green/30">
                ×
              </button>
            </div>
            <div className="mt-2 h-1 w-10 rounded-full bg-ledger-green" />

            <div className="mt-7 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'border-ledger-green/15 bg-ledger-green/10 text-ledger-green'
                      : 'border-transparent text-ledger-text hover:border-ledger-green/15 hover:bg-ledger-green/10 hover:text-ledger-green'
                  }`}
                >
                  {item.label}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-ledger-green" aria-hidden="true" />}
                </a>
                )
              })}
            </div>

            <div className="mt-auto border-t border-black/10 pt-4">
              <p className="truncate text-xs text-ledger-muted">{userEmail}</p>
              <form action={signOut}>
                <button className="btn-link mt-2 px-0 text-ledger-green hover:bg-transparent hover:underline">
                  Salir
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
