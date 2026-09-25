'use client'

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
    <header className="relative w-full border-b border-black/10 bg-ledger-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-serif text-lg text-ledger-text">Control de gastos</span>

        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="rounded-sm border border-black/10 p-2 text-ledger-text"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h12M3 9h12M3 13h12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-ledger-ink/30" onClick={() => setOpen(false)}>
          <nav
            className="absolute left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-ledger-paper p-6 shadow-lg"
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
                  className="rounded-sm px-2 py-2 text-sm text-ledger-text hover:bg-black/5"
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