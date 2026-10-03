'use client'
import { Logo } from '@/components/Logo'
import { useState } from 'react'
import { signOut } from '@/lib/actions/auth'

const NAV_ITEMS = [
  { href: '/', label: 'Resumen' },
  { href: '/transacciones', label: 'Transacciones' },
  { href: '/revision', label: 'Revisión' },
  { href: '/presupuestos/categorias', label: 'Presupuesto por categoría' },
  { href: '/presupuestos/bolsillos', label: 'Presupuesto por bolsillo' },
  { href: '/cuentas', label: 'Cuentas' },
  { href: '/reglas', label: 'Reglas' },
  { href: '/correo', label: 'Correo' },
]

export function SidebarMenu({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative w-full border-b border-black/10 bg-ledger-paper/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="rounded-xl border border-black/10 bg-white/70 p-2.5 text-ledger-text shadow-sm transition hover:border-ledger-green/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-ledger-green/30"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h12M3 9h12M3 13h12" strokeLinecap="round" />
          </svg>
        </button>
        <span className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="whitespace-nowrap font-serif text-lg font-semibold text-ledger-text sm:text-xl">
            Control de gastos
          </span>
        </span>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/35" onClick={() => setOpen(false)}>
          <nav
            className="fixed inset-y-0 left-0 z-[61] flex h-screen min-h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-black/10 bg-ledger-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg text-ledger-text">Menú</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="text-ledger-muted">
                ✕
              </button>
            </div>
            <div className="mt-2 h-px w-8 bg-ledger-green" />

            <div className="mt-6 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm text-ledger-text transition hover:bg-ledger-green/10 hover:text-ledger-green"
                >
                  {item.label}
                </a>
              ))}
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